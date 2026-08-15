import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getLocalDateRange, parseInputDate } from "@/lib/dates";
import { ExpensesClient, type ExpenseRow } from "@/components/expenses/expenses-client";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const permissions = session.user.permissions;
  const canView = hasPermission(permissions, "expenses.view");
  if (!canView) redirect("/");

  const canViewAll = hasPermission(permissions, "expenses.view_all");
  const canCreate = hasPermission(permissions, "expenses.create");
  const canEdit = hasPermission(permissions, "expenses.edit");
  const canDelete = hasPermission(permissions, "expenses.delete");
  const params = await searchParams;
  const selectedDate = parseInputDate(
    Array.isArray(params?.date) ? params.date[0] : params?.date
  );
  const { start, end } = getLocalDateRange(selectedDate);

  const expenses = await db.expense.findMany({
    where: {
      ...(canViewAll ? {} : { createdById: session.user.id }),
      createdAt: { gte: start, lt: end },
    },
    include: { createdBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount.toString(),
    remarks: e.remarks,
    receiptUrl: e.receiptUrl,
    createdAt: e.createdAt.toISOString(),
    createdByName: e.createdBy.fullName,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">Track restaurant expenses and receipts.</p>
      </div>
      <ExpensesClient
        expenses={rows}
        selectedDate={selectedDate}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canViewAll={canViewAll}
      />
    </div>
  );
}
