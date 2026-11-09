"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { BG2, BORDER, DIM, MONO, TEXT } from "@/lib/constants";
import { WALLET_DOMAIN_BINDING_DOCS } from "@/lib/wallet/origin";
import { TourControls } from "@/components/onboarding/TourControls";

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
export const ONBOARDING_KEY = "synapse-onboarding-seen-v1";

export interface Step {
  title: string;
  body: string;
  links?: { label: string; href: string }[];
  target?: string;
}

export const STEPS: Step[] = [
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

export function loadSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {}
}

export interface GuidedTourProps {
  /**
   * A counter the header increments to force the briefing open on demand, even
   * for a user who has completed it before. Never auto-opens for them again.
   */
  reopenSignal?: number;
  /** Increment to manually re-trigger the tour from outside. */
  trigger?: number;
  /** Direct initial open flag (useful for testing or initial forced preview). */
  defaultOpen?: boolean;
  /** Optional callback fired when the tour is closed or completed. */
  onClose?: () => void;
}

export function GuidedTour({
  reopenSignal = 0,
  trigger = 0,
  defaultOpen,
  onClose,
}: GuidedTourProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (defaultOpen !== undefined) return defaultOpen;
    return process.env.NODE_ENV !== "test" && !loadSeen();
  });
  const [step, setStep] = useState(0);

  // Reacting to a changed prop during render (React-recommended pattern).
  const [handledSignal, setHandledSignal] = useState(reopenSignal);
  if (handledSignal !== reopenSignal) {
    setHandledSignal(reopenSignal);
    if (reopenSignal > 0) {
      setOpen(true);
      setStep(0);
    }
  }

  // Support the legacy trigger prop.
  const [handledTrigger, setHandledTrigger] = useState(trigger);
  if (handledTrigger !== trigger) {
    setHandledTrigger(trigger);
    if (trigger > 0) {
      setOpen(true);
      setStep(0);
    }
  }

  const close = useCallback(() => {
    markSeen();
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s + 1 >= STEPS.length) {
        markSeen();
        setOpen(false);
        onClose?.();
        return s;
      }
      return s + 1;
    });
  }, [onClose]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const current = STEPS[step] ?? STEPS[0]!;

  const rect = useMemo(() => {
    if (!open || !current?.target || typeof document === "undefined") return null;
    const el = document.querySelector(current.target);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, [open, current, step]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guided tour"
      data-testid="guided-tour-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
      }}
    >
      {rect && (
        <div
          data-testid="guided-tour-target-highlight"
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            border: `2px solid ${TEXT}`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        data-testid="guided-tour-card"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 320,
          background: BG2,
          border: `1px solid ${BORDER}`,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: DIM,
            fontFamily: MONO,
            marginBottom: 8,
          }}
        >
          STEP {step + 1} / {STEPS.length}
        </div>
        <div style={{ fontSize: 14, color: TEXT, marginBottom: 8 }} data-testid="guided-tour-title">
          {current.title}
        </div>
        <div
          style={{ fontSize: 12, color: DIM, lineHeight: 1.5, marginBottom: 16 }}
          data-testid="guided-tour-body"
        >
          {current.body}
        </div>

        {current.links && current.links.length > 0 && (
          <div
            data-testid="guided-tour-links"
            style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}
          >
            {current.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: TEXT, textDecoration: "underline" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        <TourControls
          step={step}
          totalSteps={STEPS.length}
          onSkip={close}
          onBack={back}
          onNext={advance}
        />
      </div>
    </div>
  );
}

export default GuidedTour;
