import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { InstallShortcutPrompt } from "@/components/layout/install-shortcut-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { hasPermission } from "@/lib/permissions";
import { canViewCashSummary } from "@/lib/cash-summary-access";
import { canViewSchedule } from "@/lib/schedule-access";
import { canViewBank } from "@/lib/bank-access";
import { canAwardLoyalty } from "@/lib/loyalty-access";
import { canViewMonthlyReport } from "@/lib/monthly-report-access";

const STAFF_VISIBLE_HREFS = new Set(["/dashboard", "/my-calendar", "/loyalty"]);

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  if (currentUser?.mustChangePassword) redirect("/change-password");

  const permissions = session?.user.permissions ?? [];

  const visibleHrefs = NAV_ITEMS.filter((item) => {
    if (session.user.roleName === "Staff") return STAFF_VISIBLE_HREFS.has(item.href);
    if (item.href === "/cash-summary") return canViewCashSummary(session?.user);
    if (item.href === "/bank") return canViewBank(session?.user);
    if (item.href === "/monthly-report") return canViewMonthlyReport(session?.user);
    if (item.href === "/loyalty") return canAwardLoyalty(session?.user);
    if (item.href === "/schedule") return canViewSchedule(session?.user);
    return !item.permission || hasPermission(permissions, item.permission);
  }).map((item) => item.href);

  return (
    <SidebarProvider>
      <InstallShortcutPrompt userId={session.user.id} />
      <AppSidebar visibleHrefs={visibleHrefs} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 shadow-sm">
          <SidebarTrigger className="-ml-1 rounded-full bg-background text-primary hover:bg-primary hover:text-primary-foreground" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
          <span className="flex-1 truncate text-sm font-medium sm:hidden">
            Kanto&apos;t Pakpakan
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <UserMenu fullName={session.user.name ?? session.user.username} roleName={session.user.roleName} />
            ) : null}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 bg-background p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
