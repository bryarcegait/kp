"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutCustomer, type CustomerLoyaltyCard } from "@/app/customer-loyalty-actions";
import { LoggedInCardHero, LoggedOutCardHero } from "@/components/loyalty-card/card-hero";
import { LoginDialog } from "@/components/loyalty-card/login-dialog";
import { WingConfetti } from "@/components/loyalty-card/wing-confetti";

const POLL_INTERVAL_MS = 9000;
const FLIP_HALF_DURATION_MS = 320;
const CONFETTI_DURATION_MS = 2600;

function buildEarnedMessage(previous: CustomerLoyaltyCard, next: CustomerLoyaltyCard) {
  const earned = next.lifetimePoints - previous.lifetimePoints;
  if (earned <= 0) return null;

  const nextReward = next.rewardTiers.find((reward) => reward.stamps === next.nextRewardStamps);
  const remaining = next.nextRewardStamps ? next.nextRewardStamps - next.loyaltyPoints : 0;

  return `You earned ${earned} stamp${earned === 1 ? "" : "s"}! ${
    nextReward && remaining > 0
      ? `${remaining} more to get ${nextReward.name}.`
      : "You have a reward ready to redeem!"
  }`;
}

function buildClaimedMessage(previous: CustomerLoyaltyCard, next: CustomerLoyaltyCard) {
  const latest = next.latestTransactions[0];
  if (!latest || latest.type !== "redeemed") return null;
  if (previous.latestTransactions.some((transaction) => transaction.id === latest.id)) return null;

  return `🎉 ${latest.rewardName ?? "Reward"} claimed! Enjoy!`;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't set up yet.",
  google_failed: "Google sign-in didn't go through. Please try again.",
  google_email_unverified: "Your Google account doesn't have a verified email.",
  facebook_unconfigured: "Facebook sign-in isn't set up yet.",
  facebook_failed: "Facebook sign-in didn't go through. Please try again.",
  facebook_no_email: "We couldn't get an email from Facebook. Please allow email access, or sign up with email instead.",
};

export function LoyaltyHomeClient({
  initialCard,
  qrDataUrl,
  initialOAuthError,
  googleEnabled,
  facebookEnabled,
}: {
  initialCard: CustomerLoyaltyCard | null;
  qrDataUrl: string | null;
  initialOAuthError: string | null;
  googleEnabled: boolean;
  facebookEnabled: boolean;
}) {
  const [card, setCard] = useState(initialCard);
  const [prevInitialCard, setPrevInitialCard] = useState(initialCard);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [flipToBackSignal, setFlipToBackSignal] = useState(0);
  const router = useRouter();
  const hasHandledQuery = useRef(false);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initialCard only reflects the session as of the last server render.
  // Login/logout call router.refresh() to get a fresh one — this is React's
  // documented pattern for adjusting state during render in response to a
  // prop change, without needing an effect.
  if (initialCard !== prevInitialCard) {
    setPrevInitialCard(initialCard);
    setCard(initialCard);
  }

  const isLoggedIn = !!card;
  const [displayedLoggedIn, setDisplayedLoggedIn] = useState(isLoggedIn);
  const [flipPhase, setFlipPhase] = useState<"idle" | "out" | "in">("idle");

  const kickoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoggedIn === displayedLoggedIn) return;

    // Scheduling this (even at 0ms) instead of calling setFlipPhase directly
    // keeps the whole animation sequence in timer callbacks rather than the
    // effect body itself.
    kickoffTimerRef.current = setTimeout(() => {
      setFlipPhase("out");
      outTimerRef.current = setTimeout(() => {
        setDisplayedLoggedIn(isLoggedIn);
        setFlipPhase("in");
        inTimerRef.current = setTimeout(() => setFlipPhase("idle"), FLIP_HALF_DURATION_MS);
      }, FLIP_HALF_DURATION_MS);
    }, 0);

    return () => {
      if (kickoffTimerRef.current) clearTimeout(kickoffTimerRef.current);
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (inTimerRef.current) clearTimeout(inTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (hasHandledQuery.current) return;
    hasHandledQuery.current = true;

    if (initialOAuthError) {
      toast.error(OAUTH_ERROR_MESSAGES[initialOAuthError] ?? "Sign-in didn't go through. Please try again.");
      window.history.replaceState(null, "", "/");
    }
  }, [initialOAuthError]);

  useEffect(() => {
    if (!card) return;

    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch("/api/customer/card");
        if (!response.ok) return;
        const data: { card: CustomerLoyaltyCard } = await response.json();

        setCard((previous) => {
          if (!previous) return previous;
          const earnedMessage = buildEarnedMessage(previous, data.card);
          const claimedMessage = buildClaimedMessage(previous, data.card);
          const message = earnedMessage ?? claimedMessage;
          if (message) {
            toast.success(message);
            setConfettiBurst((n) => n + 1);
            if (earnedMessage) setFlipToBackSignal((n) => n + 1);
            if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
            confettiTimerRef.current = setTimeout(() => setConfettiBurst(0), CONFETTI_DURATION_MS);
          }
          return data.card;
        });
      } catch {
        // Ignore transient network errors; the next poll will retry.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [card]);

  async function handleLogout() {
    await logoutCustomer();
    setCard(null);
    router.refresh();
  }

  const flipClassName =
    flipPhase === "out" ? "kp-card-flip-out" : flipPhase === "in" ? "kp-card-flip-in" : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      {confettiBurst > 0 ? <WingConfetti burstKey={confettiBurst} /> : null}

      <div className={flipClassName} style={{ transformStyle: "preserve-3d" }}>
        {displayedLoggedIn && card && qrDataUrl ? (
          <LoggedInCardHero
            card={card}
            qrDataUrl={qrDataUrl}
            onLogout={handleLogout}
            flipToBackSignal={flipToBackSignal}
          />
        ) : (
          <LoggedOutCardHero onLogin={() => setIsLoginOpen(true)} />
        )}
      </div>

      <LoginDialog
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        googleEnabled={googleEnabled}
        facebookEnabled={facebookEnabled}
      />
    </div>
  );
}
