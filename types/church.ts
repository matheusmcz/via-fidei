/**
 * Type definitions for Via Fidei
 */

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Common recurrence patterns for church events
 */
export type RecurrenceType =
  | "weekly"
  | "first-friday"
  | "first-saturday"
  | "monthly"
  | "biweekly"
  | string;

/**
 * A scheduled event (mass, adoration, confession, etc.)
 */
export interface ScheduleEvent {
  /** Day of week (0=Sunday, 6=Saturday). Omit for non-weekly events. */
  dayOfWeek?: DayOfWeek;
  /** Start time in 24h format (e.g., "07:00", "18:30") */
  time: string;
  /** End time for duration-based events (e.g., adoration "08:00" to "12:00") */
  endTime?: string;
  /** Recurrence pattern. Defaults to "weekly" if dayOfWeek is set. */
  recurrence?: RecurrenceType;
  /** Additional notes (e.g., "Missa cantada", "Com crianças") */
  notes?: string;
}

/**
 * A church activity (Terço, Novena, Catequese, etc.)
 */
export interface Activity {
  /** Activity name */
  name: string;
  /** Schedule for this activity */
  schedule: ScheduleEvent[];
  /** Optional description */
  description?: string;
}

export interface Church {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  imageUrl?: string;
  /** Mass schedule */
  masses?: ScheduleEvent[];
  /** Adoration schedule */
  adorations?: ScheduleEvent[];
  /** Confession schedule */
  confessions?: ScheduleEvent[];
  /** Other activities (Terço, Novena, etc.) */
  activities?: Activity[];
}
