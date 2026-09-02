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
    return NextResponse.redirect(new URL("/?oauthError=facebook_failed", baseUrl));
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_unconfigured", baseUrl));
  }

  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${baseUrl}/api/customer/oauth/facebook/callback`,
  });
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`
  );
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_failed", baseUrl));
  }
  const tokens: { access_token?: string } = await tokenResponse.json();
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_failed", baseUrl));
  }

  const profileParams = new URLSearchParams({
    fields: "id,name,email",
    access_token: tokens.access_token,
  });
  const profileResponse = await fetch(`https://graph.facebook.com/me?${profileParams}`);
  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_failed", baseUrl));
  }
  const profile: { id: string; email?: string; name?: string } = await profileResponse.json();

  // Facebook only returns an email when the user granted that permission and
  // has a verified email on file — there's no separate "verified" flag to
  // check the way Google has one.
  if (!profile.email) {
    return NextResponse.redirect(new URL("/?oauthError=facebook_no_email", baseUrl));
  }

  const customer = await findOrCreateOAuthCustomer({
    provider: "facebook",
    providerId: profile.id,
    email: profile.email,
    displayName: profile.name || profile.email.split("@")[0],
  });

  await createCustomerSession(customer.id);

  return NextResponse.redirect(new URL("/", baseUrl));
}
