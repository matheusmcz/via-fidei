import { getClergyHonors } from "@/lib/utils";
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
import { cache } from "react";
import { createPublicClient } from "../public";

/** Linha de `churches` (colunas usadas no domínio). */
export interface DbChurch {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  image_url: string | null;
  type: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  google_maps_url: string | null;
}

interface DbSchedule {
  day_of_week: number | null;
  time: string;
  end_time: string | null;
  recurrence: string | null;
  notes: string | null;
}

interface DbScheduleEvent extends DbSchedule {
  id: string;
  category: string;
}

interface DbActivity {
  id: string;
  name: string;
  description: string | null;
  activity_schedules: DbSchedule[];
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
    birth_date: string | null;
    death_date: string | null;
    honors: string[] | null;
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

/**
 * Linha de `churches` com as relações embutidas da página da igreja. As
 * listas aceitam `null` por defesa: o PostgREST devolve `[]` quando não há
 * linhas.
 */
interface DbChurchPage extends DbChurch {
  schedule_events: DbScheduleEvent[] | null;
  activities: DbActivity[] | null;
  church_clergy: DbChurchClergy[] | null;
  church_ministries: DbChurchMinistry[] | null;
}

/**
 * Tudo da página da igreja em uma consulta: os horários, as atividades com
 * os seus horários, os vínculos do clero (ativos e encerrados: a página usa
 * o `end_date` para o histórico) e os ministérios.
 */
const CHURCH_PAGE_SELECT =
  "*, schedule_events(*), activities(*, activity_schedules(*)), church_clergy(*, clergy(*)), church_ministries(*, ministries(*))";

/** Linha de `churches` para o `Church` básico, sem as seções da página. */
export function toChurch(db: DbChurch): Church {
  const hasContact =
    db.phone ||
    db.whatsapp ||
    db.email ||
    db.instagram ||
    db.facebook ||
    db.website;

  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    address: db.address,
    district: db.district,
    ...(db.image_url && { imageUrl: db.image_url }),
    ...(db.type && { type: db.type as ChurchType }),
    ...(hasContact && {
      contact: {
        ...(db.phone && { phone: db.phone }),
        ...(db.whatsapp && { whatsapp: db.whatsapp }),
        ...(db.email && { email: db.email }),
        ...(db.instagram && { instagram: db.instagram }),
        ...(db.facebook && { facebook: db.facebook }),
        ...(db.website && { website: db.website }),
      },
    }),
    ...(db.google_maps_url && { googleMapsUrl: db.google_maps_url }),
  };
}

function toScheduleEvent(db: DbSchedule): ScheduleEvent {
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

function eventsOfCategory(
  events: DbScheduleEvent[],
  category: string
): ScheduleEvent[] {
  return events.filter((e) => e.category === category).map(toScheduleEvent);
}

function toActivity(db: DbActivity): Activity {
  return {
    id: db.id,
    name: db.name,
    schedule: db.activity_schedules.map(toScheduleEvent),
    ...(db.description && { description: db.description }),
  };
}

function toClergy(
  db: DbChurchClergy,
  churchId: string
): Clergy {
  const c = db.clergy;
  const honors = getClergyHonors(c.honors ?? undefined);
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
    ...(c.birth_date && { birthDate: c.birth_date }),
    ...(c.death_date && { deathDate: c.death_date }),
    ...(honors.length > 0 && { honors }),
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

function toChurchPage(db: DbChurchPage): Church {
  const scheduleEvents = db.schedule_events ?? [];
  const masses = eventsOfCategory(scheduleEvents, "mass");
  const adorations = eventsOfCategory(scheduleEvents, "adoration");
  const confessions = eventsOfCategory(scheduleEvents, "confession");
  const activities = (db.activities ?? []).map(toActivity);
  const clergy = (db.church_clergy ?? []).map((cc) => toClergy(cc, db.id));
  const ministries = groupMinistries(db.church_ministries ?? []);

  return {
    ...toChurch(db),
    ...(masses.length > 0 && { masses }),
    ...(adorations.length > 0 && { adorations }),
    ...(confessions.length > 0 && { confessions }),
    ...(activities.length > 0 && { activities }),
    ...(clergy.length > 0 && { clergy }),
    ...(ministries && { ministries }),
  };
}

export async function getChurches(): Promise<Church[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .order("name");

  if (error) throw error;

  return ((data ?? []) as DbChurch[]).map(toChurch);
}

async function fetchChurchBySlug(slug: string): Promise<Church | null> {
  const supabase = createPublicClient();

  // Sem `order`, o Postgres não garante a ordem das relações embutidas, e a
  // página mostra atividades e ministérios na ordem recebida (clero e
  // horários são reordenados em `lib/utils`, mas os empates seguem a ordem
  // recebida). Horários vão por hora; o resto, pela ordem de cadastro, com o
  // `id` desempatando linhas gravadas no mesmo insert (mesmo `created_at`),
  // para a ordem não trocar entre uma revalidação e outra.
  const { data, error } = await supabase
    .from("churches")
    .select(CHURCH_PAGE_SELECT)
    .eq("slug", slug)
    .order("time", { referencedTable: "schedule_events" })
    .order("created_at", { referencedTable: "activities" })
    .order("id", { referencedTable: "activities" })
    .order("time", { referencedTable: "activities.activity_schedules" })
    .order("created_at", { referencedTable: "church_clergy" })
    .order("id", { referencedTable: "church_clergy" })
    .order("created_at", { referencedTable: "church_ministries" })
    .order("id", { referencedTable: "church_ministries" })
    .maybeSingle();

  // Só "nenhuma linha" vira null (404). Qualquer erro do Supabase (projeto
  // pausado, rede, falta de permissão/GRANT em qualquer tabela embutida) é
  // lançado para o ISR manter a versão em cache. Linhas filtradas pelo RLS
  // não são erro: a igreja vira null e as relações, listas menores.
  if (error) throw error;
  if (!data) return null;

  return toChurchPage(data as DbChurchPage);
}

/**
 * Igreja completa da página `/igreja/[slug]`, ou `null` se o slug não existe.
 *
 * Envolvida em `cache()` do React: `generateMetadata` e a página chamam com o
 * mesmo slug na mesma requisição, e a consulta roda uma vez só. Fora de uma
 * requisição do React (scripts, testes) não há memoização.
 */
export const getChurchBySlug = cache(fetchChurchBySlug);

export async function getChurchSlugs(): Promise<string[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("churches")
    .select("slug");

  if (error) throw error;

  return (data ?? []).map((c) => c.slug);
}
