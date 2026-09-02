"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Download,
  Gift,
  History,
  LogIn,
  LogOut,
  QrCode,
  RotateCw,
  UserPlus,
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

/**
 * Stamps grid for the "back" of the card. A slot's gift icon communicates
 * three states: not yet reached (dim), currently claimable — points already
 * cover it (bright + pulsing), or claimed — lifetimePoints crossed this
 * threshold before but the current balance no longer covers it, which only
 * happens after a redemption (muted checkmark). There's no separate
 * "claimed" flag in the schema, so this is inferred from the two point
 * totals we do have.
 */
function StampGrid({
  points,
  lifetimePoints,
  rewardTiers,
}: {
  points: number;
  lifetimePoints: number;
  rewardTiers: { stamps: number; name: string }[];
}) {
  const maxStamps = rewardTiers.length > 0 ? Math.max(...rewardTiers.map((r) => r.stamps)) : 10;
  const rewardAtStamp = new Set(rewardTiers.map((r) => r.stamps));

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {Array.from({ length: maxStamps }).map((_, index) => {
        const stampNumber = index + 1;
        const isEarned = points >= stampNumber;
        const isRewardSlot = rewardAtStamp.has(stampNumber);
        const isClaimable = isRewardSlot && points >= stampNumber;
        const isClaimed = isRewardSlot && !isClaimable && lifetimePoints >= stampNumber;

        return (
          <div
            key={stampNumber}
            className={`grid aspect-square place-items-center rounded-xl bg-[#fff4d5] ${
              isClaimable ? "ring-4 ring-[#ffd680]" : ""
            }`}
          >
            {isRewardSlot ? (
              isClaimed ? (
                <CheckCircle2 className="size-6 text-emerald-600/70 sm:size-9" />
              ) : (
                <Gift
                  className={`size-6 sm:size-9 ${
                    isClaimable ? "kp-gift-claimable text-[#c45a23]" : "text-[#e89362]"
                  }`}
                />
              )
            ) : isEarned ? (
              <Image
                src="/kanto-logo.png"
                alt=""
                width={72}
                height={72}
                className="size-6 object-contain sm:size-9"
              />
            ) : null}
          </div>
        );
      })}
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
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
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
        <StampGrid points={0} lifetimePoints={0} rewardTiers={[]} />
      </div>
      <p className="mt-3 text-center text-sm leading-relaxed text-[#fff4d5]/90 sm:text-base">
        Register to start collecting stamps every time you order — every ₱200 spent earns a
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
        <StampGrid points={points} lifetimePoints={card.lifetimePoints} rewardTiers={card.rewardTiers} />
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
      <FlippableCard front={front} back={back} />

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
        </div>
      ) : null}
    </div>
  );
}
