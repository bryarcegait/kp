import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDatabaseInfo() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      configured: false,
      host: null,
      port: null,
      database: null,
    };
  }

  try {
    const url = new URL(databaseUrl);
    return {
      configured: true,
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ""),
    };
  } catch {
    return {
      configured: true,
      host: "invalid-url",
      port: null,
      database: null,
    };
  }
}

export async function GET(request: NextRequest) {
  const diagnosticKey = process.env.DEPLOY_DIAGNOSTIC_KEY;
  const requestKey = request.headers.get("x-diagnostic-key");

  if (!diagnosticKey || requestKey !== diagnosticKey) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const database = getDatabaseInfo();

  try {
    const [userCount, adminUser] = await Promise.all([
      db.user.count(),
      db.user.findUnique({
        where: { username: "bryarcega" },
        select: {
          isActive: true,
          mustChangePassword: true,
          role: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      env: {
        databaseUrl: database.configured,
        authSecret: Boolean(process.env.AUTH_SECRET),
        authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
        blobToken: Boolean(
          process.env.BLOB_READ_WRITE_TOKEN ||
            process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
        ),
        loyverseToken: Boolean(process.env.LOYVERSE_ACCESS_TOKEN),
      },
      database,
      data: {
        userCount,
        bryarcega: adminUser
          ? {
              exists: true,
              isActive: adminUser.isActive,
              mustChangePassword: adminUser.mustChangePassword,
              role: adminUser.role.name,
            }
          : { exists: false },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        env: {
          databaseUrl: database.configured,
          authSecret: Boolean(process.env.AUTH_SECRET),
          authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
        },
        database,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
