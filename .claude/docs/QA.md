# QA Testing Guide — Via Fidei

Este documento define os casos de teste, comportamentos esperados e fluxos de validação para a aplicação Via Fidei.

## Sumário

1. [Como Executar os Testes](#como-executar-os-testes)
2. [Páginas da Aplicação](#páginas-da-aplicação)
3. [Casos de Teste](#casos-de-teste)
4. [Checklist de Regressão](#checklist-de-regressão)

---

## Como Executar os Testes

### Pré-requisitos

- Node.js 24.x (ver `package.json` → `engines` e `.nvmrc`)
- npm ou pnpm instalado
- Projeto **Supabase** configurado: migrations (`supabase/migrations/` 001→014) aplicadas e `npm run seed` executado (variáveis em `.env.local` — ver [`.env.example`](../../.env.example))
- Para os fluxos logados (CT-011 a CT-014): `npm run bootstrap-users` com `ADMIN_*` e `EDITOR_*` no `.env.local`. `EDITOR_CHURCH_ID` precisa ser o `id` atual de uma igreja no banco (os IDs mudam se o seed for refeito); sem ele, o script usa a primeira igreja.
- Projeto Supabase **ativo**: no plano gratuito ele é pausado após inatividade e o endereço deixa de resolver (`ENOTFOUND` no log, erro 500 na home). Restaurar no Dashboard antes de testar.
- **Build / Vercel:** URL e chave pública do Supabase disponíveis no ambiente do deploy (Production **e** Preview se houver PRs). Ver [ARCHITECTURE.md](ARCHITECTURE.md) (seção Supabase + Vercel) e [README](../../README.md) (instalação)

### Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

### Executar testes manuais

Acesse as URLs listadas nos casos de teste e verifique os comportamentos esperados.

### Executar os testes automatizados

```bash
npm run test:unit         # regras puras de lib/utils (Vitest, node)
npm run test:integration  # componentes e queries com Supabase simulado (Vitest + Testing Library, jsdom)
npm run test:e2e          # smoke das páginas públicas (Playwright, Chromium, porta 3203)
```

- Nenhum teste grava dados. O e2e lê o Supabase configurado no `.env.local` (ou nos secrets do CI) e precisa do projeto ativo.
- Primeira vez: `npx playwright install chromium`. O `test:e2e` faz `npm run build` e sobe `next start -p 3203`; com `E2E_SKIP_BUILD=1` reaproveita o build existente.
- Testes que gravam dados (login real, edição, criação de editor) dependem do Supabase local (D10) e ainda não existem: CT-011 (login com credenciais), CT-012 e CT-013 seguem manuais.
- O CI (`.github/workflows/ci.yml`) roda lint, tipos, unitários, integração, build e e2e em PR e push para `develop` e `main`.

#### Casos cobertos por teste automatizado

| Caso | Teste | O que cobre |
|------|-------|-------------|
| CT-001 | `features/churches/church-list.integration.test.tsx`, `tests/e2e/public-pages.spec.ts` | Ordem alfabética, link do card, filtro por bairro, paginação de 20, busca na home real |
| CT-002 | `tests/e2e/public-pages.spec.ts`, `lib/supabase/queries/churches.integration.test.ts` | Página da igreja responde 200 com nome e seção "Clero"; na query, contato, horários por categoria, atividades, clero (com `endDate`) e ministérios por categoria, seções vazias omitidas e erro do Supabase lançado (não vira 404) |
| CT-003 | `lib/utils/contact.test.ts`, `features/churches/contact/church-contact-section.integration.test.tsx` | Formatação e links de telefone, WhatsApp, e-mail, Instagram, Facebook e site |
| CT-004 | `lib/utils/clergy.test.ts`, `features/churches/clergy/clergy-list.integration.test.tsx`, e2e | Só ativos, ordem por cargo, "Pe."/"Mons."/sufixo, período "Atual", histórico |
| CT-005 | `lib/utils/schedule.test.ts` | Formato de hora, intervalo, recorrência, agrupamento e ordem dos dias (a UI das abas segue manual) |
| CT-006 | `lib/utils/slugify.test.ts`, `church-list.integration.test.tsx`, e2e | Busca ignorando acento e caixa |
| CT-007 | `church-list.integration.test.tsx`, `church-contact-section.integration.test.tsx`, `clergy-list.integration.test.tsx`, e2e | Estados vazios da busca, do contato e do clero |
| CT-010 | `church-contact-section.integration.test.tsx` | `target="_blank"` e `rel="noopener noreferrer"` nos contatos |
| CT-011 | `tests/e2e/public-pages.spec.ts`, `features/auth/actions.integration.test.ts`, `features/auth/access.test.ts` | `/login` renderiza com `noindex`; `/admin` sem sessão vai para `/login`; login recusa perfil desativado (ou sem perfil) e encerra a sessão; destino por papel |
| CT-012 | `features/auth/admin-actions.integration.test.ts`, `features/auth/admin-validation.test.ts` | Validação da entrada das actions de admin (email, nome, senha, UUIDs); alvo só `role = 'editor'`; `createEditor` ativa o perfil explicitamente |
| CT-013 | `features/auth/auth-provider.integration.test.tsx`, `features/auth/access.test.ts` | `canEditChurch` só para perfil ativo; perfil desativado tem a sessão encerrada no `AuthProvider` |
| 404 | `tests/e2e/public-pages.spec.ts` | `/igreja/nao-existe` responde 404 com "Igreja não encontrada" |

Os mapeamentos das queries (`getChurches`, `getChurchSlugs`, `getChurchBySlug`, `getAllClergyWithChurch`) têm testes em `lib/supabase/queries/*.integration.test.ts`, e `findQueryError` em `lib/supabase/queries/query-error.test.ts`. Seguem manuais: responsividade (CT-008, CT-014), dark mode, SEO completo (CT-009), links externos reais e os fluxos logados.

---

## Páginas da Aplicação

| Rota               | Descrição                                      | Status          |
| ------------------ | ---------------------------------------------- | --------------- |
| `/`                | Listagem de igrejas com busca e filtro         | ✅ Implementado |
| `/igreja/[slug]`   | Página de detalhes da igreja (dados Supabase) | ✅ Implementado |
| `/clero`           | Listagem de clérigos                           | ✅ Implementado |
| `/login`           | Login (email/senha Supabase; rota escondida)   | ✅ Implementado |
| `/admin`           | Dashboard admin (só usuário `admin` em `profiles`) | ✅ Implementado |
| `/admin/usuarios`  | Lista de editores e atalho para novo           | ✅ Implementado |
| `/admin/usuarios/[id]` | Detalhe do editor + vínculos com igrejas   | ✅ Implementado |
| `/admin/usuarios/novo` | Criar editor                               | ✅ Implementado |

**Auth:** criar usuários com `npm run bootstrap-users` (ou em **Supabase → Authentication**, ajustando `profiles.role` / `editor_churches`). Rotas `/admin/*` exigem `role = admin` ativo: sem sessão redirecionam para `/login`; com sessão de editor, para `/`. Ainda não há botão de sair na UI — para trocar de usuário, limpar os cookies do site.

---

## Casos de Teste

### CT-001: Listagem de Igrejas

**Página:** `/`

**Comportamento esperado:**

- [ ] Exibe header com título "Via Fidei"
- [ ] Exibe campo de busca por nome
- [ ] Exibe dropdown de filtro por bairro
- [ ] Exibe lista de cards de igrejas
- [ ] Cards mostram: imagem (ou placeholder), nome, bairro
- [ ] Igrejas ordenadas alfabeticamente
- [ ] Exibe paginação quando há muitas igrejas

**Testes de interação:**

- [ ] Buscar por "São Paulo" → exibe apenas igrejas com "São Paulo" no nome
- [ ] Filtrar por bairro "Salvador Lira" → exibe apenas igrejas do bairro
- [ ] Limpar busca e filtro → exibe todas as igrejas
- [ ] Clicar em um card → navega para página de detalhes

---

### CT-002: Página de Detalhes da Igreja

**Página:** `/igreja/sao-paulo-apostolo`

**Comportamento esperado:**

- [ ] Exibe botão "Voltar para listagem"
- [ ] Exibe imagem da igreja (ou placeholder)
- [ ] Exibe nome da igreja
- [ ] Exibe endereço completo
- [ ] Endereço é clicável quando `googleMapsUrl` existe
- [ ] Seção "Contato" com informações de contato
- [ ] Seção "Clero" com lista de clérigos ativos
- [ ] Seção "Horários" com abas (Missas, Adoração, Confissão, Outros)

**Testes de interação:**

- [ ] Clicar no botão "Voltar" → retorna para `/`
- [ ] Clicar no endereço → abre Google Maps em nova aba
- [ ] Clicar em contato de telefone → inicia chamada (`tel:`)
- [ ] Clicar em WhatsApp → abre WhatsApp Web
- [ ] Clicar em Instagram/Facebook → abre rede social
- [ ] Trocar entre abas de horários → exibe horários correspondentes

---

### CT-003: Seção de Contato

**Página:** `/igreja/sao-paulo-apostolo`

**Pré-condição:** Igreja deve ter `contact` definido

**Comportamento esperado:**

- [ ] Exibe ícone de telefone com número formatado `(82) 99999-9999`
- [ ] Exibe ícone de WhatsApp com número formatado
- [ ] Exibe ícone de e-mail com endereço
- [ ] Exibe ícone de Instagram com handle `@paroquia`
- [ ] Exibe ícone de Facebook com nome da página
- [ ] Exibe ícone de Website com URL limpa

**Testes de formatação:**

- [ ] Telefone `+5582999999999` → exibe `(82) 99999-9999`
- [ ] Instagram `https://instagram.com/paroquia` → exibe `@paroquia`
- [ ] Website `https://site.com/` → exibe `site.com`
- [ ] Website `https://site.com/path/` → exibe `site.com/path/`

---

### CT-004: Seção de Clero

**Página:** `/igreja/sao-paulo-apostolo`

**Comportamento esperado:**

- [ ] Exibe apenas clérigos ativos (sem `endDate`)
- [ ] Card mostra: foto (ou iniciais), nome formatado, cargo, período
- [ ] Pároco aparece primeiro, depois vigários, depois diáconos
- [ ] Seção "Histórico" colapsável com clérigos anteriores

**Testes de formatação:**

- [ ] Padre → exibe "Pe. Nome"
- [ ] Monsenhor → exibe "Mons. Nome"
- [ ] Com sufixo OFM → exibe "Pe. Nome, OFM"
- [ ] Período ativo → exibe "2021 - Atual"
- [ ] Período encerrado → exibe "2015 - 2020"

---

### CT-005: Seção de Horários

**Página:** `/igreja/sao-paulo-apostolo`

**Comportamento esperado:**

- [ ] Aba "Missas" selecionada por padrão
- [ ] Horários agrupados por dia da semana, em accordion: o primeiro dia vem expandido e abrir um dia fecha o anterior
- [ ] Dias ordenados: Domingo → Sábado
- [ ] Horários especiais (primeira sexta, etc.) aparecem corretamente
- [ ] Atividades aparecem na aba "Outros"

**Testes de formatação:**

- [ ] Horário `07:00` → exibe "7h"; `18:30` → exibe "18h30"
- [ ] Recorrência `first-friday` → exibe "1ª Sexta-feira do mês"
- [ ] Adoração com `time` e `endTime` → exibe "6h30 às 17h30"

---

### CT-006: Busca Ignorando Acentos

**Página:** `/`

**Comportamento esperado:**

- [ ] Buscar "Sao" encontra "São Paulo Apóstolo"
- [ ] Buscar "são" encontra "São Paulo Apóstolo"
- [ ] Buscar "SAO" encontra "São Paulo Apóstolo"
- [ ] Buscar "Fátima" encontra "Nossa Senhora de Fátima"
- [ ] Buscar "Fatima" encontra "Nossa Senhora de Fátima"

---

### CT-007: Empty States

**Página:** `/`

**Comportamento esperado:**

- [ ] Buscar por texto inexistente → exibe mensagem "Nenhuma igreja encontrada"
- [ ] Filtrar por bairro sem igrejas → exibe mensagem apropriada

**Página:** `/igreja/[slug]`

**Comportamento esperado:**

- [ ] Igreja sem `contact` → exibe "Nenhuma informação de contato disponível"
- [ ] Igreja sem `clergy` → exibe "Nenhum clérigo cadastrado."
- [ ] Igreja sem horários → exibe "Nenhum horário cadastrado."
- [ ] Igreja sem ministérios → exibe "Nenhum grupo, movimento ou pastoral cadastrado."

> **Divergência conhecida (23/10/2026):** para visitante e para editor não vinculado, as seções vazias mostram só o card com o título, sem mensagem (`EditableSection` retorna `null`). As mensagens acima aparecem apenas para admin e editor vinculado, junto com o botão "Adicionar". Exemplo: `/igreja/catedral-nossa-senhora-dos-prazeres`. Ver pendência em [ARCHITECTURE.md](../../docs/board.md).

---

### CT-008: Responsividade

**Dispositivos a testar:**

- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Verificações:**

- [ ] Layout não quebra em nenhum breakpoint
- [ ] Cards de igreja se organizam em grid responsivo
- [ ] Seção de contato exibe 2 colunas em desktop, 1 em mobile
- [ ] Imagens mantêm proporção 16:9
- [ ] Texto não é cortado ou overflow

---

### CT-009: SEO e Metadata

**Página:** `/igreja/sao-paulo-apostolo`

**Verificações (inspecionar head):**

- [ ] `<title>` contém nome da igreja
- [ ] `<meta name="description">` contém nome, bairro e endereço
- [ ] Open Graph tags presentes (`og:title`, `og:description`, `og:image`)
- [ ] Twitter card tags presentes

---

### CT-010: Navegação e Links

**Verificações:**

- [ ] Todos os links externos abrem em nova aba (`target="_blank"`)
- [ ] Links externos têm `rel="noopener noreferrer"`
- [ ] Links internos navegam sem reload completo
- [ ] Botão voltar funciona corretamente

---

### CT-011: Login e proteção de rotas

**Página:** `/login`, `/admin`

**Comportamento esperado:**

- [ ] Sem sessão, `/admin` e `/admin/usuarios/novo` redirecionam para `/login`
- [ ] Enviar o formulário vazio é bloqueado (campos obrigatórios)
- [ ] Credenciais inválidas → exibe "Email ou senha inválidos"
- [ ] Login de admin → redireciona para `/admin`
- [ ] Login de editor → redireciona para `/`
- [ ] Editor acessando `/admin` → redireciona para `/`
- [ ] Login de editor ou admin **desativado** → fica em `/login` com "Esta conta está desativada. Fale com o administrador do Via Fidei para reativá-la." e sem sessão (recarregar a página não mostra lápis nem dá acesso ao `/admin`)
- [ ] Editor logado que é desativado pelo admin: ao recarregar qualquer página, a sessão é encerrada e o lápis some

---

### CT-012: Painel admin

**Pré-condição:** logado como admin

**Comportamento esperado:**

- [ ] `/admin` mostra cards com total de igrejas, editores e clérigos; o card "Editores" leva para `/admin/usuarios`
- [ ] Header destaca o link da página atual; "Voltar ao site" leva para `/`
- [ ] `/admin/usuarios` lista os editores com nome, email e igrejas vinculadas
- [ ] Clicar em um editor abre `/admin/usuarios/[id]` com status, data de criação e lista de igrejas (vinculadas marcadas)
- [ ] Marcar/desmarcar igrejas mostra "Salvar vínculos"; salvar atualiza a lista
- [ ] "Desativar"/"Ativar" alterna o status (badge "Inativo" na lista)
- [ ] Erro ao alternar status ou salvar vínculos aparece em vermelho abaixo do botão (sem `alert()`)
- [ ] `/admin/usuarios/[id]` com o id de um admin (inclusive o próprio) → 404; chamando a action direto com esse id → "Editor não encontrado", sem alterar nada
- [ ] `/admin/usuarios/novo`: criar editor com nome, email, senha (mín. 6) e igrejas → volta para a lista com o editor novo, já **ativo**
- [ ] `/admin/usuarios/novo`: email inválido, nome só com espaços, senha com menos de 6 ou mais de 72 caracteres → mensagem de erro no formulário, nenhum usuário criado
- [ ] Usuário criado fora do painel (Dashboard do Supabase, cadastro público) nasce **inativo** (migration `015`): não edita nada até o admin ativá-lo. Roteiro: `supabase/tests/015_perfil_inicial_sem_permissao_verificacao.sql` (OK 1 a OK 7, não grava nada)
- [ ] Página de admin e de login: título "Admin | Via Fidei" / "Login | Via Fidei" e `<meta name="robots" content="noindex, nofollow">`
- [ ] Na página de uma igreja: "Gerenciar editores", lápis nas seções e, em seções vazias, mensagem + botão "Adicionar"

> Ao testar criação, usar email descartável (ex: `e2e-editor-<timestamp>@example.com`) e removê-lo depois pela Auth Admin API ou pelo Dashboard.

---

### CT-013: Editor de igreja

**Pré-condição:** logado como editor vinculado a uma igreja (ex: São Paulo Apóstolo)

**Comportamento esperado:**

- [ ] Na igreja vinculada: lápis nas seções; sem "Gerenciar editores"
- [ ] Em igreja não vinculada: nenhum controle de edição (igual ao visitante)
- [ ] `/admin` redireciona para `/`
- [ ] Pela API (sessão do editor), `update profiles set role = 'admin'` ou `is_active` na própria linha falha com `42501`; alterar o próprio `name` funciona
- [ ] Permissões da D3 no banco (migration `014`): rodar `supabase/tests/014_rls_permissoes_editor_verificacao.sql` no SQL Editor; deve terminar sem erro (OK 1 a OK 7, com o 4b) e não grava nada. Cobre: editor altera contato, foto e link do Maps da igreja vinculada; não altera nome, slug, endereço, bairro nem tipo (`42501`); não mexe em `church_clergy`, `clergy` nem no catálogo `ministries`; não cria nem apaga igreja; não altera igreja não vinculada; continua gerenciando horários, atividades e grupos/movimentos/pastorais; admin altera tudo
- [ ] Divergência conhecida da UI: o editor ainda vê o lápis no nome da igreja e na seção Clero (`canEditChurch` vale para a igreja inteira); a gravação é recusada pelo banco

---

### CT-014: Responsividade do admin

**Páginas:** `/admin`, `/admin/usuarios`, `/admin/usuarios/[id]`, `/admin/usuarios/novo`

**Verificações (320, 375, 768, 1024 e 1280 px):**

- [ ] Sem rolagem horizontal
- [ ] Header: no mobile, só ícones na navegação; a partir de 768 px, ícones + textos
- [ ] Dashboard: cards em 1 coluna no mobile e 3 a partir de 640 px
- [ ] Lista de editores: 1 coluna no mobile, 2 no tablet, 3 em telas largas; botão "Novo editor" com largura total no mobile
- [ ] Email muito longo é truncado na lista e quebra linha no detalhe
- [ ] Tema claro e escuro

---

## Checklist de Regressão

Use este checklist antes de cada deploy:

### Funcional

- [ ] Home carrega sem erros
- [ ] Busca funciona
- [ ] Filtro por bairro funciona
- [ ] Navegação para detalhes funciona
- [ ] Seção de contato exibe corretamente
- [ ] Seção de clero exibe corretamente
- [ ] Horários exibem corretamente
- [ ] Voltar para listagem funciona

### Visual

- [ ] Sem erros de console
- [ ] Imagens carregam (ou placeholder)
- [ ] Layout responsivo OK
- [ ] Dark mode funciona (se aplicável)

### Performance

- [ ] Página carrega em < 3s
- [ ] Sem layout shift visível
- [ ] Imagens otimizadas

---

## URLs de Teste

| Cenário                    | URL                                                              |
| -------------------------- | ---------------------------------------------------------------- |
| Home                       | http://localhost:3000/                                           |
| Igreja com dados completos | http://localhost:3000/igreja/sao-paulo-apostolo                  |
| Igreja sem foto            | http://localhost:3000/igreja/catedral-nossa-senhora-dos-prazeres |
| Igreja em Pajuçara         | http://localhost:3000/igreja/nossa-senhora-de-fatima-pajucara    |
| Igreja em Jatiúca          | http://localhost:3000/igreja/divino-espirito-santo               |
| Igreja Gruta de Lourdes    | http://localhost:3000/igreja/nossa-senhora-de-lourdes            |
| Igreja inexistente         | http://localhost:3000/igreja/nao-existe                          |
| Login                      | http://localhost:3000/login                                      |
| Dashboard admin            | http://localhost:3000/admin                                      |
| Editores (admin)           | http://localhost:3000/admin/usuarios                             |
| Novo editor (admin)        | http://localhost:3000/admin/usuarios/novo                        |

---

## Histórico de Testes

| Data       | Versão | Testador | Resultado |
| ---------- | ------ | -------- | --------- |
| 2026-02-27 | v0.1.0 | Copilot  | ✅ Passou |
| 2026-10-23 | v0.1.0 (`feat/create-users`) | Cursor + Playwright MCP | ⚠️ Passou com ressalvas: CT-001 a CT-014 OK, exceto divergência em CT-007 (seções vazias para visitante). Reteste após as correções do code review (migration `010` e actions de admin): CT-012 completo, incluindo "Salvar vínculos" e "Desativar/Ativar", e bloqueio de autopromoção do CT-013 |
| 2026-10-30 | v0.1.0 (`chore/testes-e-ci`) | Vitest + Playwright | ✅ Primeira execução automatizada: unitários, integração e smoke e2e passando |
