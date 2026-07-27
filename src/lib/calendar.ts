// UTC-based on purpose: due_date is a Postgres `date` (no time/timezone),
// returned as a plain "YYYY-MM-DD" string. Building the grid in UTC and
// formatting keys the same way avoids local-timezone off-by-one shifts
// between the server and whatever timezone is rendering the page.

export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseMonthParam(month: string | undefined): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function monthParam(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthParam(year: number, month: number, delta: number): string {
  return monthParam(year, month + delta);
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export type CalendarDay = { dateKey: string; dayOfMonth: number; inMonth: boolean };

export function buildCalendarWeeks(year: number, month: number): CalendarDay[][] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));

  // getUTCDay(): Sunday = 0 ... Saturday = 6. Shift so Monday = 0.
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const lastWeekday = (lastOfMonth.getUTCDay() + 6) % 7;

  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstWeekday);

  const gridEnd = new Date(lastOfMonth);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - lastWeekday));

  const days: CalendarDay[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push({
      dateKey: toDateKey(cursor),
      dayOfMonth: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}
