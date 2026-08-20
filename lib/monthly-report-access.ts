type MonthlyReportUser = {
  roleName?: string | null;
};

export function canViewMonthlyReport(user?: MonthlyReportUser | null) {
  return user?.roleName === "System Admin";
}
