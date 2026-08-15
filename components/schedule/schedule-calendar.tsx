"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Cake,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  copyDaySchedule,
  saveDaySchedule,
} from "@/app/(app)/schedule/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Employee = {
  id: string;
  fullName: string;
  birthday: string | null;
  dateHired: string | null;
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

function monthDay(date: string | null) {
  return date ? date.slice(5) : "";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function ScheduleCalendar({
  month,
  canManage,
  employees,
  scheduleByDate,
}: {
  month: string;
  canManage: boolean;
  employees: Employee[];
  scheduleByDate: Record<string, string[]>;
}) {
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const today = formatInputDate(new Date());
  const firstMonthDay = `${month}-01`;
  const initialSelectedDate = days.some((day) => day.key === today && day.inMonth)
    ? today
    : firstMonthDay;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [localSchedule, setLocalSchedule] = useState(scheduleByDate);
  const [query, setQuery] = useState("");
  const [copiedSchedule, setCopiedSchedule] = useState<{
    date: string;
    userIds: string[];
  } | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const localOverridesRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    setLocalSchedule({
      ...scheduleByDate,
      ...localOverridesRef.current,
    });
  }, [scheduleByDate]);

  const selectedIds = localSchedule[selectedDate] ?? [];
  const selectedSet = new Set(selectedIds);
  const selectedMonthDay = selectedDate.slice(5);
  const selectedEvents = employees.filter(
    (employee) =>
      monthDay(employee.birthday) === selectedMonthDay ||
      monthDay(employee.dateHired) === selectedMonthDay
  );
  const filteredEmployees = employees.filter((employee) =>
    employee.fullName.toLowerCase().includes(query.trim().toLowerCase())
  );

  function setDayEmployees(date: string, userIds: string[]) {
    localOverridesRef.current = {
      ...localOverridesRef.current,
      [date]: userIds,
    };
    setLocalSchedule((current) => ({
      ...current,
      [date]: userIds,
    }));
  }

  function openDayEditor(date: string) {
    setSelectedDate(date);
    setIsEditorOpen(true);
  }

  async function copySelectedDay() {
    const sourceDate = selectedDate;
    const sourceIds = [...selectedIds];
    const didSave = await persistSchedule(sourceDate, sourceIds, {
      successMessage: "Schedule copied and saved",
    });
    if (!didSave) return;

    setCopiedSchedule({ date: sourceDate, userIds: sourceIds });
    toast.success(`${sourceIds.length} employee(s) copied from ${sourceDate}`);
  }

  async function persistSchedule(
    date: string,
    userIds: string[],
    options: { closeEditor?: boolean; successMessage?: string } = {}
  ) {
    setIsSaving(true);
    const result = await saveDaySchedule(date, userIds);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return false;
    }

    localOverridesRef.current = {
      ...localOverridesRef.current,
      [date]: userIds,
    };
    setLocalSchedule((current) => ({
      ...current,
      [date]: userIds,
    }));

    toast.success(options.successMessage ?? "Schedule saved");
    if (options.closeEditor) setIsEditorOpen(false);
    return true;
  }

  async function pasteCopiedSchedule() {
    if (!copiedSchedule) return;
    const targetDate = selectedDate;

    setIsSaving(true);
    const result = await copyDaySchedule(copiedSchedule.date, targetDate);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const pastedIds = result.userIds ?? [];
    localOverridesRef.current = {
      ...localOverridesRef.current,
      [targetDate]: pastedIds,
    };
    setLocalSchedule((current) => ({
      ...current,
      [targetDate]: pastedIds,
    }));
    setCopiedSchedule({
      date: copiedSchedule.date,
      userIds: pastedIds,
    });

    toast.success("Copied schedule pasted and saved");
  }

  function toggleEmployee(userId: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selectedIds, userId]))
      : selectedIds.filter((id) => id !== userId);
    setDayEmployees(selectedDate, next);
  }

  async function handleSave() {
    await persistSchedule(selectedDate, [...selectedIds], {
      closeEditor: true,
      successMessage: "Schedule saved",
    });
  }

  const editor = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || isSaving}
          onClick={() => setDayEmployees(selectedDate, employees.map((e) => e.id))}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || isSaving}
          onClick={() => setDayEmployees(selectedDate, [])}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || isSaving}
          onClick={copySelectedDay}
        >
          <ClipboardCopy className="size-4" />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canManage || !copiedSchedule || isSaving}
          onClick={pasteCopiedSchedule}
        >
          <ClipboardPaste className="size-4" />
          Paste
        </Button>
      </div>

      <div className="rounded-md border bg-muted/20 p-3">
        <div className="text-sm font-medium">
          {selectedIds.length} scheduled employee(s)
        </div>
        {selectedIds.length > 0 && selectedIds.length < 5 ? (
          <p className="text-xs text-destructive">
            This date is marked red because there are fewer than 5 scheduled
            employees.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Cell color is default when there are 0 or at least 5 employees.
          </p>
        )}
        {copiedSchedule ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Copied from {copiedSchedule.date}:{" "}
            {copiedSchedule.userIds.length} employee(s)
          </p>
        ) : null}
      </div>

      {selectedEvents.length > 0 ? (
        <div className="grid gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Events</p>
          {selectedEvents.map((employee) => (
            <div key={employee.id} className="flex flex-wrap gap-1">
              <span className="text-sm">{employee.fullName}</span>
              {monthDay(employee.birthday) === selectedMonthDay ? (
                <Badge variant="secondary">
                  <Cake className="size-3" /> Birthday
                </Badge>
              ) : null}
              {monthDay(employee.dateHired) === selectedMonthDay ? (
                <Badge variant="secondary">
                  <Sparkles className="size-3" /> Work Anniversary
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employee"
          className="pl-9"
        />
      </div>

      <div className="grid max-h-[50svh] gap-1 overflow-auto rounded-md border p-2 xl:max-h-[420px]">
        {filteredEmployees.map((employee) => (
          <Label
            key={employee.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
          >
            <Checkbox
              checked={selectedSet.has(employee.id)}
              disabled={!canManage}
              onCheckedChange={(checked) =>
                toggleEmployee(employee.id, checked === true)
              }
            />
            <span className="truncate">{employee.fullName}</span>
          </Label>
        ))}
      </div>

      {canManage ? (
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Schedule"}
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              <CardTitle>{getMonthLabel(month)}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" asChild>
                <Link href={`/schedule?month=${addMonths(month, -1)}`}>
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/schedule?month=${formatInputDate(new Date()).slice(0, 7)}`}>
                  Today
                </Link>
              </Button>
              <Button variant="outline" size="icon-sm" asChild>
                <Link href={`/schedule?month=${addMonths(month, 1)}`}>
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="destructive">1-4 scheduled</Badge>
            <Badge variant="outline">0 or 5+ scheduled</Badge>
            <Badge variant="secondary">
              <Cake className="size-3" /> Birthday
            </Badge>
            <Badge variant="secondary">
              <Sparkles className="size-3" /> Anniversary
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border-l border-t text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="border-b border-r px-2 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l">
            {days.map((day) => {
              const assignedIds = localSchedule[day.key] ?? [];
              const assignedNames = assignedIds.reduce<string[]>((names, id) => {
                const name = employees.find((employee) => employee.id === id)?.fullName;
                return name ? [...names, name] : names;
              }, []);
              const count = assignedIds.length;
              const isWarning = count > 0 && count < 5;
              const dayMonthKey = day.key.slice(5);
              const birthdayCount = employees.filter(
                (employee) => monthDay(employee.birthday) === dayMonthKey
              ).length;
              const anniversaryCount = employees.filter(
                (employee) => monthDay(employee.dateHired) === dayMonthKey
              ).length;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => openDayEditor(day.key)}
                  className={[
                    "min-h-36 border-b border-r p-2 text-left align-top transition-colors",
                    day.inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                    isWarning ? "bg-destructive/10" : "",
                    selectedDate === day.key ? "ring-2 ring-inset ring-primary" : "",
                    today === day.key ? "border-primary" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{day.date.getDate()}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} staff
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {assignedNames.map((name) => (
                      <span
                        key={name}
                        className="rounded bg-background/80 px-2 py-0.5 text-xs leading-tight text-foreground shadow-sm"
                      >
                        {firstName(name)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {birthdayCount > 0 ? (
                      <Badge variant="secondary">
                        <Cake className="size-3" /> {birthdayCount}
                      </Badge>
                    ) : null}
                    {anniversaryCount > 0 ? (
                      <Badge variant="secondary">
                        <Sparkles className="size-3" /> {anniversaryCount}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {new Intl.DateTimeFormat("en-PH", {
                dateStyle: "full",
              }).format(new Date(selectedDate))}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 overflow-auto pr-1">{editor}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
