# Base de referência do Pelazzo

Esta pasta define como a IA deve tomar decisões de produto, regras de negócio e arquitetura. O scaffold executável está em `frontend` e `backend`; o README da raiz explica a execução.

## Documentos

| Arquivo                  | Objetivo                                             |
| ------------------------ | ---------------------------------------------------- |
| `product.md`             | Objetivo, perfis, jornadas e escopo                  |
| `business-rules.md`      | Regras obrigatórias do domínio                       |
| `architecture.md`        | Arquitetura recomendada e limites técnicos           |
| `architecture-rule.md`   | Regra original fornecida pelo responsável            |
| `database/README.md`     | Arquitetura do banco, diagrama, transações e índices |
| `database/schema.sql`    | Modelo físico PostgreSQL de referência               |
| `data-model.md`          | Entidades, relações e invariantes                    |
| `acceptance-criteria.md` | Cenários que comprovam o comportamento               |
| `decisions.md`           | Premissas adotadas e decisões em aberto              |

## Como usar

Peça à IA: “Leia o AGENTS.md e a pasta .ai, implemente o MVP seguindo essas regras e registre mudanças de decisão em .ai/decisions.md”.

Requisitos expressos pelo usuário estão separados de premissas do MVP. As premissas podem ser revisadas pelo responsável. Nenhuma documentação autoriza publicar o aplicativo, contratar serviços ou executar migrações destrutivas.
