"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutCustomer, type CustomerLoyaltyCard } from "@/app/customer-loyalty-actions";
import { LoggedInCardHero, LoggedOutCardHero } from "@/components/loyalty-card/card-hero";
import { RegisterDialog } from "@/components/loyalty-card/register-dialog";
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

export function LoyaltyHomeClient({
  initialCard,
  qrDataUrl,
  initialVerified,
  initialVerifyError,
}: {
  initialCard: CustomerLoyaltyCard | null;
  qrDataUrl: string | null;
  initialVerified: boolean;
  initialVerifyError: string | null;
}) {
  const [card, setCard] = useState(initialCard);
  const [prevInitialCard, setPrevInitialCard] = useState(initialCard);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(initialVerified);
  const [loginBanner, setLoginBanner] = useState(
    initialVerified ? "Email verified! Log in to continue." : ""
  );
  const [confettiBurst, setConfettiBurst] = useState(0);
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

    if (initialVerifyError) {
      toast.error(
        initialVerifyError === "invalid"
          ? "That verification link is invalid or has expired. Please sign up again."
          : "Something went wrong verifying your email."
      );
    }

    if (initialVerified || initialVerifyError) {
      window.history.replaceState(null, "", "/");
    }
  }, [initialVerified, initialVerifyError]);

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
          const message = buildEarnedMessage(previous, data.card);
          if (message) {
            toast.success(message);
            setConfettiBurst((n) => n + 1);
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
          <LoggedInCardHero card={card} qrDataUrl={qrDataUrl} onLogout={handleLogout} />
        ) : (
          <LoggedOutCardHero
            onRegister={() => setIsRegisterOpen(true)}
            onLogin={() => {
              setLoginBanner("");
              setIsLoginOpen(true);
            }}
          />
        )}
      </div>

      <RegisterDialog
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        onSwitchToLogin={() => {
          setLoginBanner("");
          setIsLoginOpen(true);
        }}
      />
      <LoginDialog
        open={isLoginOpen}
        onOpenChange={(open) => {
          setIsLoginOpen(open);
          if (!open) setLoginBanner("");
        }}
        onSwitchToRegister={() => setIsRegisterOpen(true)}
        banner={loginBanner}
      />
    </div>
  );
}
