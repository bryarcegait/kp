import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "kp_customer_session";
// Customers stay logged in until they explicitly log out — 10 years is the
// practical stand-in for "no expiration" (JWTs require some expiry value).
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

function getSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET;
  if (!secret) throw new Error("CUSTOMER_AUTH_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export async function createCustomerSession(customerId: string) {
  const token = await new SignJWT({ customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getCustomerSession(): Promise<{ customerId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.customerId !== "string") return null;
    return { customerId: payload.customerId };
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
