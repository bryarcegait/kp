import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no providers, no Prisma) used by middleware for route
// protection. The full config with the Credentials provider + DB access
// lives in lib/auth.ts and only runs in the Node.js runtime.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnPublicMenu = nextUrl.pathname === "/";
      const isOnChangePassword = nextUrl.pathname === "/change-password";
      const mustChangePassword = auth?.user?.mustChangePassword;

      if (isOnLogin) {
        return true;
      }

      if (isOnPublicMenu) return true;

      if (isLoggedIn && mustChangePassword && !isOnChangePassword) {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
