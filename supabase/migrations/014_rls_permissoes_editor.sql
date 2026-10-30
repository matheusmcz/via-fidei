-- Alinha o RLS às permissões do editor (decisão D3, atualizada em 30/10/2026).
--
-- O editor de uma igreja vinculada altera contato (phone, whatsapp, email,
-- instagram, facebook, website), foto (image_url) e link do Google Maps
-- (google_maps_url), além de horários, atividades e grupos/movimentos/pastorais.
-- Identidade da igreja (name, slug, address, district, type) e clero
-- (clergy e church_clergy) são só do admin.
--
-- Idempotente: pode ser aplicada mais de uma vez pelo SQL Editor.

-- ============================================
-- churches: editor só altera as colunas liberadas pela D3
-- ============================================
-- A política churches_update_editor (008) libera a linha inteira. O admin
-- também usa a role 'authenticated', então GRANT por coluna bloquearia o
-- admin; por isso a restrição fica num trigger, como na 010.
--
-- Lista de permissão (e não de bloqueio): qualquer coluna fora da lista,
-- inclusive id, created_at e colunas criadas no futuro, só muda pelo admin.
-- updated_at entra na lista porque o cliente pode enviá-la; o trigger
-- churches_updated_at (que roda depois deste, por ordem alfabética) a
-- sobrescreve com now().
--
-- SECURITY INVOKER (padrão) é obrigatório, pelo mesmo motivo da 010: dentro
-- de uma função SECURITY DEFINER, current_user seria o dono da função e não
-- a role de quem chamou. A função não precisa de privilégio extra; is_admin()
-- continua SECURITY DEFINER. Chamadas com service role (seed) ou pelo SQL
-- Editor não usam as roles da API e continuam podendo alterar tudo.
create or replace function public.restrict_church_update_to_editor_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  editor_columns constant text[] := array[
    'phone',
    'whatsapp',
    'email',
    'instagram',
    'facebook',
    'website',
    'image_url',
    'google_maps_url',
    'updated_at'
  ];
begin
  if current_user in ('authenticated', 'anon')
     and (to_jsonb(new) - editor_columns) is distinct from (to_jsonb(old) - editor_columns)
     and not public.is_admin() then
    raise exception 'O editor só altera contato, foto e link do Maps da igreja; nome, slug, endereço, bairro e tipo são do admin'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists churches_restrict_editor_columns on public.churches;
create trigger churches_restrict_editor_columns
  before update on public.churches
  for each row execute function public.restrict_church_update_to_editor_columns();

-- ============================================
-- church_clergy: vínculos do clero só pelo admin
-- ============================================
-- As políticas *_admin da 008 continuam valendo para o admin. A tabela
-- clergy já era só do admin.
drop policy if exists "church_clergy_insert_editor" on public.church_clergy;
drop policy if exists "church_clergy_update_editor" on public.church_clergy;
drop policy if exists "church_clergy_delete_editor" on public.church_clergy;
