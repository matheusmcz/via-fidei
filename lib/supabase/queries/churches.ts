import type {
  Activity,
  Church,
  ChurchMinistries,
  ChurchMinistry,
  Clergy,
  ClergyRole,
  ClergyTitle,
  ChurchType,
  DayOfWeek,
  ReligiousOrderSuffix,
  ScheduleEvent,
} from "@/types";
import { createPublicClient } from "../public";

interface DbScheduleEvent {
  id: string;
  category: string;
  day_of_week: number | null;
  time: string;
  end_time: string | null;
  recurrence: string | null;
  notes: string | null;
}

interface DbActivity {
  id: string;
  name: string;
  description: string | null;
  activity_schedules: Array<{
    day_of_week: number | null;
    time: string;
    end_time: string | null;
    recurrence: string | null;
    notes: string | null;
  }>;
}

interface DbChurchClergy {
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  clergy: {
    id: string;
    name: string;
    role: string;
    title: string | null;
    suffix: string | null;
    image_url: string | null;
    bio: string | null;
    whatsapp: string | null;
    instagram: string | null;
    facebook: string | null;
  };
}

interface DbChurchMinistry {
  ministries: {
    id: string;
    label: string;
    acronym: string | null;
    category: string;
  };
}

function toScheduleEvent(db: DbScheduleEvent): ScheduleEvent {
  return {
    ...(db.day_of_week !== null && {
      dayOfWeek: db.day_of_week as DayOfWeek,
    }),
    time: db.time,
    ...(db.end_time && { endTime: db.end_time }),
    ...(db.recurrence && { recurrence: db.recurrence }),
    ...(db.notes && { notes: db.notes }),
  };
}

function toClergy(
  db: DbChurchClergy,
  churchId: string
): Clergy {
  const c = db.clergy;
  const socialLinks: Clergy["socialLinks"] = {};
  if (c.whatsapp) socialLinks.whatsapp = c.whatsapp;
  if (c.instagram) socialLinks.instagram = c.instagram;
  if (c.facebook) socialLinks.facebook = c.facebook;

  return {
    id: c.id,
    name: c.name,
    churchId,
    role: c.role as ClergyRole,
    ...(c.title && { title: c.title as ClergyTitle }),
    ...(c.suffix && { suffix: c.suffix as ReligiousOrderSuffix }),
    ...(c.image_url && { imageUrl: c.image_url }),
    ...(db.start_date && { startDate: db.start_date }),
    ...(db.end_date && { endDate: db.end_date }),
    ...(c.bio && { bio: c.bio }),
    ...(Object.keys(socialLinks).length > 0 && { socialLinks }),
  };
}

function groupMinistries(
  dbMinistries: DbChurchMinistry[]
): ChurchMinistries | undefined {
  if (dbMinistries.length === 0) return undefined;

  const groups: ChurchMinistry[] = [];
  const movements: ChurchMinistry[] = [];
  const pastorals: ChurchMinistry[] = [];

  for (const { ministries: m } of dbMinistries) {
    const ministry: ChurchMinistry = {
      id: m.id,
      label: m.label,
      ...(m.acronym && { acronym: m.acronym }),
    };

    switch (m.category) {
      case "group":
        groups.push(ministry);
        break;
      case "movement":
        movements.push(ministry);
        break;
      case "pastoral":
        pastorals.push(ministry);
        break;
    }
  }

  return {
    ...(groups.length > 0 && { groups }),
    ...(movements.length > 0 && { movements }),
    ...(pastorals.length > 0 && { pastorals }),
  };
}

export async function getChurches(): Promise<Church[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    address: c.address,
    district: c.district,
    ...(c.image_url && { imageUrl: c.image_url }),
    ...(c.type && { type: c.type as ChurchType }),
    ...((c.phone || c.whatsapp || c.email || c.instagram || c.facebook || c.website) && {
      contact: {
        ...(c.phone && { phone: c.phone }),
        ...(c.whatsapp && { whatsapp: c.whatsapp }),
        ...(c.email && { email: c.email }),
        ...(c.instagram && { instagram: c.instagram }),
        ...(c.facebook && { facebook: c.facebook }),
        ...(c.website && { website: c.website }),
      },
    }),
    ...(c.google_maps_url && { googleMapsUrl: c.google_maps_url }),
  }));
}

export async function getChurchBySlug(
  slug: string
): Promise<Church | null> {
  const supabase = createPublicClient();

  const { data: church, error } = await supabase
    .from("churches")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !church) return null;

  const [
    { data: scheduleEvents },
    { data: dbActivities },
    { data: dbClergy },
    { data: dbMinistries },
  ] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("church_id", church.id),
    supabase
      .from("activities")
      .select("*, activity_schedules(*)")
      .eq("church_id", church.id),
    supabase
      .from("church_clergy")
      .select("*, clergy(*)")
      .eq("church_id", church.id),
    supabase
      .from("church_ministries")
      .select("*, ministries(*)")
      .eq("church_id", church.id),
  ]);

  const masses = (scheduleEvents ?? [])
    .filter((e: DbScheduleEvent) => e.category === "mass")
    .map(toScheduleEvent);
  const adorations = (scheduleEvents ?? [])
    .filter((e: DbScheduleEvent) => e.category === "adoration")
    .map(toScheduleEvent);
  const confessions = (scheduleEvents ?? [])
    .filter((e: DbScheduleEvent) => e.category === "confession")
    .map(toScheduleEvent);

  const activities: Activity[] = (dbActivities ?? []).map(
    (a: DbActivity) => ({
      id: a.id,
      name: a.name,
      schedule: a.activity_schedules.map((s) => ({
        ...(s.day_of_week !== null && {
          dayOfWeek: s.day_of_week as DayOfWeek,
        }),
        time: s.time,
        ...(s.end_time && { endTime: s.end_time }),
        ...(s.recurrence && { recurrence: s.recurrence }),
        ...(s.notes && { notes: s.notes }),
      })),
      ...(a.description && { description: a.description }),
    })
  );

  const clergy = (dbClergy ?? []).map((cc: DbChurchClergy) =>
    toClergy(cc, church.id)
  );

  const ministries = groupMinistries(
    (dbMinistries ?? []) as DbChurchMinistry[]
  );

  return {
    id: church.id,
    name: church.name,
    slug: church.slug,
    address: church.address,
    district: church.district,
    ...(church.image_url && { imageUrl: church.image_url }),
    ...(church.type && { type: church.type as ChurchType }),
    ...((church.phone || church.whatsapp || church.email || church.instagram || church.facebook || church.website) && {
      contact: {
        ...(church.phone && { phone: church.phone }),
        ...(church.whatsapp && { whatsapp: church.whatsapp }),
        ...(church.email && { email: church.email }),
        ...(church.instagram && { instagram: church.instagram }),
        ...(church.facebook && { facebook: church.facebook }),
        ...(church.website && { website: church.website }),
      },
    }),
    ...(church.google_maps_url && { googleMapsUrl: church.google_maps_url }),
    ...(masses.length > 0 && { masses }),
    ...(adorations.length > 0 && { adorations }),
    ...(confessions.length > 0 && { confessions }),
    ...(activities.length > 0 && { activities }),
    ...(clergy.length > 0 && { clergy }),
    ...(ministries && { ministries }),
  };
}

export async function getChurchSlugs(): Promise<string[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("churches")
    .select("slug");

  if (error) throw error;

  return (data ?? []).map((c) => c.slug);
}
