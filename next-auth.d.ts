import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      roleId: string;
      roleName: string;
      permissions: string[];
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    roleId: string;
    roleName: string;
    permissions: string[];
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    roleId: string;
    roleName: string;
    permissions: string[];
    mustChangePassword: boolean;
  }
}
