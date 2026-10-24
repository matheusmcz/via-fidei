-- A bio descreve o clérigo. Paróquias atuais e anteriores ficam em church_clergy.

update clergy
set bio = 'Ordenado em 2005 pela Arquidiocese de Maceió. Dedicou-se especialmente à pastoral familiar e à formação de lideranças.'
where name = 'Manoel José dos Santos';

update clergy
set bio = 'Diácono permanente ordenado em 2015. Dedicou-se à pastoral social e ao acompanhamento das comunidades de base.'
where name = 'Inácio Filho';

update clergy
set bio = $bio$Vigário Geral da Arquidiocese de Maceió, nomeado em maio de 2025 pelo arcebispo Dom Beto Breis. Cargo de alta confiança na administração arquidiocesana.

Prefeito de Estudos do Seminário Maior Nossa Senhora da Assunção, designado em setembro de 2024 para coordenar a formação acadêmica.$bio$
where name = 'José Elielton da Silva';
