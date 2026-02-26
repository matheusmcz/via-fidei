import type { DayOfWeek, RecurrenceType, ScheduleEvent } from "@/types";

/**
 * Portuguese day names (0 = Sunday)
 */
const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

/**
 * Short day names for compact display
 */
const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

/**
 * Recurrence labels in Portuguese
 */
const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Semanal",
  "first-friday": "1ª Sexta-feira do mês",
  "first-saturday": "1º Sábado do mês",
  "first-thursday": "1ª Quinta-feira do mês",
  monthly: "Mensal",
  "monthly-20": "Todo dia 20 do mês",
  biweekly: "Quinzenal",
};

/**
 * Get full day name in Portuguese
 */
export function getDayName(day: DayOfWeek): string {
  return DAY_NAMES[day];
}

/**
 * Get short day name in Portuguese
 */
export function getDayNameShort(day: DayOfWeek): string {
  return DAY_NAMES_SHORT[day];
}

/**
 * Validate time string format (HH:MM)
 * @returns true if valid, false otherwise
 */
export function isValidTime(time: string): boolean {
  if (!time || typeof time !== "string") return false;
  const match = time.match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
  return match !== null;
}

/**
 * Format time for display (e.g., "07:00" → "7h", "18:30" → "18h30")
 * @param time - Time string in "HH:MM" format (00:00-23:59)
 * @returns Formatted time string, or the original string if invalid
 */
export function formatTime(time: string): string {
  if (!isValidTime(time)) {
    // Return original string for invalid input to avoid silent failures
    return time;
  }

  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const m = minutes || "00";

  if (m === "00") {
    return `${h}h`;
  }
  return `${h}h${m}`;
}

/**
 * Generate a stable unique key for a ScheduleEvent
 */
export function getEventKey(event: ScheduleEvent): string {
  return `${event.dayOfWeek ?? "special"}-${event.time}-${event.recurrence ?? "weekly"}-${event.notes ?? ""}`.replace(
    /\s+/g,
    "_",
  );
}

/**
 * Format time range for display (e.g., "8h às 12h")
 */
export function formatTimeRange(startTime: string, endTime?: string): string {
  const start = formatTime(startTime);
  if (!endTime) return start;
  return `${start} às ${formatTime(endTime)}`;
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrence(recurrence?: RecurrenceType): string | null {
  if (!recurrence || recurrence === "weekly") return null;
  return RECURRENCE_LABELS[recurrence] || recurrence;
}

/**
 * Group schedule events by day of week
 * Returns a Map with day as key and array of events as value
 * Events without dayOfWeek are grouped under key -1
 */
export function groupByDay(
  events: ScheduleEvent[],
): Map<number, ScheduleEvent[]> {
  const grouped = new Map<number, ScheduleEvent[]>();

  for (const event of events) {
    const day = event.dayOfWeek ?? -1;
    const existing = grouped.get(day) || [];
    existing.push(event);
    grouped.set(day, existing);
  }

  // Sort events within each day by time
  for (const [day, dayEvents] of grouped) {
    grouped.set(
      day,
      dayEvents.sort((a, b) => a.time.localeCompare(b.time)),
    );
  }

  return grouped;
}

/**
 * Check if events can be grouped as "Segunda a Sexta" (same times Mon-Fri)
 */
export function canGroupWeekdays(
  grouped: Map<number, ScheduleEvent[]>,
): boolean {
  const weekdayTimes: string[] = [];

  for (let day = 1; day <= 5; day++) {
    const events = grouped.get(day as DayOfWeek);
    if (!events) return false;
    const times = events
      .map((e) => e.time)
      .sort()
      .join(",");
    weekdayTimes.push(times);
  }

  // Check if all weekdays have the same times
  return weekdayTimes.every((t) => t === weekdayTimes[0]);
}

/**
 * Get ordered day keys for display (Sunday first, then special events)
 */
export function getOrderedDays(
  grouped: Map<number, ScheduleEvent[]>,
): number[] {
  const days = Array.from(grouped.keys());

  // Sort: 0 (Sunday) first, then 1-6, then -1 (special) last
  return days.sort((a, b) => {
    if (a === -1) return 1;
    if (b === -1) return -1;
    return a - b;
  });
}
