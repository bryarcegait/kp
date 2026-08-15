import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.user.findUnique({
          where: { username },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.fullName,
          username: user.username,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.permissions.map((rp) => rp.permission.key),
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.username = (user as { username: string }).username;
        token.roleId = (user as { roleId: string }).roleId;
        token.roleName = (user as { roleName: string }).roleName;
        token.permissions = (user as { permissions: string[] }).permissions;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.roleId = token.roleId as string;
      session.user.roleName = token.roleName as string;
      session.user.permissions = token.permissions as string[];
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      return session;
    },
  },
});
