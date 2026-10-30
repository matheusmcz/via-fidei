# Aprendizados do fluxo de trabalho

Registro das retrospectivas do ciclo implementar → revisar → testar (ver [`.claude/rules/dev-workflow.md`](../rules/dev-workflow.md)). O objetivo é diminuir os achados de revisão ao longo do tempo e aumentar a assertividade das implementações.

## Quando registrar

Quando uma rodada de revisão trouxer **8 ou mais achados**, ou **3 ou mais críticos/altos**, ou quando o ciclo chegar à **rodada 4**.

## Como registrar

Uma entrada por ocorrência, da mais recente para a mais antiga:

```markdown
### AAAA-MM-DD — <ID da demanda> — rodada <N>

- **Achados:** <n> crítico · <n> alto · <n> médio · <n> baixo
- **Padrão:** <o que os achados têm em comum>
- **Causa raiz:** <regra desconhecida, contexto faltando, escopo grande, padrão antigo copiado…>
- **Ação preventiva:** <o que muda na forma de trabalhar>
- **Promovida a regra?** não | sim → `.claude/rules/<arquivo>.md`
```

Quando a mesma causa raiz aparecer de novo, a ação preventiva vira regra em `.claude/rules/`.

## Ações preventivas em vigor

_Nenhuma ainda._

## Registro

_Nenhuma retrospectiva ainda._
