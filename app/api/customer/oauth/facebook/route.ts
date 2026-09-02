import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { setOAuthState } from "@/lib/customer-oauth";

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const clientId = process.env.FACEBOOK_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_unconfigured", baseUrl));
  }

  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/customer/oauth/facebook/callback`,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
