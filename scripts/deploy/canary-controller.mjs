#!/usr/bin/env node
// Canary rollout controller (#156).
//
// Traffic splitting is Vercel's native Rolling Releases feature. This script
// supplies the automated judgement Vercel leaves to a human: each poll it
// probes the canary, pulls real-user health signals, asks canary-policy.mjs
// what to do, and approves the next stage, completes the release, or rolls
// production back to the previous deployment.
//
//   node scripts/deploy/canary-controller.mjs run --canary <dpl_id> [--drill]
//   node scripts/deploy/canary-controller.mjs rollback [--reason "..."]
//   node scripts/deploy/canary-controller.mjs promote
//   node scripts/deploy/canary-controller.mjs status
//
// Environment:
//   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID   required
//   CANARY_SIGNALS_URL, CANARY_SIGNALS_TOKEN         optional RUM endpoint (docs/deploy/canary-rollout.md)
//   VERCEL_AUTOMATION_BYPASS_SECRET                  optional, for protected deployment URLs
//   CANARY_POLICY                                    default .github/canary-policy.json
//
// Exit codes (see docs/deploy/canary-rollout.md):
//   0  promoted (or override applied)
//   1  rolled back / aborted externally / superseded (deliberate "do not promote")
//   2  the promotion check errored (unhandled error during the decision)

export const EXIT_PROMOTED = 0;
export const EXIT_NOT_PROMOTED = 1;
export const EXIT_ERROR = 2;

import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decide, validatePolicy } from "./canary-policy.mjs";

/** Probe path used by `--drill`. It must 404, which counts as a failed probe. */
export const DRILL_PROBE_PATH = "/__canary-drill__/intentionally-missing";

/**
 * @typedef {{
 *   state: "ACTIVE" | "COMPLETE" | "ABORTED",
 *   activeStage: { index: number, targetPercentage: number, isFinalStage: boolean } | null,
 *   nextStage: { index: number, targetPercentage: number, isFinalStage: boolean } | null,
 *   canaryDeployment: { id: string, url: string } | null,
 *   currentDeployment: { id: string, url: string } | null,
 * }} RollingRelease
 *
 * @typedef {{
 *   getRelease(): Promise<RollingRelease | null>,
 *   approveStage(canaryId: string, nextStageIndex: number): Promise<void>,
 *   complete(canaryId: string): Promise<void>,
 *   rollback(toDeploymentId: string, reason: string): Promise<void>,
 * }} Platform
 */

/**
 * Drives one rolling release to completion or rollback.
 *
 * @param {{
 *   canaryDeploymentId: string,
 *   policy: any,
 *   platform: Platform,
 *   probe: (url: string) => Promise<import("./canary-policy.mjs").Probe>,
 *   signals?: ((deploymentId: string, sinceMs: number) => Promise<import("./canary-policy.mjs").RumSignals | null>) | null,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 *   log?: (line: string) => void,
 *   drill?: boolean,
 * }} opts
 * @returns {Promise<{ outcome: "promoted" | "rolled-back" | "aborted-externally" | "superseded", reasons: string[] }>}
 */
export async function runCanary({
  canaryDeploymentId,
  policy,
  platform,
  probe,
  signals = null,
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = console.log,
  drill = false,
}) {
  validatePolicy(policy);
  const probePaths = drill ? [DRILL_PROBE_PATH] : policy.probe.paths;
  if (drill)
    log(`DRILL: probing ${DRILL_PROBE_PATH}, which must 404, to prove automated rollback fires`);

  /** @type {number | null} */
  let stageIndex = null;
  let stageStart = now();
  /** @type {import("./canary-policy.mjs").Probe[]} */
  let probes = [];

  for (;;) {
    const rr = await platform.getRelease();
    if (!rr || rr.state === "COMPLETE") {
      log("Rolling release is complete; canary is serving 100% of production traffic.");
      return { outcome: "promoted", reasons: [] };
    }
    if (rr.state === "ABORTED") {
      log(
        "Rolling release was aborted outside this controller (manual override or Instant Rollback)."
      );
      return { outcome: "aborted-externally", reasons: ["aborted outside the controller"] };
    }
    if (rr.canaryDeployment?.id !== canaryDeploymentId) {
      log(
        `Active rolling release is for ${rr.canaryDeployment?.id}, not ${canaryDeploymentId}; stopping.`
      );
      return {
        outcome: "superseded",
        reasons: [`release now belongs to ${rr.canaryDeployment?.id}`],
      };
    }
    if (!rr.activeStage) throw new Error("Active rolling release has no activeStage");

    if (rr.activeStage.index !== stageIndex) {
      stageIndex = rr.activeStage.index;
      stageStart = now();
      probes = [];
      log(
        `Stage ${stageIndex}: canary receives ${rr.activeStage.targetPercentage}% of production traffic.`
      );
    }

    for (const path of probePaths)
      probes.push(await probe(`https://${rr.canaryDeployment.url}${path}`));

    let canary = null;
    let baseline = null;
    if (signals) {
      try {
        [canary, baseline] = await Promise.all([
          signals(rr.canaryDeployment.id, stageStart),
          rr.currentDeployment
            ? signals(rr.currentDeployment.id, stageStart)
            : Promise.resolve(null),
        ]);
      } catch (err) {
        log(
          `WARN: health signals unavailable this poll: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    const elapsed = now() - stageStart;
    const decision = decide({ policy, stageElapsedMs: elapsed, probes, canary, baseline });
    log(
      `[stage ${stageIndex} +${Math.round(elapsed / 1000)}s] ${decision.action}: ${[...decision.reasons, ...decision.notes].join("; ")}`
    );

    if (
      decision.action === "rollback" ||
      (decision.action === "wait" && elapsed > policy.maxStageMinutes * 60_000)
    ) {
      const reasons =
        decision.action === "rollback"
          ? decision.reasons
          : [`no promote decision within ${policy.maxStageMinutes} min at stage ${stageIndex}`];
      if (!rr.currentDeployment)
        throw new Error("Cannot roll back: rolling release has no current (base) deployment");
      await platform.rollback(
        rr.currentDeployment.id,
        `Automated canary rollback: ${reasons.join("; ")}`.slice(0, 250)
      );
      log(`ROLLED BACK to ${rr.currentDeployment.id}: ${reasons.join("; ")}`);
      return { outcome: "rolled-back", reasons };
    }

    if (decision.action === "advance") {
      if (!rr.nextStage || rr.nextStage.isFinalStage) {
        await platform.complete(canaryDeploymentId);
        log("Promoted canary to 100% of production traffic.");
        return { outcome: "promoted", reasons: [] };
      }
      await platform.approveStage(canaryDeploymentId, rr.nextStage.index);
      log(`Approved stage ${rr.nextStage.index} (${rr.nextStage.targetPercentage}%).`);
      continue;
    }

    await sleep(policy.pollSeconds * 1000);
  }
}

/**
 * Maps a runCanary outcome to the process exit code. A deliberate "do not
 * promote" decision (rollback / aborted / superseded) is distinct from an
 * error, which is signalled by throwing and handled by the CLI wrapper.
 *
 * @param {{ outcome: "promoted" | "rolled-back" | "aborted-externally" | "superseded" }} result
 * @returns {number}
 */
export function exitCodeForOutcome(result) {
  return result.outcome === "promoted" ? EXIT_PROMOTED : EXIT_NOT_PROMOTED;
}

// ── Vercel adapter ─────────────────────────────────────────────────────────────

/**
 * @param {{ token: string, projectId: string, orgId?: string, fetchImpl?: typeof fetch }} cfg
 * @returns {Platform}
 */
export function vercelPlatform({ token, projectId, orgId, fetchImpl = fetch }) {
  // Personal accounts have a user id here, and teamId must be omitted for them.
  const team = orgId?.startsWith("team_") ? `teamId=${encodeURIComponent(orgId)}` : "";
  const project = encodeURIComponent(projectId);
  const call = async (method, path, body) => {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetchImpl(`https://api.vercel.com${path}${team ? sep + team : ""}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok)
      throw new Error(`Vercel ${method} ${path} → HTTP ${res.status}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : {};
  };
  return {
    async getRelease() {
      return (await call("GET", `/v1/projects/${project}/rolling-release`)).rollingRelease ?? null;
    },
    async approveStage(canaryDeploymentId, nextStageIndex) {
      await call("POST", `/v1/projects/${project}/rolling-release/approve-stage`, {
        canaryDeploymentId,
        nextStageIndex,
      });
    },
    async complete(canaryDeploymentId) {
      await call("POST", `/v1/projects/${project}/rolling-release/complete`, {
        canaryDeploymentId,
      });
    },
    async rollback(toDeploymentId, reason) {
      await call("POST", `/v1/projects/${project}/rollback`, { toDeploymentId, reason });
    },
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

function loadPolicy() {
  const path = process.env.CANARY_POLICY || ".github/canary-policy.json";
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

async function main(argv) {
  const { command, flags } = parseArgs(argv);
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = requireEnv("VERCEL_PROJECT_ID");
  const orgId = process.env.VERCEL_ORG_ID;
  const platform = vercelPlatform({ token, projectId, orgId });

  if (command === "run") {
    const canaryDeploymentId = flags.canary;
    if (typeof canaryDeploymentId !== "string")
      throw new Error("run requires --canary <deployment_id>");
    const policy = loadPolicy();
    const result = await runCanary({
      canaryDeploymentId,
      policy,
      platform,
      probe: async (url) => {
        const res = await fetch(url, {
          headers: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
            ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
            : {},
        });
        return { url, status: res.status, ok: res.ok };
      },
      signals: process.env.CANARY_SIGNALS_URL
        ? async (deploymentId, sinceMs) => {
            const res = await fetch(
              `${process.env.CANARY_SIGNALS_URL}?deployment=${encodeURIComponent(deploymentId)}&since=${sinceMs}`,
              {
                headers: process.env.CANARY_SIGNALS_TOKEN
                  ? { Authorization: `Bearer ${process.env.CANARY_SIGNALS_TOKEN}` }
                  : {},
              }
            );
            if (!res.ok) throw new Error(`signals endpoint HTTP ${res.status}`);
            return res.json();
          }
        : null,
      drill: flags.drill === true,
    });
    return exitCodeForOutcome(result);
  }

  if (command === "rollback") {
    const reason = typeof flags.reason === "string" ? flags.reason : "Manual canary rollback";
    const rr = await platform.getRelease();
    if (!rr?.currentDeployment)
      throw new Error("No rolling release with a base deployment to roll back to");
    await platform.rollback(rr.currentDeployment.id, reason.slice(0, 250));
    console.log(`Rolled back to ${rr.currentDeployment.id}: ${reason}`);
    return EXIT_NOT_PROMOTED;
  }

  if (command === "promote") {
    const rr = await platform.getRelease();
    if (!rr?.canaryDeployment) throw new Error("No rolling release with a canary deployment");
    await platform.complete(rr.canaryDeployment.id);
    console.log(`Promoted ${rr.canaryDeployment.id} to 100% of production traffic.`);
    return EXIT_PROMOTED;
  }

  if (command === "status") {
    const rr = await platform.getRelease();
    console.log(JSON.stringify(rr, null, 2));
    return EXIT_PROMOTED;
  }

  throw new Error(`Unknown command: ${command ?? "(none)"}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const step = process.argv[2] ?? "(none)";
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(
        `ERROR: canary controller step "${step}" failed: ${err instanceof Error ? err.stack ?? err.message : err}`
      );
      process.exitCode = EXIT_ERROR;
    }
  );
}
