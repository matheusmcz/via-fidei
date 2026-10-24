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
- Projeto **Supabase** configurado: migrations (`supabase/migrations/` 001→010) aplicadas e `npm run seed` executado (variáveis em `.env.local` — ver [`.env.example`](../.env.example))
- Para os fluxos logados (CT-011 a CT-014): `npm run bootstrap-users` com `ADMIN_*` e `EDITOR_*` no `.env.local`. `EDITOR_CHURCH_ID` precisa ser o `id` atual de uma igreja no banco (os IDs mudam se o seed for refeito); sem ele, o script usa a primeira igreja.
- Projeto Supabase **ativo**: no plano gratuito ele é pausado após inatividade e o endereço deixa de resolver (`ENOTFOUND` no log, erro 500 na home). Restaurar no Dashboard antes de testar.
- **Build / Vercel:** URL e chave pública do Supabase disponíveis no ambiente do deploy (Production **e** Preview se houver PRs). Ver [ARCHITECTURE.md](../ARCHITECTURE.md) (seção Supabase + Vercel) e [README](../README.md) (instalação)

### Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

### Executar testes manuais

Acesse as URLs listadas nos casos de teste e verifique os comportamentos esperados.

### Executar validação automatizada (via Copilot)

Peça ao Copilot: "run QA tests" ou "testar a aplicação"

#### O que o Copilot testa automaticamente:

- ✅ **Page Load**: Todas as rotas carregam sem erros (HTTP 200/404)
- ✅ **Compilação**: Sem erros de TypeScript ou build
- ✅ **404 Handler**: Páginas inexistentes retornam 404 corretamente
- ✅ **SSR**: Páginas renderizam no servidor

#### O que requer teste manual:

- 🔧 **Busca**: Filtros são client-side (useState)
- 🔧 **Filtro por bairro**: Requer interação com dropdown
- 🔧 **Paginação**: Requer clique nos botões
- 🔧 **Links externos**: WhatsApp, Instagram, etc.
- 🔧 **Responsividade**: Verificar em diferentes tamanhos de tela

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

> **Divergência conhecida (23/10/2026):** para visitante e para editor não vinculado, as seções vazias mostram só o card com o título, sem mensagem (`EditableSection` retorna `null`). As mensagens acima aparecem apenas para admin e editor vinculado, junto com o botão "Adicionar". Exemplo: `/igreja/catedral-nossa-senhora-dos-prazeres`. Ver pendência em [ARCHITECTURE.md](../ARCHITECTURE.md#estado-atual-e-pendências-atualizado-em-23102026).

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
- [ ] `/admin/usuarios/novo`: criar editor com nome, email, senha (mín. 6) e igrejas → volta para a lista com o editor novo
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
