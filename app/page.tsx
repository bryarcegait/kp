import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { Utensils } from "lucide-react";
import { getCurrentCustomerCard } from "@/app/customer-loyalty-actions";
import { LoyaltyHomeClient } from "@/components/loyalty-card/loyalty-home-client";

export const dynamic = "force-dynamic";

export default async function LoyaltyHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string; verifyError?: string }>;
}) {
  const params = await searchParams;
  const card = await getCurrentCustomerCard();
  const qrDataUrl = card
    ? await QRCode.toDataURL(card.loyaltyCode, { width: 240, margin: 1 })
    : null;

  return (
    <main className="min-h-screen bg-[#fff8ef] text-[#281713]">
      <header className="sticky top-0 z-30 border-b border-[#e7c7a8] bg-[#fff8ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/kanto-logo.png"
              alt="Kanto't Pakpakan"
              width={44}
              height={44}
              className="size-11 rounded-full bg-white object-contain p-1 shadow-sm"
              priority
            />
            <div>
              <h1 className="text-lg font-black uppercase tracking-wide">Kanto&apos;t Pakpakan</h1>
              <p className="text-xs font-medium text-[#8b3f1d]">eLoyalty Card</p>
            </div>
          </div>
          <Link
            href="/order"
            className="flex h-10 items-center gap-2 rounded-lg bg-[#c45a23] px-4 text-sm font-semibold text-white hover:bg-[#a94618]"
          >
            <Utensils className="size-4" />
            View Menu
          </Link>
        </div>
      </header>

      <LoyaltyHomeClient
        initialCard={card}
        qrDataUrl={qrDataUrl}
        initialVerified={params?.verified === "1"}
        initialVerifyError={params?.verifyError ?? null}
      />
    </main>
  );
}
