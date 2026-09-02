"use client";

import { useMemo } from "react";

const EMOJIS = ["🍗", "🍗", "🍗", "✨", "🎉"];

function randomPiece(id: number) {
  return {
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.2,
    drift: Math.round((Math.random() - 0.5) * 160),
    spin: Math.round((Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360)),
    size: 20 + Math.random() * 16,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
  };
}

export function WingConfetti({ burstKey }: { burstKey: number }) {
  // Re-randomize whenever a new burst is triggered (burstKey changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => Array.from({ length: 24 }, (_, i) => randomPiece(i)), [burstKey]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="kp-confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              fontSize: `${piece.size}px`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--kp-confetti-drift": `${piece.drift}px`,
              "--kp-confetti-spin": `${piece.spin}deg`,
            } as React.CSSProperties
          }
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}
