"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const SWIPE_THRESHOLD_PX = 40;
// How long the back face stays visible before the hint auto-flips back to
// the front — long enough to clear the 0.6s flip transition plus a beat to
// actually notice the stamp grid.
const HINT_FLIP_BACK_DELAY_MS = 1300;

export function FlippableCard({
  front,
  back,
  flipToBackSignal,
  autoFlipHintSignal,
}: {
  front: ReactNode;
  back: ReactNode;
  /** Bump this (e.g. a counter) to force the card to the back face — used
   * to auto-reveal newly-awarded stamps. The customer can still freely tap
   * back to the front afterward; this only nudges the initial flip. */
  flipToBackSignal?: number;
  /** Bump this to flip to the back and then automatically flip back to the
   * front a moment later — a one-off hint (e.g. right after login) that
   * shows the card has a back page, without leaving the customer stranded
   * on the back face. */
  autoFlipHintSignal?: number;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const [prevFlipSignal, setPrevFlipSignal] = useState(flipToBackSignal);
  const [prevHintSignal, setPrevHintSignal] = useState(autoFlipHintSignal);

  // React's documented pattern for adjusting state in response to a prop
  // change during render, rather than in an effect (see the same pattern
  // used for card/session syncing in loyalty-home-client.tsx).
  if (flipToBackSignal !== prevFlipSignal) {
    setPrevFlipSignal(flipToBackSignal);
    if (flipToBackSignal) setIsFlipped(true);
  }
  if (autoFlipHintSignal !== prevHintSignal) {
    setPrevHintSignal(autoFlipHintSignal);
    if (autoFlipHintSignal) setIsFlipped(true);
  }

  useEffect(() => {
    if (!autoFlipHintSignal) return;
    const timer = setTimeout(() => setIsFlipped(false), HINT_FLIP_BACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoFlipHintSignal]);
  // These render the same content unconstrained (visibility:hidden, out of
  // the visible flow) purely to measure natural height. Measuring the
  // visible faces directly would be circular once we apply the computed
  // height back to them — a constrained element's scrollHeight/rect just
  // reports the constraint, not what the content actually needs.
  const frontMeasureRef = useRef<HTMLDivElement>(null);
  const backMeasureRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const frontHeight = frontMeasureRef.current?.scrollHeight ?? 0;
      const backHeight = backMeasureRef.current?.scrollHeight ?? 0;
      const next = Math.max(frontHeight, backHeight);
      if (next > 0) setHeight(next);
    }

    measure();

    const observer = new ResizeObserver(measure);
    if (frontMeasureRef.current) observer.observe(frontMeasureRef.current);
    if (backMeasureRef.current) observer.observe(backMeasureRef.current);

    // The handwritten name font can finish loading after this first
    // measurement and change the front face's height.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => observer.disconnect();
  });

  function toggleFlip() {
    setIsFlipped((value) => !value);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    if (Math.abs(endX - startX) > SWIPE_THRESHOLD_PX) toggleFlip();
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 invisible"
      >
        <div ref={frontMeasureRef}>{front}</div>
        <div ref={backMeasureRef}>{back}</div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped
            ? "Showing your stamp collection. Tap or swipe to see your QR code."
            : "Showing your QR code. Tap or swipe to see your stamp collection."
        }
        className="kp-flip-card-perspective relative"
        style={{ height: height ?? undefined, minHeight: height ? undefined : 300 }}
        onClick={toggleFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleFlip();
          }
        }}
      >
        <div className={`kp-flip-card-inner absolute inset-0 ${isFlipped ? "kp-flip-card-flipped" : ""}`}>
          <div className="kp-flip-card-face" style={{ height: height ?? undefined }}>
            {front}
          </div>
          <div className="kp-flip-card-face kp-flip-card-back" style={{ height: height ?? undefined }}>
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
