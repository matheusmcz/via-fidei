-- Títulos e funções do clero, independentes do cargo na paróquia.
-- Cônego, Vigário Geral e Prefeito de Estudos entram como flags.

alter table clergy
  add column if not exists honors text[] not null default '{}';

alter table clergy
  drop constraint if exists clergy_honors_check;

alter table clergy
  add constraint clergy_honors_check
  check (
    honors <@ array[
      'canon',
      'vicar-general',
      'prefect-of-studies'
    ]::text[]
  );

update clergy
set
  honors = array['canon', 'vicar-general', 'prefect-of-studies'],
  bio = $bio$Vigário Geral da Arquidiocese de Maceió, nomeado em maio de 2025 pelo arcebispo Dom Beto Breis. Cargo de alta confiança na administração arquidiocesana.

Prefeito de Estudos do Seminário Maior Nossa Senhora da Assunção, designado em setembro de 2024 para coordenar a formação acadêmica.

Atuou anteriormente como pároco da Paróquia São Sebastião, em Rio Largo, Alagoas.$bio$
where name = 'José Elielton da Silva';
