-- Tabela principal de igrejas
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text not null,
  district text not null,
  image_url text,
  type text check (type in ('parish', 'rectory', 'cathedral', 'chapel', 'sanctuary')),
  phone text,
  whatsapp text,
  email text,
  instagram text,
  facebook text,
  website text,
  google_maps_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table churches enable row level security;

create trigger churches_updated_at
  before update on churches
  for each row execute function update_updated_at();

create index churches_slug_idx on churches (slug);
create index churches_district_idx on churches (district);
