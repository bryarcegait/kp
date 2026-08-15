import { hasPermission } from "@/lib/permissions";

type ScheduleSessionUser = {
  roleName?: string;
  permissions?: string[];
};

function isScheduleManagerRole(user: ScheduleSessionUser | undefined) {
  return user?.roleName === "System Admin" || user?.roleName === "Manager";
}

export function canViewSchedule(user: ScheduleSessionUser | undefined) {
  return (
    hasPermission(user?.permissions, "schedule.view") ||
    isScheduleManagerRole(user)
  );
}

export function canManageSchedule(user: ScheduleSessionUser | undefined) {
  return (
    hasPermission(user?.permissions, "schedule.manage") ||
    isScheduleManagerRole(user)
  );
}
