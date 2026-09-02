import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/?verifyError=missing", baseUrl));
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const customer = await db.customer.findUnique({ where: { verificationTokenHash: tokenHash } });

  if (
    !customer ||
    !customer.verificationTokenExpiresAt ||
    customer.verificationTokenExpiresAt < new Date()
  ) {
    return NextResponse.redirect(new URL("/?verifyError=invalid", baseUrl));
  }

  await db.customer.update({
    where: { id: customer.id },
    data: {
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    },
  });

  return NextResponse.redirect(new URL("/?verified=1", baseUrl));
}
