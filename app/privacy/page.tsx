import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Kanto't Pakpakan",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-10 text-[#281713] sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <div>
          <Link href="/" className="text-sm font-semibold text-[#c45a23] hover:underline">
            &larr; Back to Kanto&apos;t Pakpakan
          </Link>
          <h1 className="mt-3 text-3xl font-black text-[#7a2f14] sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-[#6d4a3a]">Last updated: September 3, 2026</p>
        </div>

        <div className="grid gap-6 text-[#4a3226]">
          <p>
            This Privacy Policy explains how Kanto&apos;t Pakpakan (&quot;we&quot;,
            &quot;us&quot;) collects, uses, and protects information when you use our
            eLoyalty Card program at kantotpakpakan.com.
          </p>

          <Section title="Information We Collect">
            <ul className="grid gap-2 list-disc pl-5">
              <li>
                <strong>Account information:</strong> your name and email address,
                either provided directly or received from Google or Facebook when
                you sign in with those services.
              </li>
              <li>
                <strong>Loyalty activity:</strong> stamps earned, rewards redeemed,
                and the order amounts used to calculate stamps when our staff scan
                your loyalty QR code at checkout.
              </li>
              <li>
                <strong>Session data:</strong> a login session cookie that keeps you
                signed in to your eLoyalty Card until you log out.
              </li>
            </ul>
          </Section>

          <Section title="How We Use Information">
            <ul className="grid gap-2 list-disc pl-5">
              <li>To create and maintain your eLoyalty Card account.</li>
              <li>To track stamps earned and rewards redeemed.</li>
              <li>To verify your identity when you log in.</li>
              <li>To display your loyalty progress and reward history to you.</li>
            </ul>
          </Section>

          <Section title="Signing In With Google or Facebook">
            <p>
              If you choose to sign in with Google or Facebook, we receive your
              name and email address from that provider to create or match your
              eLoyalty account. We never see or store your Google or Facebook
              password. You can review or revoke this access at any time from your
              Google or Facebook account settings.
            </p>
          </Section>

          <Section title="Payment Processing">
            <p>
              Purchases at Kanto&apos;t Pakpakan are processed through our
              point-of-sale system (Loyverse) at the counter. We do not collect or
              store your payment card or e-wallet credentials through the eLoyalty
              Card website — we only record the order amount needed to calculate
              stamps earned.
            </p>
          </Section>

          <Section title="Sharing of Information">
            <p>
              We do not sell your personal information, and we do not share it with
              third parties for their own marketing purposes. Information is only
              shared with service providers who help us operate the eLoyalty
              program (such as our authentication and hosting providers), solely to
              provide that service to us.
            </p>
          </Section>

          <Section title="Data Retention & Deletion">
            <p>
              We keep your account and loyalty activity for as long as your
              account is active. If you&apos;d like your account and associated
              data deleted, contact us using the details below and we&apos;ll
              process your request.
            </p>
          </Section>

          <Section title="Children's Privacy">
            <p>
              Our eLoyalty Card program is not directed at children under 13, and
              we do not knowingly collect personal information from children under
              13.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will be
              posted on this page with an updated &quot;Last updated&quot; date.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about this Privacy Policy or want to request
              access to or deletion of your data, contact us at{" "}
              <a href="mailto:hello@kantotpakpakan.com" className="text-[#c45a23] underline">
                hello@kantotpakpakan.com
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-xl font-bold text-[#7a2f14]">{title}</h2>
      {children}
    </section>
  );
}
