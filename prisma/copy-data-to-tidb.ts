import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";
import { toMariaDbUrl } from "../lib/db-url";

function createClient(databaseUrl: string) {
  return new PrismaClient({
    adapter: new PrismaMariaDb(toMariaDbUrl(databaseUrl)),
  });
}

function requireUrl(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sameDatabase(sourceUrl: string, targetUrl: string) {
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);

  return (
    source.hostname === target.hostname &&
    source.port === target.port &&
    source.pathname === target.pathname
  );
}

async function clearTargetDatabase(target: PrismaClient) {
  await target.dailyCashAdjustment.deleteMany();
  await target.dailyCashSummary.deleteMany();
  await target.dailyPosReport.deleteMany();
  await target.employeeSchedule.deleteMany();
  await target.expense.deleteMany();
  await target.rolePermission.deleteMany();
  await target.user.deleteMany();
  await target.role.deleteMany();
  await target.permission.deleteMany();
}

async function main() {
  const sourceUrl = requireUrl(
    "LOCAL_DATABASE_URL",
    process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL
  );
  const targetUrl = requireUrl("TIDB_DATABASE_URL", process.env.TARGET_DATABASE_URL);

  if (sameDatabase(sourceUrl, targetUrl)) {
    throw new Error("Source and target database URLs point to the same database.");
  }

  const source = createClient(sourceUrl);
  const target = createClient(targetUrl);

  try {
    if (process.env.CLEAR_TIDB_TARGET === "true") {
      await clearTargetDatabase(target);
    }

    const [
      roles,
      permissions,
      users,
      rolePermissions,
      expenses,
      summaries,
      adjustmentItems,
      schedules,
      posReports,
    ] = await Promise.all([
      source.role.findMany(),
      source.permission.findMany(),
      source.user.findMany(),
      source.rolePermission.findMany(),
      source.expense.findMany(),
      source.dailyCashSummary.findMany(),
      source.dailyCashAdjustment.findMany(),
      source.employeeSchedule.findMany(),
      source.dailyPosReport.findMany(),
    ]);

    for (const role of roles) {
      await target.role.upsert({
        where: { id: role.id },
        update: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
        create: role,
      });
    }

    for (const permission of permissions) {
      await target.permission.upsert({
        where: { id: permission.id },
        update: {
          key: permission.key,
          label: permission.label,
          module: permission.module,
          createdAt: permission.createdAt,
        },
        create: permission,
      });
    }

    for (const user of users) {
      await target.user.upsert({
        where: { id: user.id },
        update: {
          username: user.username,
          passwordHash: user.passwordHash,
          fullName: user.fullName,
          birthday: user.birthday,
          dateHired: user.dateHired,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          roleId: user.roleId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        create: user,
      });
    }

    for (const rolePermission of rolePermissions) {
      await target.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rolePermission.roleId,
            permissionId: rolePermission.permissionId,
          },
        },
        update: {},
        create: rolePermission,
      });
    }

    for (const expense of expenses) {
      await target.expense.upsert({
        where: { id: expense.id },
        update: {
          name: expense.name,
          amount: expense.amount,
          remarks: expense.remarks,
          receiptUrl: expense.receiptUrl,
          createdById: expense.createdById,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
        create: expense,
      });
    }

    for (const summary of summaries) {
      await target.dailyCashSummary.upsert({
        where: { id: summary.id },
        update: {
          businessDate: summary.businessDate,
          startingAmount: summary.startingAmount,
          adjustments: summary.adjustments,
          cashOnHand: summary.cashOnHand,
          openingCashForTomorrow: summary.openingCashForTomorrow,
          notes: summary.notes,
          createdById: summary.createdById,
          updatedById: summary.updatedById,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        },
        create: summary,
      });
    }

    for (const adjustment of adjustmentItems) {
      await target.dailyCashAdjustment.upsert({
        where: { id: adjustment.id },
        update: {
          summaryId: adjustment.summaryId,
          name: adjustment.name,
          amount: adjustment.amount,
          createdAt: adjustment.createdAt,
          updatedAt: adjustment.updatedAt,
        },
        create: adjustment,
      });
    }

    for (const schedule of schedules) {
      await target.employeeSchedule.upsert({
        where: { id: schedule.id },
        update: {
          scheduleDate: schedule.scheduleDate,
          userId: schedule.userId,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
        },
        create: schedule,
      });
    }

    for (const report of posReports) {
      const paymentBreakdown = (report.paymentBreakdown ?? []) as Prisma.InputJsonValue;

      await target.dailyPosReport.upsert({
        where: { id: report.id },
        update: {
          businessDate: report.businessDate,
          grossSales: report.grossSales,
          deliveryFeeTotal: report.deliveryFeeTotal,
          netSales: report.netSales,
          cashTotal: report.cashTotal,
          cardTotal: report.cardTotal,
          otherTotal: report.otherTotal,
          gcashTotal: report.gcashTotal,
          receiptCount: report.receiptCount,
          paymentCount: report.paymentCount,
          paymentBreakdown,
          fetchedAt: report.fetchedAt,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
        create: {
          id: report.id,
          businessDate: report.businessDate,
          grossSales: report.grossSales,
          deliveryFeeTotal: report.deliveryFeeTotal,
          netSales: report.netSales,
          cashTotal: report.cashTotal,
          cardTotal: report.cardTotal,
          otherTotal: report.otherTotal,
          gcashTotal: report.gcashTotal,
          receiptCount: report.receiptCount,
          paymentCount: report.paymentCount,
          paymentBreakdown,
          fetchedAt: report.fetchedAt,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
      });
    }

    console.log(
      JSON.stringify(
        {
          roles: roles.length,
          permissions: permissions.length,
          users: users.length,
          rolePermissions: rolePermissions.length,
          expenses: expenses.length,
          cashSummaries: summaries.length,
          cashAdjustments: adjustmentItems.length,
          schedules: schedules.length,
          posReports: posReports.length,
        },
        null,
        2
      )
    );
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
