-- Atividades das igrejas (Terço, Novena, Catequese, etc.)
create table activities (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table activities enable row level security;

create index activities_church_id_idx on activities (church_id);

-- Horários das atividades
create table activity_schedules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  time text not null,
  end_time text,
  recurrence text,
  notes text,
  created_at timestamptz not null default now()
);

alter table activity_schedules enable row level security;

create index activity_schedules_activity_id_idx on activity_schedules (activity_id);
