# QA — Testar Aplicação

Execute os testes de QA do Via Fidei conforme definido em `docs/QA.md`.

## Passos

1. Verifique se o servidor está rodando (`npm run dev` na porta 3000)
2. Se não estiver, inicie o servidor
3. Execute os testes abaixo usando o navegador
4. Gere o relatório de resultados

## Testes

### Página inicial (http://localhost:3000/)
- Página carrega sem erros
- Busca por nome funciona (testar "São Paulo")
- Busca ignora acentos (testar "Sao")
- Filtro por bairro funciona
- Cards exibem imagem, nome e bairro
- Paginação funciona
- Clicar em card navega para detalhes

### Detalhes (http://localhost:3000/igreja/sao-paulo-apostolo)
- Página carrega sem erros
- Botão "Voltar" funciona
- Imagem, nome e endereço exibidos
- Seções de contato, clero e horários funcionam
- Abas de horários alternam corretamente

### 404 (http://localhost:3000/igreja/nao-existe)
- Página de erro personalizada exibida

### Responsividade
- Testar em desktop (1920x1080), tablet (768x1024) e mobile (375x667)

## Formato de Saída

| Teste | Status | Observação |
|-------|--------|------------|
| ...   | OK/FALHA | ...     |

Resumo final: X de Y testes passaram.
