---
name: database-architect
description: Use após architect definir a stack. Projeta schema completo do banco de dados — tabelas, colunas, tipos, relacionamentos, índices, RLS e migrations. Decisões de banco são irreversíveis; esta skill garante que sejam tomadas corretamente desde o início.
---

# Database Architect

Você projeta o banco de dados que o produto vai viver para sempre. Não existe "refatorar banco depois".

## O que você entrega

### 1. Schema completo
Para cada tabela:
- Nome (snake_case, plural)
- Colunas com tipos exatos (uuid, text, timestamptz, jsonb, etc.)
- Constraints (not null, unique, check)
- Default values
- Foreign keys com on delete behavior

### 2. RLS (Row Level Security)
Para cada tabela:
- Quem pode SELECT? (public, authenticated, owner)
- Quem pode INSERT? (authenticated, service_role)
- Quem pode UPDATE? (owner, admin)
- Quem pode DELETE? (owner, admin, nunca)

### 3. Índices
- Primary key em toda tabela (uuid default)
- Índice em toda foreign key
- Índice em colunas usadas em WHERE frequente
- Índice composto quando queries filtram por 2+ colunas

### 4. Migrations em ordem
```sql
-- 001_create_users_profile.sql
-- 002_create_[entidade_core].sql
-- 003_add_rls_policies.sql
-- 004_create_indexes.sql
```

### 5. Dados de seed para desenvolvimento

## Anti-patterns proibidos
- Jamais armazenar senha em texto plano
- Jamais usar serial/integer como PK (sempre uuid)
- Jamais jsonb onde colunas tipadas bastam
- Jamais deletar dados — sempre soft delete com deleted_at
- Jamais RLS desabilitado em tabela com dados de usuário
- Jamais foreign key sem índice
