-- Datas de nascimento e falecimento, e atualização do clero da
-- Paróquia São Paulo Apóstolo. Idempotente: pode rodar em banco já populado
-- ou vazio (os inserts não fazem nada se o seed ainda não rodou).

alter table clergy
  add column if not exists birth_date text,
  add column if not exists death_date text;

update clergy
set death_date = '2026'
where name in ('Manoel José dos Santos', 'Inácio Filho');

update church_clergy as cc
set
  end_date = '2026',
  is_active = false
from clergy as c, churches as ch
where cc.clergy_id = c.id
  and cc.church_id = ch.id
  and ch.slug = 'sao-paulo-apostolo'
  and c.name in ('Manoel José dos Santos', 'Inácio Filho')
  and cc.is_active = true;

insert into clergy (name, role, title, image_url)
select
  'José Elielton da Silva',
  'parish-priest',
  'padre',
  '/images/pe-jose-elielton.jpeg'
where not exists (
  select 1 from clergy where name = 'José Elielton da Silva'
);

insert into clergy (name, role, image_url)
select
  'Denis Francisco Menezes',
  'deacon',
  '/images/diac-denis-francisco-menezes.jpeg'
where not exists (
  select 1 from clergy where name = 'Denis Francisco Menezes'
);

insert into church_clergy (church_id, clergy_id, is_active)
select ch.id, c.id, true
from churches as ch
join clergy as c
  on c.name in ('José Elielton da Silva', 'Denis Francisco Menezes')
where ch.slug = 'sao-paulo-apostolo'
  and not exists (
    select 1
    from church_clergy as existing
    where existing.church_id = ch.id
      and existing.clergy_id = c.id
  );
