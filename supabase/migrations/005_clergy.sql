-- Clérigos como entidades independentes
create table clergy (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('parish-priest', 'vicar', 'deacon', 'administrator', 'rector')),
  title text check (title in ('padre', 'monsenhor', 'frei', 'dom')),
  suffix text,
  image_url text,
  bio text,
  whatsapp text,
  instagram text,
  facebook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clergy enable row level security;

create trigger clergy_updated_at
  before update on clergy
  for each row execute function update_updated_at();

-- Vínculo clérigo-igreja (permite histórico e múltiplas igrejas)
create table church_clergy (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  clergy_id uuid not null references clergy(id) on delete cascade,
  start_date text,
  end_date text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (church_id, clergy_id, start_date)
);

alter table church_clergy enable row level security;

create index church_clergy_church_id_idx on church_clergy (church_id);
create index church_clergy_clergy_id_idx on church_clergy (clergy_id);
create index church_clergy_is_active_idx on church_clergy (is_active);
