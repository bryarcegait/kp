"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  CheckCircle2,
  CupSoda,
  Download,
  Drumstick,
  Gift,
  History,
  LogIn,
  LogOut,
  QrCode,
  RotateCw,
  Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CustomerLoyaltyCard } from "@/app/customer-loyalty-actions";
import { formatDate } from "@/lib/format";
import { FlippableCard } from "@/components/loyalty-card/flippable-card";

const actionButtonBase =
  "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-sm transition active:scale-[0.98]";
const actionButtonSolid = "bg-[#c45a23] text-white hover:bg-[#a94618]";
const actionButtonSoft = "bg-[#fff4d5] text-[#7a2f14] hover:bg-[#ffe9bd]";

type RewardTier = { stamps: number; name: string };

/**
 * The first reward tier gets a drink icon, the final (highest) tier gets a
 * wings icon, and anything in between falls back to a generic gift icon —
 * matches today's two-tier program (free drink, then free wings) while
 * still rendering sensibly if more tiers are ever added.
 */
function getRewardVisual(rewardIndex: number, totalRewards: number) {
  if (rewardIndex === 0) {
    return { Icon: CupSoda, label: "Drinks", description: "Any drinks available" };
  }
  if (rewardIndex === totalRewards - 1) {
    return { Icon: Drumstick, label: "Wings", description: "4pcs wings meal" };
  }
  return { Icon: Gift, label: "Reward", description: "" };
}

/**
 * A ring drawn as an SVG stroke around the "next" stamp slot, filling in
 * clockwise from the top as the customer's carried-over spend (tracked
 * server-side as pendingStampAmount) approaches the peso amount needed for
 * one more stamp. Purely visual — the actual stamp only gets recorded once
 * staff scan an order that pushes the running total past the threshold.
 */
function StampProgressRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 size-full -rotate-90"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(122,47,20,0.15)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#c45a23"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/**
 * Stamps grid for the "back" of the card. A slot's gift icon communicates
 * three states: not yet reached (dim), currently claimable — points already
 * cover it and it hasn't been claimed this cycle (bright + pulsing), or
 * claimed this cycle already (muted checkmark). Claiming the final tier
 * resets the stamp count and clears claims, so the grid starts a fresh
 * cycle rather than losing progress on every claim. The very next slot to
 * be earned also gets a circular progress ring showing how close the
 * customer's carried-over spend is to the next stamp (e.g. ₱100 of ₱200 =
 * halfway around) — unless the card is already full (every slot in this
 * cycle earned, final reward awaiting redemption), in which case there's no
 * slot left to attach the ring to until claiming resets the cycle, so it's
 * intentionally hidden rather than shown somewhere misleading.
 */
function StampGrid({
  points,
  claimedRewardStamps,
  rewardTiers,
  pendingStampAmount,
  spendPerStamp,
}: {
  points: number;
  claimedRewardStamps: number[];
  rewardTiers: RewardTier[];
  pendingStampAmount: number;
  spendPerStamp: number;
}) {
  const maxStamps = rewardTiers.length > 0 ? Math.max(...rewardTiers.map((r) => r.stamps)) : 10;
  const claimedStamps = new Set(claimedRewardStamps);
  const nextStampNumber = points + 1;
  const hasNextSlotInThisCycle = points < maxStamps;
  const progressPercent =
    hasNextSlotInThisCycle && spendPerStamp > 0
      ? Math.min(100, Math.max(0, (pendingStampAmount / spendPerStamp) * 100))
      : 0;

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {Array.from({ length: maxStamps }).map((_, index) => {
        const stampNumber = index + 1;
        const isEarned = points >= stampNumber;
        const rewardIndex = rewardTiers.findIndex((reward) => reward.stamps === stampNumber);
        const isRewardSlot = rewardIndex !== -1;
        const isClaimed = isRewardSlot && claimedStamps.has(stampNumber);
        const isClaimable = isRewardSlot && !isClaimed && points >= stampNumber;
        const isInProgress = !isEarned && stampNumber === nextStampNumber && progressPercent > 0;
        const { Icon: RewardIcon } = isRewardSlot
          ? getRewardVisual(rewardIndex, rewardTiers.length)
          : { Icon: Gift };

        return (
          <div
            key={stampNumber}
            className={`relative grid aspect-square place-items-center rounded-full bg-[#fff4d5] ${
              isClaimable ? "ring-4 ring-[#ffd680]" : ""
            }`}
          >
            {isInProgress ? <StampProgressRing percent={progressPercent} /> : null}
            {isRewardSlot ? (
              isClaimed ? (
                <CheckCircle2 className="size-6 text-emerald-600/70 sm:size-9" />
              ) : (
                <RewardIcon
                  className={`size-6 sm:size-9 ${
                    isClaimable ? "kp-gift-claimable text-[#c45a23]" : "text-[#e89362]"
                  }`}
                />
              )
            ) : isEarned ? (
              <Image
                src="/kanto-logo.png"
                alt=""
                width={96}
                height={96}
                className="size-11 object-contain sm:size-20"
              />
            ) : isInProgress ? (
              <span className="relative text-[10px] font-bold text-[#7a2f14] sm:text-sm">
                ₱{Math.round(pendingStampAmount)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Once the card is completely filled (every slot in this cycle earned),
 * any reward tier the customer qualified for along the way but never had
 * claimed — most commonly because claiming a reward only resets the cycle
 * once the FINAL tier is claimed, so an earlier tier can sit unclaimed
 * all the way to a full card — gets called out here so it isn't missed
 * once it's no longer sitting inline in the grid above.
 */
function UnclaimedRewardsCallout({
  points,
  rewardTiers,
  claimedRewardStamps,
}: {
  points: number;
  rewardTiers: RewardTier[];
  claimedRewardStamps: number[];
}) {
  const maxStamps = rewardTiers.length > 0 ? Math.max(...rewardTiers.map((r) => r.stamps)) : 0;
  const isCardCompleted = maxStamps > 0 && points >= maxStamps;
  const claimedStamps = new Set(claimedRewardStamps);
  const unclaimedRewards = rewardTiers
    .map((reward, index) => ({ reward, index }))
    .filter(({ reward }) => points >= reward.stamps && !claimedStamps.has(reward.stamps));

  if (!isCardCompleted || unclaimedRewards.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-xl border-2 border-dashed border-[#ffd680] bg-white/10 p-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#fff4d5]/90">
        Unclaimed reward{unclaimedRewards.length === 1 ? "" : "s"} — show this at checkout
      </p>
      {unclaimedRewards.map(({ reward, index }) => {
        const { Icon } = getRewardVisual(index, rewardTiers.length);
        return (
          <div
            key={reward.stamps}
            className="flex items-center gap-2 rounded-lg bg-[#fff4d5]/95 px-3 py-2 text-[#7a2f14]"
          >
            <Icon className="kp-gift-claimable size-5 shrink-0 text-[#c45a23]" />
            <span className="text-sm font-semibold">{reward.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Explains what each reward-slot icon in the StampGrid above means. */
function RewardLegend({ rewardTiers }: { rewardTiers: RewardTier[] }) {
  if (rewardTiers.length === 0) return null;

  const entries = [rewardTiers[0], rewardTiers[rewardTiers.length - 1]]
    .filter((reward, index, all) => all.findIndex((item) => item.stamps === reward.stamps) === index)
    .map((reward) => ({
      reward,
      ...getRewardVisual(
        rewardTiers.findIndex((item) => item.stamps === reward.stamps),
        rewardTiers.length
      ),
    }));

  return (
    <div className="mt-3 grid gap-1.5 rounded-xl bg-white/10 p-2.5">
      {entries.map(({ reward, Icon, label, description }) => (
        <div key={reward.stamps} className="flex items-center gap-2 text-xs text-[#fff4d5]/90">
          <Icon className="size-4 shrink-0 text-[#fff4d5]" />
          <span>
            <span className="font-semibold">{label}</span> — {description}
          </span>
        </div>
      ))}
    </div>
  );
}

function CardHeaderRow() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Image
          src="/kanto-logo.png"
          alt="Kanto't Pakpakan"
          width={56}
          height={56}
          className="size-9 rounded-full bg-white object-contain p-1 shadow-sm sm:size-10"
          priority
        />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#fff4d5]/80">
          <span className="lowercase">e</span>Loyalty Card
        </p>
      </div>
      <RotateCw className="size-4 shrink-0 text-[#fff4d5]/60" aria-hidden="true" />
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function downloadLoyaltyCardImage(loyaltyCode: string, displayName: string, email: string) {
  const width = 640;
  const height = 900;
  const padding = 48;

  const logoSize = 72;
  const qrBoxY = padding + logoSize + 224;
  const qrBoxWidth = width - padding * 2;
  const qrBoxHeight = height - qrBoxY - padding;
  const qrSize = Math.min(qrBoxWidth, qrBoxHeight) - 96;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    await document.fonts.load("italic 700 44px Caveat");
  } catch {
    // Fall back to the generic cursive family below if Caveat isn't ready.
  }

  // Generate the QR at exactly the size it will be drawn at, rather than
  // scaling up the small on-screen one — avoids any blur that could hurt
  // scannability.
  const [logo, qr] = await Promise.all([
    loadImage("/kanto-logo.png"),
    QRCode.toDataURL(loyaltyCode, { width: Math.round(qrSize), margin: 1 }).then(loadImage),
  ]);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fb8428");
  gradient.addColorStop(1, "#c45a23");
  roundedRectPath(ctx, 0, 0, width, height, 32);
  ctx.fillStyle = gradient;
  ctx.fill();

  roundedRectPath(ctx, padding, padding, logoSize, logoSize, logoSize / 2);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(logo, padding + 4, padding + 4, logoSize - 8, logoSize - 8);
  ctx.restore();

  ctx.fillStyle = "rgba(255, 244, 213, 0.85)";
  ctx.font = "700 16px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("ELOYALTY CARD", padding + logoSize + 16, padding + logoSize / 2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 52px sans-serif";
  ctx.fillText("KP CARD", padding, padding + logoSize + 70);

  ctx.fillStyle = "rgba(255, 244, 213, 0.9)";
  ctx.font = "400 18px sans-serif";
  ctx.fillText("This card belongs to:", padding, padding + logoSize + 110);

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 700 44px Caveat, cursive";
  ctx.fillText(displayName, padding, padding + logoSize + 160);

  ctx.fillStyle = "rgba(255, 244, 213, 0.85)";
  ctx.font = "400 17px sans-serif";
  ctx.fillText(email, padding, padding + logoSize + 192);

  roundedRectPath(ctx, padding, qrBoxY, qrBoxWidth, qrBoxHeight, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const qrX = padding + (qrBoxWidth - qrSize) / 2;
  const qrY = qrBoxY + 40;
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#7a2f14";
  ctx.font = "700 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Show this at checkout", width / 2, qrY + qrSize + 36);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "kp-loyalty-card.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function FlipHint({ label }: { label: string }) {
  return (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#fff4d5]/70">
      <RotateCw className="size-3.5" />
      {label}
    </p>
  );
}

export function LoggedOutCardHero({
  onLogin,
}: {
  onLogin: () => void;
}) {
  const cardFace = "grid h-full content-start gap-1 rounded-2xl bg-gradient-to-br from-[#fb8428] to-[#c45a23] p-5 text-[#fff4d5] shadow-lg sm:p-7";

  const front = (
    <div className={cardFace}>
      <CardHeaderRow />
      <p className="mt-3 text-center text-3xl font-black tracking-wide text-white sm:text-4xl">
        KP CARD
      </p>
      <div className="mt-3 grid justify-items-center text-center">
        <p className="text-base text-[#fff4d5]/90 sm:text-lg">This card belongs to:</p>
        <p
          className="mt-1 border-b-4 border-[#fff4d5]/60 pb-1 text-4xl italic text-white/40 sm:text-5xl"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Your name here
        </p>
      </div>
      <div className="mt-3 grid w-40 place-items-center gap-1 justify-self-center rounded-2xl border-2 border-dashed border-white/30 bg-white/10 p-3">
        <QrCode className="size-16 text-white/50" />
        <p className="text-center text-xs font-semibold text-[#fff4d5]/80">
          Sign up to get your QR code
        </p>
      </div>
      <FlipHint label="Tap or swipe to see the stamp card" />
    </div>
  );

  const back = (
    <div className={cardFace}>
      <CardHeaderRow />
      <div className="mt-5">
        <StampGrid
          points={0}
          claimedRewardStamps={[]}
          rewardTiers={[]}
          pendingStampAmount={0}
          spendPerStamp={200}
        />
      </div>
      <p className="mt-3 text-center text-sm leading-relaxed text-[#fff4d5]/90 sm:text-base">
        Log in to start collecting stamps every time you order — every ₱200 spent earns a
        stamp toward free drinks and free meals.
      </p>
      <FlipHint label="Tap or swipe to see your QR code" />
    </div>
  );

  return (
    <div className="grid gap-6">
      <FlippableCard front={front} back={back} />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onLogin}
          className={`${actionButtonBase} ${actionButtonSolid}`}
        >
          <LogIn className="size-4" />
          Login
        </button>
      </div>
    </div>
  );
}

export function LoggedInCardHero({
  card,
  qrDataUrl,
  onLogout,
  flipToBackSignal,
  flipHintSignal,
}: {
  card: CustomerLoyaltyCard;
  qrDataUrl: string;
  onLogout: () => void;
  flipToBackSignal?: number;
  flipHintSignal?: number;
}) {
  const points = card.loyaltyPoints;
  const cardFace = "grid h-full content-start gap-1 rounded-2xl bg-gradient-to-br from-[#fb8428] to-[#c45a23] p-5 text-[#fff4d5] shadow-lg sm:p-7";

  const front = (
    <div className={cardFace}>
      <CardHeaderRow />
      <p className="mt-3 text-center text-3xl font-black tracking-wide text-white sm:text-4xl">
        KP CARD
      </p>
      <div className="mt-3 grid justify-items-center text-center">
        <p className="text-base text-[#fff4d5]/90 sm:text-lg">This card belongs to:</p>
        <p
          className="mt-1 border-b-4 border-[#fff4d5]/60 pb-1 text-4xl italic text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {card.displayName}
        </p>
      </div>
      <div className="mt-3 grid w-40 place-items-center gap-1 justify-self-center rounded-2xl bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, generated server-side, not eligible for next/image optimization */}
        <img src={qrDataUrl} alt="Your loyalty QR code" width={144} height={144} />
        <p className="text-xs font-semibold text-[#7a2f14]">Show this at checkout</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            downloadLoyaltyCardImage(card.loyaltyCode, card.displayName, card.email);
          }}
          className="flex items-center gap-1.5 rounded-full bg-[#fff4d5] px-3 py-1.5 text-xs font-semibold text-[#7a2f14] transition hover:bg-[#ffe9bd]"
        >
          <Download className="size-3.5" />
          Download QR
        </button>
      </div>
      <FlipHint label="Tap or swipe to see your stamps" />
    </div>
  );

  const back = (
    <div className={cardFace}>
      <CardHeaderRow />
      <div className="mt-5">
        <StampGrid
          points={points}
          claimedRewardStamps={card.claimedRewardStamps}
          rewardTiers={card.rewardTiers}
          pendingStampAmount={card.pendingStampAmount}
          spendPerStamp={card.spendPerStamp}
        />
        <UnclaimedRewardsCallout
          points={points}
          rewardTiers={card.rewardTiers}
          claimedRewardStamps={card.claimedRewardStamps}
        />
        <RewardLegend rewardTiers={card.rewardTiers} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm font-bold sm:text-base">
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
      <FlipHint label="Tap or swipe to see your QR code" />
    </div>
  );

  return (
    <div className="grid gap-4">
      <FlippableCard
        front={front}
        back={back}
        flipToBackSignal={flipToBackSignal}
        autoFlipHintSignal={flipHintSignal}
      />

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

      {card.latestTransactions.length > 0 ? (
        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold">
            <History className="size-4 text-primary" />
            Recent stamp activity
          </div>
          <div className="grid gap-2">
            {card.latestTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 font-medium">
                  <span>
                    {transaction.type === "redeemed"
                      ? "Reward claimed"
                      : `${transaction.points > 0 ? "+" : ""}${transaction.points} stamp${
                          Math.abs(transaction.points) === 1 ? "" : "s"
                        }`}
                  </span>
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">
                  {transaction.remarks ?? transaction.rewardName ?? transaction.type}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
