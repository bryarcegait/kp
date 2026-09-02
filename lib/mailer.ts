import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (resend) return resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY must be set to send email.");

  resend = new Resend(apiKey);
  return resend;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const from = process.env.RESEND_FROM || "Kanto't Pakpakan <onboarding@resend.dev>";

  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    console.log(`[dev] Verification link for ${to}: ${verifyUrl}`);
    return;
  }

  const { error } = await getResend().emails.send({
    from,
    to,
    subject: "Verify your Kanto't Pakpakan eLoyalty account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #c45a23;">Welcome to Kanto't Pakpakan eLoyalty!</h2>
        <p>Click the button below to verify your email and start collecting stamps.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background: #c45a23; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verify my email
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br />${verifyUrl}</p>
        <p style="color: #666; font-size: 13px;">This link expires in 24 hours.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send verification email: ${error.message}`);
  }
}
