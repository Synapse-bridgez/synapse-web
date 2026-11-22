"use client";

import { useState, useSyncExternalStore } from "react";
import { TourControls } from "@/components/onboarding/TourControls";
import { BG2, BORDER, DIM, MONO, TEXT } from "@/lib/constants";

const SEEN_KEY = "synapse:guided-tour-seen";

const STEPS = [
  {
    title: "Check the origin badge",
    body: "The badge in the header compares this page's real origin against the published allowlist. GENUINE means an exact match; anything else — LOCAL DEV, UNVERIFIED or EMBEDDED — is not the real dashboard.",
  },
  {
    title: "Trust your wallet's domain check",
    body: "The badge is a hint, not a guarantee. Your wallet extension's own domain confirmation is the check that actually binds a signature to a site. If it names a different domain, reject the request.",
  },
  {
    title: "Know how clones get you",
    body: "Look-alike sites arrive through search ads, DMs and urgent \"verify your wallet\" links. Open the dashboard from your own bookmark and never sign something you didn't start.",
  },
];

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked: don't nag on every load
  }
}

// The flag only changes through this component, which tracks dismissal in state.
const subscribe = () => () => {};

export function GuidedTour({ reopenSignal = 0 }: { reopenSignal?: number }) {
  const seen = useSyncExternalStore(subscribe, readSeen, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [step, setStep] = useState(0);
  const [lastSignal, setLastSignal] = useState(reopenSignal);

  // Adjust state when the prop changes (no effect, first render is a no-op).
  if (reopenSignal !== lastSignal) {
    setLastSignal(reopenSignal);
    setReopened(true);
    setDismissed(false);
    setStep(0);
  }

  if (dismissed || !(reopened || !seen)) return null;

  const close = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // storage blocked: the tour just shows again next visit
    }
    setDismissed(true);
    setReopened(false);
    setStep(0);
  };

  const current = STEPS[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
    >
      <div style={{ background: BG2, border: `1px solid ${BORDER}`, padding: 24, width: "min(440px, calc(100vw - 32px))", display: "flex", flexDirection: "column", gap: 16, fontFamily: MONO }}>
        <div style={{ color: DIM, fontSize: 11 }}>Step {step + 1} of {STEPS.length}</div>
        <h2 id="guided-tour-title" style={{ color: TEXT, fontSize: 14, margin: 0 }}>{current.title}</h2>
        <p style={{ color: TEXT, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{current.body}</p>
        <TourControls
          step={step}
          totalSteps={STEPS.length}
          onSkip={close}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => (step === STEPS.length - 1 ? close() : setStep((s) => s + 1))}
        />
      </div>
    </div>
  );
}
