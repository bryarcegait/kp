import { cookies } from "next/headers";

const STATE_COOKIE_NAME = "kp_oauth_state";
const STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

export async function setOAuthState(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Reads and clears the CSRF state cookie set by `setOAuthState`. */
export async function consumeOAuthState() {
  const cookieStore = await cookies();
  const state = cookieStore.get(STATE_COOKIE_NAME)?.value ?? null;
  cookieStore.delete(STATE_COOKIE_NAME);
  return state;
}
