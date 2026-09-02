"use client";

import { useRef, useState, type ReactNode } from "react";

const SWIPE_THRESHOLD_PX = 40;

export function FlippableCard({
  front,
  back,
  minHeightClassName = "min-h-[420px] sm:min-h-[480px]",
}: {
  front: ReactNode;
  back: ReactNode;
  minHeightClassName?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef<number | null>(null);

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
    <div
      role="button"
      tabIndex={0}
      aria-label={
        isFlipped
          ? "Showing your stamp collection. Tap or swipe to see your QR code."
          : "Showing your QR code. Tap or swipe to see your stamp collection."
      }
      className={`kp-flip-card-perspective relative ${minHeightClassName}`}
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
        <div className="kp-flip-card-face">{front}</div>
        <div className="kp-flip-card-face kp-flip-card-back">{back}</div>
      </div>
    </div>
  );
}
