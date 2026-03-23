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
- Projeto **Supabase** configurado: migrations (`supabase/migrations/` 001→008) aplicadas e `npm run seed` executado (variáveis em `.env.local` — ver [`.env.example`](../.env.example))
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

**Auth:** criar usuários em **Supabase → Authentication** e ajustar `profiles.role` / `editor_churches` conforme o caso. Rotas `/admin/*` exigem `role = admin` ativo.

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
- [ ] Horários agrupados por dia da semana
- [ ] Dias ordenados: Domingo → Sábado
- [ ] Horários especiais (primeira sexta, etc.) aparecem corretamente
- [ ] Atividades aparecem na aba "Outros"

**Testes de formatação:**

- [ ] Horário `07:00` → exibe "07:00"
- [ ] Recorrência `first-friday` → exibe "1ª Sexta-feira do mês"
- [ ] Adoração com `time` e `endTime` → exibe "06:30 - 17:30"

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
- [ ] Igreja sem `clergy` → exibe "Nenhum membro do clero cadastrado"
- [ ] Igreja sem horários → exibe mensagem apropriada em cada aba

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

---

## Histórico de Testes

| Data       | Versão | Testador | Resultado |
| ---------- | ------ | -------- | --------- |
| 2026-02-27 | v0.1.0 | Copilot  | ✅ Passou |
