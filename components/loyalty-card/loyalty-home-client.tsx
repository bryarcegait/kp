"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutCustomer, type CustomerLoyaltyCard } from "@/app/customer-loyalty-actions";
import { LoggedInCardHero, LoggedOutCardHero } from "@/components/loyalty-card/card-hero";
import { RegisterDialog } from "@/components/loyalty-card/register-dialog";
import { LoginDialog } from "@/components/loyalty-card/login-dialog";

const POLL_INTERVAL_MS = 9000;

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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(initialVerified);
  const [loginBanner, setLoginBanner] = useState(
    initialVerified ? "Email verified! Log in to continue." : ""
  );
  const router = useRouter();
  const hasHandledQuery = useRef(false);

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
          if (message) toast.success(message);
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      {card && qrDataUrl ? (
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
