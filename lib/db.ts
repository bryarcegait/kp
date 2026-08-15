import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { toMariaDbUrl } from "@/lib/db-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaMariaDb(toMariaDbUrl(process.env.DATABASE_URL!));

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
