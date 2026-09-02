"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const SWIPE_THRESHOLD_PX = 40;

export function FlippableCard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
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
