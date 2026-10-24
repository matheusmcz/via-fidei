-- Eventos de horário (missas, adorações, confissões)
create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  category text not null check (category in ('mass', 'adoration', 'confession')),
  day_of_week smallint check (day_of_week between 0 and 6),
  time text not null,
  end_time text,
  recurrence text,
  notes text,
  created_at timestamptz not null default now()
);

alter table schedule_events enable row level security;

create index schedule_events_church_id_idx on schedule_events (church_id);
create index schedule_events_category_idx on schedule_events (category);
