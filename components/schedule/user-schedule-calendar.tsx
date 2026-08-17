"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MinusCircle,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { toggleMyScheduleDate } from "@/app/(app)/my-calendar/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScheduledEmployee = {
  id: string;
  fullName: string;
};

type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
};

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function addMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const lastDay = new Date(year, monthNumber, 0);
  const start = new Date(firstDay);
  const firstDayOffset = (firstDay.getDay() + 6) % 7;
  start.setDate(firstDay.getDate() - firstDayOffset);

  const end = new Date(lastDay);
  const lastDayOffset = (lastDay.getDay() + 6) % 7;
  end.setDate(lastDay.getDate() + (6 - lastDayOffset));

  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = new Date(cursor);
    days.push({
      key: formatInputDate(date),
      date,
      inMonth: date.getMonth() === firstDay.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatFullDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function sortEmployees(employees: ScheduledEmployee[]) {
  return [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function UserScheduleCalendar({
  month,
  currentUser,
  scheduleByDate,
}: {
  month: string;
  currentUser: ScheduledEmployee;
  scheduleByDate: Record<string, ScheduledEmployee[]>;
}) {
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const today = formatInputDate(new Date());
  const [localSchedule, setLocalSchedule] = useState(scheduleByDate);
  const [savingDates, setSavingDates] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<{
    date: string;
    status: "added" | "removed";
  } | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const isSavingAny = savingDates.size > 0;

  useEffect(() => {
    if (!lastResult) return;

    const timeout = window.setTimeout(() => {
      setLastResult(null);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [lastResult]);

  function setDayUserStatus(
    date: string,
    status: "added" | "removed",
    user: ScheduledEmployee
  ) {
    setLocalSchedule((current) => {
      const employees = current[date] ?? [];
      const nextEmployees =
        status === "added"
          ? employees.some((employee) => employee.id === user.id)
            ? employees.map((employee) =>
                employee.id === user.id ? user : employee
              )
            : sortEmployees([...employees, user])
          : employees.filter((employee) => employee.id !== user.id);

      return {
        ...current,
        [date]: nextEmployees,
      };
    });
  }

  async function handleToggle(date: string) {
    if (savingDates.has(date)) return;

    const previousEmployees = localSchedule[date] ?? [];
    const wasScheduled = previousEmployees.some(
      (employee) => employee.id === currentUser.id
    );
    const optimisticStatus = wasScheduled ? "removed" : "added";

    setSavingDates((current) => new Set(current).add(date));
    setDayUserStatus(date, optimisticStatus, currentUser);
    const result = await toggleMyScheduleDate(date);
    setSavingDates((current) => {
      const next = new Set(current);
      next.delete(date);
      return next;
    });

    if (result.error) {
      setLocalSchedule((current) => ({
        ...current,
        [date]: previousEmployees,
      }));
      toast.error(result.error);
      return;
    }

    if (!result.status) {
      setLocalSchedule((current) => ({
        ...current,
        [date]: previousEmployees,
      }));
      toast.error("Unable to update schedule.");
      return;
    }

    const user = result.user ?? currentUser;
    setDayUserStatus(date, result.status, user);
    setAnimationKey((current) => current + 1);
    setLastResult({ date, status: result.status });
    toast.success(
      result.status === "added"
        ? `Added to ${formatFullDate(date)}`
        : `Removed from ${formatFullDate(date)}`
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            <CardTitle>{getMonthLabel(month)}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" asChild>
              <Link href={`/my-calendar?month=${addMonths(month, -1)}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/my-calendar?month=${formatInputDate(new Date()).slice(0, 7)}`}>
                Today
              </Link>
            </Button>
            <Button variant="outline" size="icon-sm" asChild>
              <Link href={`/my-calendar?month=${addMonths(month, 1)}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="default">
            <CheckCircle2 className="size-3" /> My schedule
          </Badge>
          <Badge variant="outline">
            <UsersRound className="size-3" /> Coemployees
          </Badge>
          {isSavingAny ? (
            <Badge variant="secondary">
              <Loader2 className="size-3 animate-spin" /> Saving...
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-l border-t text-xs font-medium text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="border-b border-r px-2 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l">
              {days.map((day) => {
                const employees = localSchedule[day.key] ?? [];
                const isMine = employees.some(
                  (employee) => employee.id === currentUser.id
                );
                const isSaving = savingDates.has(day.key);
                const isAnimated = lastResult?.date === day.key;
                const isWarning = employees.length > 0 && employees.length < 5;

                return (
                  <button
                    key={`${day.key}-${isAnimated ? animationKey : "idle"}`}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleToggle(day.key)}
                    aria-label={`${formatFullDate(day.key)}, ${isMine ? "remove" : "add"} my schedule`}
                    className={[
                      "relative flex min-h-36 flex-col border-b border-r p-2 text-left transition-all disabled:cursor-wait disabled:opacity-70",
                      day.inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                      isWarning ? "bg-destructive/10" : "",
                      isMine ? "ring-2 ring-inset ring-primary" : "",
                      today === day.key ? "border-primary" : "",
                      isAnimated ? "kp-user-calendar-success" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold">
                          {day.date.getDate()}
                        </span>
                        {isMine ? (
                          <Badge className="ml-2 align-middle" variant="default">
                            Me
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {isSaving ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <UsersRound className="size-3" />
                        )}
                        {employees.length}
                      </div>
                    </div>

                    {isSaving ? (
                      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Saving
                      </span>
                    ) : null}

                    <div className="mt-3 flex flex-1 flex-col gap-1.5">
                      {employees.map((employee) => (
                        <span
                          key={employee.id}
                          className={[
                            "rounded-md border px-2 py-1 text-xs font-medium leading-snug shadow-sm",
                            employee.id === currentUser.id
                              ? "border-primary/35 bg-primary/10 text-foreground"
                              : "border-border bg-background/80 text-foreground",
                          ].join(" ")}
                        >
                          {employee.fullName}
                        </span>
                      ))}
                    </div>

                    {isAnimated ? (
                      <span className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-center rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-lg kp-user-calendar-toast">
                        {lastResult?.status === "added" ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <MinusCircle className="size-3" />
                        )}
                        {lastResult?.status === "added" ? "Added" : "Removed"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
