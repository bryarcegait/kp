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

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 8;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

/**
 * Best-effort brute-force guard for customer login, keyed by email.
 * In-memory only — resets on server restart and isn't shared across
 * serverless instances, so it slows down casual brute-forcing rather than
 * guaranteeing a hard cap. Upgrade to a shared store (e.g. Redis/Vercel KV)
 * if this needs to be airtight.
 */
export function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
}
