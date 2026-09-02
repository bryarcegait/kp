import Image from "next/image";
import Link from "next/link";
import { Download, Gift, History, LogIn, LogOut, Sparkles, UserPlus, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CustomerLoyaltyCard } from "@/app/customer-loyalty-actions";
import { formatDate } from "@/lib/format";

const actionButtonBase =
  "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-sm transition active:scale-[0.98]";
const actionButtonSolid = "bg-[#c45a23] text-white hover:bg-[#a94618]";
const actionButtonSoft = "bg-[#fff4d5] text-[#7a2f14] hover:bg-[#ffe9bd]";

function StampRow({ points, rewardTiers }: { points: number; rewardTiers: { stamps: number; name: string }[] }) {
  const maxStamps = rewardTiers.length > 0 ? Math.max(...rewardTiers.map((r) => r.stamps)) : 10;
  const rewardAtStamp = new Set(rewardTiers.map((r) => r.stamps));

  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-3">
      {Array.from({ length: maxStamps }).map((_, index) => {
        const stampNumber = index + 1;
        const isEarned = points >= stampNumber;
        const isRewardSlot = rewardAtStamp.has(stampNumber);

        return (
          <div
            key={stampNumber}
            className="grid aspect-square place-items-center rounded-2xl bg-[#fff4d5]"
          >
            {isRewardSlot ? (
              <Gift
                className={`size-6 sm:size-9 ${isEarned ? "text-[#c45a23]" : "text-[#e89362]"}`}
              />
            ) : isEarned ? (
              <Image
                src="/kanto-logo.png"
                alt=""
                width={60}
                height={60}
                className="size-6 object-contain sm:size-9"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CardLogo() {
  return (
    <Image
      src="/kanto-logo.png"
      alt="Kanto't Pakpakan"
      width={56}
      height={56}
      className="size-12 rounded-full bg-white object-contain p-1 shadow-sm sm:size-14"
      priority
    />
  );
}

export function LoggedOutCardHero({
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#fb8428] to-[#c45a23] p-6 text-[#fff4d5] shadow-lg sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#fff4d5]/80">
            eLoyalty Card
          </p>
          <CardLogo />
        </div>
        <p className="mt-2 text-4xl font-black tracking-wide text-white sm:text-5xl">KP CARD</p>
        <div className="mt-8">
          <p className="text-lg text-[#fff4d5]/90 sm:text-xl">This card belongs to:</p>
          <p
            className="mt-2 border-b-4 border-[#fff4d5]/60 pb-2 text-5xl italic text-white/40 sm:text-6xl"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Your name here
          </p>
        </div>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-[#fff4d5]/90 sm:text-lg">
          Register to start collecting stamps every time you order — every ₱200 spent earns a
          stamp toward free drinks and free meals.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onLogin}
          className={`${actionButtonBase} ${actionButtonSoft}`}
        >
          <LogIn className="size-4" />
          Login
        </button>
        <button
          type="button"
          onClick={onRegister}
          className={`${actionButtonBase} ${actionButtonSolid}`}
        >
          <UserPlus className="size-4" />
          Register
        </button>
      </div>
    </div>
  );
}

export function LoggedInCardHero({
  card,
  qrDataUrl,
  onLogout,
}: {
  card: CustomerLoyaltyCard;
  qrDataUrl: string;
  onLogout: () => void;
}) {
  const points = card.loyaltyPoints;

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#fb8428] to-[#c45a23] p-6 text-[#fff4d5] shadow-lg sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#fff4d5]/80">
                eLoyalty Card
              </p>
              <CardLogo />
            </div>
            <p className="mt-2 text-4xl font-black tracking-wide text-white sm:text-5xl">
              KP CARD
            </p>
            <p className="mt-6 text-lg text-[#fff4d5]/90 sm:text-xl">This card belongs to:</p>
            <p
              className="mt-2 border-b-4 border-[#fff4d5]/60 pb-2 text-5xl italic text-white sm:text-6xl"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              {card.displayName}
            </p>
          </div>
          <div className="grid place-items-center gap-2 justify-self-center rounded-2xl bg-white p-4 lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, generated server-side, not eligible for next/image optimization */}
            <img src={qrDataUrl} alt="Your loyalty QR code" width={160} height={160} />
            <p className="text-xs font-semibold text-[#7a2f14]">Show this at checkout</p>
            <a
              href={qrDataUrl}
              download="kp-loyalty-qr.png"
              className="flex items-center gap-1.5 rounded-full bg-[#fff4d5] px-3 py-1.5 text-xs font-semibold text-[#7a2f14] transition hover:bg-[#ffe9bd]"
            >
              <Download className="size-3.5" />
              Download QR
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <StampRow points={points} rewardTiers={card.rewardTiers} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold sm:text-base">
          <Badge className="bg-[#7a2f14] text-white hover:bg-[#7a2f14]">
            {points} current stamp{points === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
            {card.lifetimePoints} lifetime
          </Badge>
          {card.nextRewardStamps ? (
            <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
              Next reward at {card.nextRewardStamps}
            </Badge>
          ) : (
            <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
              Reward available
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/order" className={`${actionButtonBase} ${actionButtonSoft}`}>
          <Utensils className="size-4" />
          View Menu
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className={`${actionButtonBase} ${actionButtonSolid}`}
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 font-semibold">
          <History className="size-4 text-primary" />
          Recent stamp activity
        </div>
        {card.latestTransactions.length > 0 ? (
          <div className="grid gap-2">
            {card.latestTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 font-medium">
                  <span>
                    {transaction.points > 0 ? "+" : ""}
                    {transaction.points} stamp{Math.abs(transaction.points) === 1 ? "" : "s"}
                  </span>
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">
                  {transaction.remarks ?? transaction.rewardName ?? transaction.type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            No stamp activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
