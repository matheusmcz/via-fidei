# Adicionar Igreja

Adicione uma nova igreja ao arquivo `data/churches.ts`.

## Informações Necessárias

Pergunte ao usuário (se não fornecidas):
1. Nome completo da igreja
2. Endereço
3. Bairro
4. URL da imagem (opcional)
5. Contato: telefone, WhatsApp, email, Instagram, Facebook, website (opcionais)
6. Horários de missas (dia da semana + horário HH:MM)
7. Horários de adoração e confissão (opcionais)
8. Clero atual: nome, cargo, título, sufixo religioso (opcionais)

## Passos

1. Leia `types/church.ts` para confirmar a interface
2. Leia `data/churches.ts` para ver o padrão existente
3. Gere o `id` único (ex: `"igreja-nome-bairro"`)
4. Gere o `slug` usando o padrão de `lib/utils/slugify.ts`
5. Adicione a igreja ao array `churches` em ordem alfabética
6. Valide: IDs únicos, horários em formato HH:MM, dayOfWeek entre 0-6
7. Execute `npm run build` para confirmar que não há erros de tipo

## Validações

- `id` e `slug` únicos no array
- Horários no formato `HH:MM`
- `dayOfWeek` entre 0 (domingo) e 6 (sábado)
- Telefones com formato `+55XXXXXXXXXXX`
- URLs de redes sociais com `https://`
- `role` do clero: `parish-priest`, `vicar`, `deacon` ou `administrator`
