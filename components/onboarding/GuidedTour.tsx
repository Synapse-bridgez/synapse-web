"use client";
import { useState } from "react";

import { AMBER, BG0, BG1, BORDER, DIM, MONO } from "@/lib/constants";
import { WALLET_DOMAIN_BINDING_DOCS } from "@/lib/wallet/origin";

/**
 * First-visit anti-phishing briefing for wallet-connect and signing.
 *
 * Much of the defense against wallet-connect phishing lives in the wallet
 * extension's own domain-binding confirmation. The dashboard cannot implement
 * that and should not pretend to; what it can do is make the user taught:
 * what to check in the address bar, what the badge means, and where the
 * extension's own check lives. That is this content.
 *
 * It opens once on first visit, keyed in localStorage, and stays reopenable
 * from the header so it is never more than one click away.
 */
const ONBOARDING_KEY = "synapse-onboarding-seen-v1";

interface Step {
  title: string;
  body: string;
  links?: { label: string; href: string }[];
}

const STEPS: Step[] = [
  {
    title: "The origin badge",
    body: `The badge in the header names the exact origin this page runs from.
      Green "GENUINE ORIGIN" only ever means one of the published domains.
      Red "UNVERIFIED ORIGIN" means this build is not on that list — a fork,
      a preview host, or a clone. Red beats green: compare it with the address
      bar before doing anything.`,
  },
  {
    title: "What you sign for lives in the extension",
    body: `Synapse Core never knows what you sign. Freighter and xBull show their
      own confirmation with the requesting domain — that is the check that
      actually binds you to a site. A transaction signed from a typo'd clone
      is a transaction signed for the clone.`,
    links: [
      { label: "Freighter documentation", href: WALLET_DOMAIN_BINDING_DOCS.freighter },
      { label: "xBull documentation", href: "https://xbull.app/docs" },
    ],
  },
  {
    title: "How clones get you",
    body: `Phishing clones are not "fake-looking" — they are pixel-perfect copies
      with a different host. The wallet extension's domain confirmation and
      this badge are the two signals a clone cannot copy, because both come
      from outside the page. Never type a wallet's recovery phrase anywhere,
      and bookmark the real dashboard instead of trusting search results.`,
  },
];

function loadSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {}
}

interface GuidedTourProps {
  /**
   * A counter the header increments to force the briefing open on demand, even
   * for a user who has completed it before. Never auto-opens for them again.
   */
  reopenSignal: number;
}

export function GuidedTour({ reopenSignal }: GuidedTourProps) {
  const [open, setOpen] = useState<boolean>(() => {
    // First visit: show it. The "browse the app but keep reality in view"
    // choice means a returning user is never nagged again.
    return process.env.NODE_ENV !== "test" && !loadSeen();
  });
  const [step, setStep] = useState(0);

  // Reacting to a changed prop is done by comparing against the last value
  // handled, during render, rather than in an effect. This is React's
  // documented "adjusting state when a prop changes" pattern: the comparison
  // against a value carried in state makes the first render a no-op (the
  // initial state equals the initial prop) and only a genuine change afterwards
  // reopens the tour. The previous version used a `setInitialized(true)`
  // effect as a "skip the first run" guard, which `react-hooks/set-state-in-effect`
  // flags and which costs an extra render pass on every mount.
  const [handledSignal, setHandledSignal] = useState(reopenSignal);
  if (handledSignal !== reopenSignal) {
    setHandledSignal(reopenSignal);
    setOpen(true);
    setStep(0);
  }

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const advance = () => {
    if (step + 1 >= STEPS.length) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!open) return null;

  const current = STEPS[step] ?? STEPS[0]!;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wallet security briefing"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          background: BG1,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
          fontFamily: MONO,
          color: "#fff",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", color: DIM }}>
            WALLET SECURITY BRIEFING · {step + 1} / {STEPS.length}
          </p>
          <h2 style={{ margin: "6px 0 0", fontSize: 16, letterSpacing: "0.06em" }}>
            {current.title}
          </h2>
        </div>

        <div style={{ padding: "18px 22px", fontSize: 12, lineHeight: 1.8, color: "#d9dde3" }}>
          <p style={{ margin: 0 }}>{current.body}</p>
          {current.links && (
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {current.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: AMBER }}
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={close}
            style={{
              background: "none",
              border: "none",
              color: DIM,
              fontFamily: MONO,
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            skip forever
          </button>
          <button
            type="button"
            onClick={advance}
            style={{
              background: AMBER,
              border: "none",
              color: BG0,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              padding: "8px 18px",
              cursor: "pointer",
            }}
          >
            {step + 1 >= STEPS.length ? "I understand" : "next"}
          </button>
        </div>
      </div>
    </div>
  );
}
