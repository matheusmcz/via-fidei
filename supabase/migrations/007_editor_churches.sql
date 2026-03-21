-- Vínculo editor-igreja (controle de acesso)
create table editor_churches (
  editor_id uuid not null references profiles(id) on delete cascade,
  church_id uuid not null references churches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (editor_id, church_id)
);

alter table editor_churches enable row level security;

create index editor_churches_editor_id_idx on editor_churches (editor_id);
create index editor_churches_church_id_idx on editor_churches (church_id);
