export function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatInputDate(new Date());
  }

  return value;
}

export function getLocalDateRange(inputDate: string) {
  const [year, month, day] = inputDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export function addInputDateDays(inputDate: string, amount: number) {
  const [year, month, day] = inputDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateOnly(date);
}

export function toDateOnly(inputDate: string) {
  const [year, month, day] = parseInputDate(inputDate).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getDateOnlyRange(inputDate: string) {
  const startDate = parseInputDate(inputDate);
  const start = toDateOnly(startDate);
  const end = toDateOnly(addInputDateDays(startDate, 1));
  return { start, end };
}
