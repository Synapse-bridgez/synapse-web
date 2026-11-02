import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GuidedTour,
  STEPS,
  ONBOARDING_KEY,
  loadSeen,
  markSeen,
} from "./GuidedTour";

describe("GuidedTour Component (#306)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constants & Helper Functions", () => {
    it("defines 3 briefing steps covering origin badge, extension signing, and phishing clones", () => {
      expect(STEPS.length).toBe(3);
      expect(STEPS[0]?.title).toBe("The origin badge");
      expect(STEPS[1]?.title).toBe("What you sign for lives in the extension");
      expect(STEPS[2]?.title).toBe("How clones get you");
    });

    it("Step 2 includes documentation links for Freighter and xBull", () => {
      const step2 = STEPS[1];
      expect(step2?.links).toBeDefined();
      expect(step2?.links?.length).toBe(2);
      expect(step2?.links?.[0]?.label).toContain("Freighter");
      expect(step2?.links?.[1]?.label).toContain("xBull");
    });

    it("loadSeen returns false by default and true after markSeen", () => {
      expect(loadSeen()).toBe(false);
      markSeen();
      expect(loadSeen()).toBe(true);
      expect(window.localStorage.getItem(ONBOARDING_KEY)).toBe("1");
    });

    it("loadSeen handles localStorage failure gracefully", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
        throw new Error("QuotaExceeded");
      });
      expect(loadSeen()).toBe(true);
    });
  });

  describe("Rendering & Visibility", () => {
    it("renders nothing when closed (defaultOpen=false)", () => {
      render(<GuidedTour defaultOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal dialog with step 1 when defaultOpen=true", () => {
      render(<GuidedTour defaultOpen={true} />);
      expect(screen.getByRole("dialog", { name: /guided tour/i })).toBeInTheDocument();
      expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
      expect(screen.getByText("The origin badge")).toBeInTheDocument();
      expect(screen.getByText(/Green "GENUINE ORIGIN"/i)).toBeInTheDocument();
    });

    it("opens when reopenSignal is triggered", () => {
      const { rerender } = render(<GuidedTour reopenSignal={0} defaultOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(<GuidedTour reopenSignal={1} defaultOpen={false} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
    });

    it("opens when legacy trigger prop is provided", () => {
      const { rerender } = render(<GuidedTour trigger={0} defaultOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(<GuidedTour trigger={1} defaultOpen={false} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Navigation & User Interactions", () => {
    it("navigates forward through steps via Next button", () => {
      render(<GuidedTour defaultOpen={true} />);

      // Step 1: Back button not visible
      expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();

      // Go to Step 2
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("STEP 2 / 3")).toBeInTheDocument();
      expect(screen.getByText("What you sign for lives in the extension")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /freighter documentation/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /xbull documentation/i })).toBeInTheDocument();

      // Back button should now be visible
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();

      // Go to Step 3 (final step)
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("STEP 3 / 3")).toBeInTheDocument();
      expect(screen.getByText("How clones get you")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
    });

    it("navigates backwards via Back button", () => {
      render(<GuidedTour defaultOpen={true} />);

      // Move to Step 2
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("STEP 2 / 3")).toBeInTheDocument();

      // Click Back
      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
      expect(screen.getByText("The origin badge")).toBeInTheDocument();
    });

    it("dismisses dialog and records seen state on Skip tour click", () => {
      const onClose = vi.fn();
      render(<GuidedTour defaultOpen={true} onClose={onClose} />);

      const skipButton = screen.getByRole("button", { name: /skip tour/i });
      fireEvent.click(skipButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(window.localStorage.getItem(ONBOARDING_KEY)).toBe("1");
      expect(onClose).toHaveBeenCalled();
    });

    it("completes tour, marks seen, and closes on Finish click on last step", () => {
      const onClose = vi.fn();
      render(<GuidedTour defaultOpen={true} onClose={onClose} />);

      // Advance to step 2
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      // Advance to step 3
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      const finishButton = screen.getByRole("button", { name: /finish/i });
      fireEvent.click(finishButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(window.localStorage.getItem(ONBOARDING_KEY)).toBe("1");
      expect(onClose).toHaveBeenCalled();
    });

    it("renders target element highlight rectangle when target is matched in DOM", () => {
      // Mock element with getBoundingClientRect
      const targetDiv = document.createElement("div");
      targetDiv.setAttribute("data-tour", "docs-tab");
      vi.spyOn(targetDiv, "getBoundingClientRect").mockReturnValue({
        top: 100,
        left: 200,
        width: 150,
        height: 50,
        bottom: 150,
        right: 350,
        x: 200,
        y: 100,
        toJSON: () => {},
      });
      document.body.appendChild(targetDiv);

      // Add a step with target
      STEPS.push({
        title: "Docs Tab",
        body: "Look at docs",
        target: "[data-tour='docs-tab']",
      });

      try {
        render(<GuidedTour defaultOpen={true} />);
        // Advance to step 4
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        fireEvent.click(screen.getByRole("button", { name: /next/i }));

        expect(screen.getByTestId("guided-tour-target-highlight")).toBeInTheDocument();
      } finally {
        STEPS.pop();
        document.body.removeChild(targetDiv);
      }
    });
  });
});
