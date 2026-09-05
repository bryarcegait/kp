import Link from "next/link";
import { cn } from "@/lib/utils";

const PAYROLL_TABS = [
  { title: "Employee Rates", href: "/payroll/employee-rates" },
  { title: "Attendance Upload", href: "/payroll/attendance-upload" },
  { title: "Employee Earnings", href: "/payroll/employee-earnings" },
];

export function PayrollSubnav({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-1">
      {PAYROLL_TABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            active === item.href && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {item.title}
        </Link>
      ))}
    </div>
  );
}