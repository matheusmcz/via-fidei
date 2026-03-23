/**
 * Script de seed para migrar dados estáticos para o Supabase.
 *
 * Uso: npm run seed
 *
 * Requer no .env.local (ou variáveis equivalentes):
 * - URL: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL (ver lib/supabase/env.ts)
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { churches } from "../data/churches";
import { clergyMembers } from "../data/clergy";
import { groups, movements, pastorals } from "../data/ministries";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../lib/supabase/env";

let supabaseUrl: string;
let serviceRoleKey: string;
try {
  supabaseUrl = getSupabaseUrl();
  serviceRoleKey = getSupabaseServiceRoleKey();
} catch (e) {
  console.error(
    (e as Error).message,
    "\nConfira .env.local (URL do projeto + SUPABASE_SERVICE_ROLE_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Mapeamento de IDs antigos (string numérica) para UUIDs do Supabase
const churchIdMap = new Map<string, string>();
const clergyIdMap = new Map<string, string>();
const ministryIdMap = new Map<string, string>();

async function seedChurches() {
  console.log("Inserindo igrejas...");

  for (const church of churches) {
    const { data, error } = await supabase
      .from("churches")
      .insert({
        name: church.name,
        slug: church.slug,
        address: church.address,
        district: church.district,
        image_url: church.imageUrl ?? null,
        type: church.type ?? null,
        phone: church.contact?.phone ?? null,
        whatsapp: church.contact?.whatsapp ?? null,
        email: church.contact?.email ?? null,
        instagram: church.contact?.instagram ?? null,
        facebook: church.contact?.facebook ?? null,
        website: church.contact?.website ?? null,
        google_maps_url: church.googleMapsUrl ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Erro ao inserir igreja "${church.name}":`, error.message);
      continue;
    }

    churchIdMap.set(church.id, data.id);
    console.log(`  ✓ ${church.name}`);
  }

  console.log(`${churchIdMap.size} igrejas inseridas.\n`);
}

async function seedScheduleEvents() {
  console.log("Inserindo horários...");
  let count = 0;

  for (const church of churches) {
    const churchUuid = churchIdMap.get(church.id);
    if (!churchUuid) continue;

    const events: Array<{
      church_id: string;
      category: string;
      day_of_week: number | null;
      time: string;
      end_time: string | null;
      recurrence: string | null;
      notes: string | null;
    }> = [];

    for (const mass of church.masses ?? []) {
      events.push({
        church_id: churchUuid,
        category: "mass",
        day_of_week: mass.dayOfWeek ?? null,
        time: mass.time,
        end_time: mass.endTime ?? null,
        recurrence: mass.recurrence ?? null,
        notes: mass.notes ?? null,
      });
    }

    for (const adoration of church.adorations ?? []) {
      events.push({
        church_id: churchUuid,
        category: "adoration",
        day_of_week: adoration.dayOfWeek ?? null,
        time: adoration.time,
        end_time: adoration.endTime ?? null,
        recurrence: adoration.recurrence ?? null,
        notes: adoration.notes ?? null,
      });
    }

    for (const confession of church.confessions ?? []) {
      events.push({
        church_id: churchUuid,
        category: "confession",
        day_of_week: confession.dayOfWeek ?? null,
        time: confession.time,
        end_time: confession.endTime ?? null,
        recurrence: confession.recurrence ?? null,
        notes: confession.notes ?? null,
      });
    }

    if (events.length > 0) {
      const { error } = await supabase.from("schedule_events").insert(events);
      if (error) {
        console.error(
          `Erro ao inserir horários de "${church.name}":`,
          error.message
        );
      } else {
        count += events.length;
      }
    }
  }

  console.log(`${count} horários inseridos.\n`);
}

async function seedActivities() {
  console.log("Inserindo atividades...");
  let count = 0;

  for (const church of churches) {
    const churchUuid = churchIdMap.get(church.id);
    if (!churchUuid || !church.activities) continue;

    for (const activity of church.activities) {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          church_id: churchUuid,
          name: activity.name,
          description: activity.description ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          `Erro ao inserir atividade "${activity.name}":`,
          error.message
        );
        continue;
      }

      if (activity.schedule.length > 0) {
        const schedules = activity.schedule.map((s) => ({
          activity_id: data.id,
          day_of_week: s.dayOfWeek ?? null,
          time: s.time,
          end_time: s.endTime ?? null,
          recurrence: s.recurrence ?? null,
          notes: s.notes ?? null,
        }));

        const { error: schedError } = await supabase
          .from("activity_schedules")
          .insert(schedules);

        if (schedError) {
          console.error(
            `Erro ao inserir horários da atividade "${activity.name}":`,
            schedError.message
          );
        }
      }

      count++;
    }
  }

  console.log(`${count} atividades inseridas.\n`);
}

async function seedMinistries() {
  console.log("Inserindo ministérios...");

  const allMinistries = [
    ...groups.map((m) => ({ ...m, category: "group" as const })),
    ...movements.map((m) => ({ ...m, category: "movement" as const })),
    ...pastorals.map((m) => ({ ...m, category: "pastoral" as const })),
  ];

  for (const ministry of allMinistries) {
    const { data, error } = await supabase
      .from("ministries")
      .insert({
        label: ministry.label,
        acronym: ministry.acronym ?? null,
        category: ministry.category,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        `Erro ao inserir ministério "${ministry.label}":`,
        error.message
      );
      continue;
    }

    ministryIdMap.set(ministry.id, data.id);
    console.log(`  ✓ ${ministry.label}`);
  }

  console.log(`${ministryIdMap.size} ministérios inseridos.\n`);
}

async function seedChurchMinistries() {
  console.log("Vinculando ministérios às igrejas...");
  let count = 0;

  for (const church of churches) {
    const churchUuid = churchIdMap.get(church.id);
    if (!churchUuid || !church.ministries) continue;

    const allChurchMinistries = [
      ...(church.ministries.groups ?? []),
      ...(church.ministries.movements ?? []),
      ...(church.ministries.pastorals ?? []),
    ];

    for (const ministry of allChurchMinistries) {
      const ministryUuid = ministryIdMap.get(ministry.id);
      if (!ministryUuid) {
        console.warn(
          `  ⚠ Ministério "${ministry.label}" não encontrado no mapa`
        );
        continue;
      }

      const { error } = await supabase.from("church_ministries").insert({
        church_id: churchUuid,
        ministry_id: ministryUuid,
      });

      if (error) {
        console.error(
          `Erro ao vincular "${ministry.label}" a "${church.name}":`,
          error.message
        );
      } else {
        count++;
      }
    }
  }

  console.log(`${count} vínculos ministério-igreja criados.\n`);
}

async function seedClergy() {
  console.log("Inserindo clérigos (entidade independente)...");

  for (const clergy of clergyMembers) {
    const { data, error } = await supabase
      .from("clergy")
      .insert({
        name: clergy.name,
        role: clergy.role,
        title: clergy.title ?? null,
        suffix: clergy.suffix ?? null,
        image_url: clergy.imageUrl ?? null,
        bio: clergy.bio ?? null,
        whatsapp: clergy.socialLinks?.whatsapp ?? null,
        instagram: clergy.socialLinks?.instagram ?? null,
        facebook: clergy.socialLinks?.facebook ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        `Erro ao inserir clérigo "${clergy.name}":`,
        error.message
      );
      continue;
    }

    clergyIdMap.set(clergy.id, data.id);
    console.log(`  ✓ ${clergy.name}`);

    // Vincular à igreja se tiver churchId
    if (clergy.churchId) {
      const churchUuid = churchIdMap.get(clergy.churchId);
      if (churchUuid) {
        const { error: linkError } = await supabase
          .from("church_clergy")
          .insert({
            church_id: churchUuid,
            clergy_id: data.id,
            start_date: clergy.startDate ?? null,
            end_date: clergy.endDate ?? null,
            is_active: !clergy.endDate,
          });

        if (linkError) {
          console.error(
            `Erro ao vincular "${clergy.name}" à igreja:`,
            linkError.message
          );
        }
      }
    }
  }

  console.log(`${clergyIdMap.size} clérigos inseridos.\n`);
}

async function seedInlineClergy() {
  console.log("Inserindo clérigos inline das igrejas...");
  let count = 0;

  for (const church of churches) {
    const churchUuid = churchIdMap.get(church.id);
    if (!churchUuid || !church.clergy) continue;

    for (const clergy of church.clergy) {
      // Pular se já foi inserido via clergyMembers
      if (clergyIdMap.has(clergy.id)) {
        // Apenas garantir o vínculo
        const existingUuid = clergyIdMap.get(clergy.id)!;
        const { error } = await supabase
          .from("church_clergy")
          .upsert(
            {
              church_id: churchUuid,
              clergy_id: existingUuid,
              start_date: clergy.startDate ?? null,
              end_date: clergy.endDate ?? null,
              is_active: !clergy.endDate,
            },
            { onConflict: "church_id,clergy_id,start_date" }
          );

        if (error && !error.message.includes("duplicate")) {
          console.error(
            `Erro ao vincular "${clergy.name}":`,
            error.message
          );
        }
        continue;
      }

      const { data, error } = await supabase
        .from("clergy")
        .insert({
          name: clergy.name,
          role: clergy.role,
          title: clergy.title ?? null,
          suffix: clergy.suffix ?? null,
          image_url: clergy.imageUrl ?? null,
          bio: clergy.bio ?? null,
          whatsapp: clergy.socialLinks?.whatsapp ?? null,
          instagram: clergy.socialLinks?.instagram ?? null,
          facebook: clergy.socialLinks?.facebook ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          `Erro ao inserir clérigo inline "${clergy.name}":`,
          error.message
        );
        continue;
      }

      clergyIdMap.set(clergy.id, data.id);

      const { error: linkError } = await supabase
        .from("church_clergy")
        .insert({
          church_id: churchUuid,
          clergy_id: data.id,
          start_date: clergy.startDate ?? null,
          end_date: clergy.endDate ?? null,
          is_active: !clergy.endDate,
        });

      if (linkError) {
        console.error(
          `Erro ao vincular inline "${clergy.name}":`,
          linkError.message
        );
      }

      count++;
      console.log(`  ✓ ${clergy.name} (inline)`);
    }
  }

  console.log(`${count} clérigos inline inseridos.\n`);
}

async function main() {
  console.log("=== Via Fidei — Seed ===\n");

  await seedChurches();
  await seedScheduleEvents();
  await seedActivities();
  await seedMinistries();
  await seedChurchMinistries();
  await seedClergy();
  await seedInlineClergy();

  console.log("=== Seed concluído ===");
}

main().catch(console.error);
