import QRCode from "qrcode";
import { getCurrentCustomerCard } from "@/app/customer-loyalty-actions";
import { LoyaltyHomeClient } from "@/components/loyalty-card/loyalty-home-client";

export const dynamic = "force-dynamic";

export default async function LoyaltyHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ oauthError?: string; loggedIn?: string }>;
}) {
  const params = await searchParams;
  const card = await getCurrentCustomerCard();
  const qrDataUrl = card
    ? await QRCode.toDataURL(card.loyaltyCode, { width: 240, margin: 1 })
    : null;

  return (
    <main className="min-h-screen bg-[#fff8ef] text-[#281713]">
      <LoyaltyHomeClient
        initialCard={card}
        qrDataUrl={qrDataUrl}
        initialOAuthError={params?.oauthError ?? null}
        justLoggedIn={params?.loggedIn === "1"}
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
        facebookEnabled={Boolean(process.env.FACEBOOK_CLIENT_ID)}
      />
    </main>
  );
}
