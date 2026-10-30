# Fluxo de desenvolvimento: implementar → revisar → testar

Toda demanda de código (funcionalidade, correção de bug, refatoração, migration) segue este ciclo de 3 camadas. O usuário autorizou o uso dos agentes `reviewer` e `tester` neste fluxo: chamá-los **automaticamente**, sem pedir confirmação.

Fica fora do ciclo: mudança só de documentação, board ou regras, a menos que o usuário peça revisão.

```
1. Preparar ─► 2. Implementar ─► 3. Revisar (reviewer) ─► 4. Triagem ─┐
                     ▲                                                 │
                     └──── há crítico/alto corrigido? nova rodada ◄────┘
                                         │ não (aprovado)
                                         ▼
                               5. Testar (tester) ── falhou? corrigir e voltar ao 3
                                         │ passou
                                         ▼
                               6. Fechar (board, docs, relatório)
```

## 1. Preparar

- Ler a demanda no [board](../../docs/board.md) e as decisões (D1…Dn) que a afetam.
- Regra de produto ou de domínio que não está clara: **perguntar antes**.
- Branch a partir de `origin/develop` (ver `git-workflow.md`).

## 2. Implementar

- **TDD sempre que possível:** escrever o teste que falha, implementar o mínimo para passar e depois refatorar. Prioridade de cobertura: regras de domínio (`lib/utils`), mapeamentos das queries, Server Actions e fluxos críticos (permissões).
  - Enquanto a infraestrutura de testes não existir (board VF-036), registrar no relatório quais testes teriam sido escritos.
- Seguir os **princípios** abaixo e as demais regras de `.claude/rules/`.
- Antes de chamar o revisor: `npx tsc --noEmit` e `npm run lint` precisam passar, para não gastar rodada com erro mecânico.

## 3. Revisar

Chamar o agente `reviewer` passando:
- a demanda (ID do board e objetivo);
- o número da rodada (1 a 5);
- a partir da rodada 2: os achados anteriores e o que foi feito com cada um (corrigido, enviado ao board com o ID, ou contestado com justificativa).

## 4. Triagem dos achados

| Severidade | Ação |
|-----------|------|
| **Crítico** | Corrigir imediatamente |
| **Alto** | Corrigir imediatamente |
| **Médio / Baixo** | Avaliar: corrigir agora se estiver no código alterado, for pequeno e não ampliar o escopo; senão, criar item no board (origem `revisão`) |

- Discordância de um achado crítico ou alto: não ignorar em silêncio. Registrar a justificativa e enviar ao revisor na rodada seguinte; se o desacordo persistir em um **crítico**, perguntar ao usuário.
- Houve correção de crítico ou alto: nova rodada, revisando as correções e o que mudou desde a rodada anterior.
- O ciclo termina quando o revisor retorna **sem críticos nem altos** (veredito `APROVADO`).
- **Limite: 5 rodadas.** Se a rodada 5 ainda tiver crítico ou alto, parar, não seguir para os testes e reportar ao usuário o que está pendente.

### Muitos achados → retrospectiva

Considera-se "muitos" quando uma rodada traz **8 ou mais achados**, ou **3 ou mais críticos/altos**, ou quando o ciclo chega à **rodada 4**. Nesse caso:

1. Analisar a causa raiz (regra desconhecida? contexto faltando? escopo grande demais? padrão do código antigo copiado?).
2. Registrar em [`.claude/docs/APRENDIZADOS.md`](../docs/APRENDIZADOS.md) com a ação preventiva.
3. Se a mesma causa já apareceu antes, promover a ação a regra em `.claude/rules/` e citar isso no relatório.

## 5. Testar

Chamar o agente `tester` com a demanda e a lista de arquivos alterados. Falhou: corrigir, fazer nova rodada de revisão da correção (conta no limite de 5) e testar de novo.

## 6. Fechar

- Board: mover a demanda para **Concluído**; criar os itens de achados médios e baixos adiados (origem `revisão`, com o ID do achado, ex.: `R2-3`).
- Atualizar `.claude/docs/ARCHITECTURE.md` se mudou estrutura, schema, permissões ou regras de domínio.
- Commit e PR só quando o usuário pedir.
- Responder com o **relatório final**:

```markdown
## Relatório — <ID e título da demanda>

### O que foi implementado
### Como
(abordagem, arquivos principais, decisões técnicas)
### Por quê
(motivação, regra de negócio, alternativas descartadas)
### Revisão
(nº de rodadas; achados por severidade; o que foi corrigido)
### Testes
(resultado por camada: tipos, lint, unitários, integração, e2e, build)
### Enviado ao board
(ID novo, severidade, achado de origem)
### Aprendizados
(se houve retrospectiva)
```

## Princípios (valem para quem implementa e para quem revisa)

### Clean Architecture adaptada ao Next.js

| Camada | Onde | Pode depender de |
|--------|------|------------------|
| Domínio: tipos e regras puras | `types/`, `lib/utils/` | Só de domínio. Nada de React, Next ou Supabase |
| Dados: leitura e escrita | `lib/supabase/queries/`, Server Actions em `features/*/actions.ts` | Domínio e clientes Supabase |
| Apresentação | `app/`, componentes em `features/` | Domínio, queries e actions |

- Componentes não montam consultas Supabase: usam queries ou actions. O código antigo de `app/admin/` ainda consulta direto; não copiar esse padrão.
- Regra de negócio (permissão, cargo, agrupamento de horário) mora em função pura testável, não espalhada em JSX.
- A permissão real é do RLS e da checagem na Server Action. A UI só esconde.

### SOLID, no que se aplica a React e TypeScript

- **S** — um componente ou função tem uma responsabilidade; separar busca de dados, regra e apresentação.
- **O** — estender por composição ou mapeamento (ex.: `ROLE_LABELS`), não por `if`/`switch` espalhado.
- **L** — variações de um componente respeitam o mesmo contrato de props.
- **I** — props mínimas; não passar `church` inteiro quando só se usa o `id`.
- **D** — depender de abstrações (funções de query, actions), não do cliente Supabase dentro da UI.

### Clean Code

- Nomes que revelam a intenção, no vocabulário do domínio (paróquia, clérigo, cargo).
- Funções pequenas, sem efeitos colaterais escondidos; early return.
- Sem duplicação de lógica que já existe em `lib/utils/`.
- Erros tratados e visíveis: não engolir `error` do Supabase, não usar `alert()`.
- Sem `console.log`, `debugger`, código comentado ou `any`.
