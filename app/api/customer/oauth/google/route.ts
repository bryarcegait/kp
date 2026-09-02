import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { setOAuthState } from "@/lib/customer-oauth";

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/?oauthError=google_unconfigured", baseUrl));
  }

  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/customer/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
