/**
 * Type definitions for Via Fidei
 */

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Clergy role within the church
 */
export type ClergyRole =
  | "parish-priest"
  | "vicar"
  | "deacon"
  | "administrator"
  | "rector";

/**
 * Clergy title prefix
 */
export type ClergyTitle = "padre" | "monsenhor" | "frei" | "dom";

/**
 * Religious order suffix (e.g., OFM, SJ, OP)
 * Uses loose string pattern to allow known values with autocomplete while accepting custom strings
 */
export type ReligiousOrderSuffix =
  | "OFM"
  | "SJ"
  | "OP"
  | "OSB"
  | "OCD"
  | "CSSR"
  | "SVD"
  | "SCJ"
  | "CM"
  | "SDB"
  | (string & {});

/**
 * A clergy member (priest, deacon, etc.)
 */
export interface Clergy {
  /** Unique identifier */
  id: string;
  /** Clergy name */
  name: string;
  /** Church this clergy belongs to (references Church.id) */
  churchId?: string;
  /** Role in the church */
  role: ClergyRole;
  /** Title prefix (Pe., Mons., etc.) */
  title?: ClergyTitle;
  /** Religious order suffix (OFM, SJ, etc.) */
  suffix?: ReligiousOrderSuffix;
  /** Profile image URL */
  imageUrl?: string;
  /** Date when started at this church (year or YYYY-MM-DD) */
  startDate?: string;
  /** Date when ended service at this church (year or YYYY-MM-DD). Omit for active clergy. */
  endDate?: string;
  /** Short biography */
  bio?: string;
  /** Social media links */
  socialLinks?: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
  };
}

/**
 * Type of ecclesiastical entity
 */
export type ChurchType =
  | "parish"
  | "rectory"
  | "cathedral"
  | "chapel"
  | "sanctuary";

/**
 * Church contact information
 */
export interface ChurchContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
}

/**
 * Common recurrence patterns for church events
 * Uses loose string pattern to allow known values with autocomplete while accepting custom strings
 */
export type RecurrenceType =
  | "weekly"
  | "first-friday"
  | "first-saturday"
  | "first-thursday"
  | "monthly"
  | "biweekly"
  | (string & {});

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
  /** Unique identifier */
  id: string;
  /** Activity name */
  name: string;
  /** Schedule for this activity */
  schedule: ScheduleEvent[];
  /** Optional description */
  description?: string;
}

/**
 * A group, movement, or pastoral within a church
 */
export interface ChurchMinistry {
  /** Unique identifier */
  id: string;
  /** Full name (e.g., "Encontro de Casais com Cristo") */
  label: string;
  /** Optional acronym (e.g., "ECC") */
  acronym?: string;
}

/**
 * Church ministries organized by category
 */
export interface ChurchMinistries {
  /** Community/prayer groups (e.g., RCC, Terço dos Homens) */
  groups?: ChurchMinistry[];
  /** Ecclesial movements (e.g., ECC, Segue-me, Cursilho) */
  movements?: ChurchMinistry[];
  /** Parish pastorals (e.g., Pastoral Familiar, Pastoral da Criança) */
  pastorals?: ChurchMinistry[];
}

/**
 * Clergy member enriched with church info (for listing pages)
 */
export interface ClergyWithChurch extends Clergy {
  churchName: string;
  churchSlug: string;
}

export interface Church {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  imageUrl?: string;
  /** Type of ecclesiastical entity */
  type?: ChurchType;
  /** Contact information */
  contact?: ChurchContact;
  /** Google Maps URL for location */
  googleMapsUrl?: string;
  /** Mass schedule */
  masses?: ScheduleEvent[];
  /** Adoration schedule */
  adorations?: ScheduleEvent[];
  /** Confession schedule */
  confessions?: ScheduleEvent[];
  /** Other activities (Terço, Novena, etc.) */
  activities?: Activity[];
  /** Clergy members (priests, deacons, etc.) */
  clergy?: Clergy[];
  /** Groups, movements, and pastorals */
  ministries?: ChurchMinistries;
}
