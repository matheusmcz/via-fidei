-- Ministérios (grupos, movimentos, pastorais)
create table ministries (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  acronym text,
  category text not null check (category in ('group', 'movement', 'pastoral')),
  created_at timestamptz not null default now()
);

alter table ministries enable row level security;

create index ministries_category_idx on ministries (category);

-- Vínculo ministério-igreja
create table church_ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  ministry_id uuid not null references ministries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (church_id, ministry_id)
);

alter table church_ministries enable row level security;

create index church_ministries_church_id_idx on church_ministries (church_id);
create index church_ministries_ministry_id_idx on church_ministries (ministry_id);
