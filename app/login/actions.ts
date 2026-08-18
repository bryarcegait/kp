"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("Login failed", {
        type: error.type,
        cause: error.cause?.err?.message,
      });

      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid username or password.";
        default:
          return "Login server error. Please check Vercel environment variables.";
      }
    }
    throw error;
  }
}
