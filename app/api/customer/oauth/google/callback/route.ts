import { NextRequest, NextResponse } from "next/server";
import { createCustomerSession } from "@/lib/customer-auth";
import { consumeOAuthState } from "@/lib/customer-oauth";
import { findOrCreateOAuthCustomer } from "@/app/customer-loyalty-actions";

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const expectedState = await consumeOAuthState();

  if (oauthError || !code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/?oauthError=google_failed", baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?oauthError=google_unconfigured", baseUrl));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/customer/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?oauthError=google_failed", baseUrl));
  }
  const tokens: { access_token?: string } = await tokenResponse.json();
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/?oauthError=google_failed", baseUrl));
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/?oauthError=google_failed", baseUrl));
  }
  const profile: { sub: string; email?: string; email_verified?: boolean; name?: string } =
    await profileResponse.json();

  if (!profile.email || !profile.email_verified) {
    return NextResponse.redirect(new URL("/?oauthError=google_email_unverified", baseUrl));
  }

  const customer = await findOrCreateOAuthCustomer({
    provider: "google",
    providerId: profile.sub,
    email: profile.email,
    displayName: profile.name || profile.email.split("@")[0],
  });

  await createCustomerSession(customer.id);

  return NextResponse.redirect(new URL("/?loggedIn=1", baseUrl));
}
