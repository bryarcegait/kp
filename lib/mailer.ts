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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kantotpakpakan.com";
  const logoUrl = `${baseUrl}/kanto-logo.png`;

  const { error } = await getResend().emails.send({
    from,
    to,
    subject: "Verify your Kanto't Pakpakan eLoyalty account",
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fff8ef; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(122, 47, 20, 0.12);">
              <tr>
                <td align="center" style="background: #c45a23; padding: 32px 24px;">
                  <img src="${logoUrl}" width="72" height="72" alt="Kanto't Pakpakan" style="display: block; border-radius: 50%; background: #ffffff; padding: 4px;" />
                  <p style="margin: 16px 0 0; color: #fff4d5; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">
                    eLoyalty Card
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 28px;">
                  <h1 style="margin: 0 0 12px; color: #7a2f14; font-size: 22px;">Welcome to Kanto't Pakpakan!</h1>
                  <p style="margin: 0 0 24px; color: #4a3226; font-size: 15px; line-height: 1.6;">
                    You're one click away from collecting stamps every time you order — every ₱200 spent earns a stamp toward free drinks and free meals.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                    <tr>
                      <td align="center" style="border-radius: 999px; background: #c45a23;">
                        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 999px;">
                          Verify my email
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 8px; color: #9a8579; font-size: 12px; line-height: 1.6;">
                    If the button doesn't work, copy and paste this link into your browser:<br />
                    <a href="${verifyUrl}" style="color: #c45a23; word-break: break-all;">${verifyUrl}</a>
                  </p>
                  <p style="margin: 0; color: #9a8579; font-size: 12px;">This link expires in 24 hours.</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 24px; background: #fff4d5;">
                  <p style="margin: 0; color: #7a2f14; font-size: 12px;">Kanto't Pakpakan &middot; kantotpakpakan.com</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send verification email: ${error.message}`);
  }
}
