import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be set to send email.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const from = process.env.SMTP_FROM || "Kanto't Pakpakan <noreply@kantotpakpakan.com>";

  if (process.env.NODE_ENV !== "production" && (!process.env.SMTP_HOST || !process.env.SMTP_USER)) {
    console.log(`[dev] Verification link for ${to}: ${verifyUrl}`);
    return;
  }

  await getTransporter().sendMail({
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
}
