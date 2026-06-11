---
name: memory-manager
description: Use at the start of any session to load project context, and at the end of any non-trivial task to update project-memory.md. Automatically triggered when a new session starts, a complex feature is completed, a bug is resolved, an architectural decision is made, or a pattern is established.
---

# Memory Manager

Gerencia memoria persistente entre sessoes via project-memory.md na raiz do projeto.

## Protocolo READ - inicio de sessao
1. Leia project-memory.md completo
2. Carregue contexto antes de qualquer acao
3. Se o arquivo nao existir, crie com a estrutura canonica lendo o projeto real

## Protocolo WRITE - fim de tarefa
1. Identifique qual secao foi afetada pela tarefa
2. Atualize SOMENTE essa secao
3. Preserve todo o historico anterior
4. Atualize "Ultima atualizacao" com data atual
5. Se houver metricas de skills, atualize a tabela

## Estrutura canonica do project-memory.md

```markdown
# [Nome do Projeto] - Project Memory

## Ultima atualizacao
[data]

## Arquitetura atual
[stack, estrutura de arquivos, fluxo principal]

## Decisoes tomadas
[lista: decisao - motivo]

## Bugs resolvidos
[lista: bug - fix aplicado]

## Padroes estabelecidos
[naming, design system, contratos de API, convencoes]

## Metricas de Skills
| Skill | Usos | Score medio | Ultimo problema | Tendencia |
|---|---|---|---|---|

## Proximas prioridades
[o que estava sendo trabalhado]
```

## Regras
- Nunca sobrescrever secoes inteiras sem preservar historico
- Score de skills: media ponderada ((score_anterior * (n-1) + novo_score) / n)
- Tendencia sobe se ultimo score maior que media, desce se menor
- Nao registrar tarefas triviais (correcoes de typo, ajustes menores)
