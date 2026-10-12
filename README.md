# Pelazzo

Base de um aplicativo para organizar peladas, gerenciar mensalistas e diaristas, acompanhar o caixa das partidas e sortear times. Este chore prepara a infraestrutura; as funcionalidades do MVP ainda serão implementadas.

As regras de produto, negócio e arquitetura estão na pasta [.ai](.ai/README.md). O [AGENTS.md](AGENTS.md) orienta agentes de IA a consultar essa documentação antes de implementar o projeto.

## Stack

| Camada       | Tecnologia                                                        |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | React 19.3.0 + Vite 8.3.4 + TypeScript                            |
| Backend      | NestJS 12.1.2 + TypeScript, Clean Architecture e Modular Monolith |
| Persistência | PostgreSQL 18.6 + Prisma 7.10.0                                   |
| Runtime      | Node.js 24 e npm 11 ou superior                                   |

As versões foram consultadas em 11/10/2026. Dependências diretas e lockfile fixam as versões instaladas. TypeScript 6.0.3 atende à compatibilidade do CLI NestJS e typescript-eslint; versões RC/beta não são usadas.

## Executar localmente

Instale Node.js 24 e Docker com o Engine em execução. Na raiz:

```sh
npm ci
```

Copie `backend/.env.example` para `backend/.env` e `frontend/.env.example` para `frontend/.env`. No PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Os arquivos de exemplo contêm apenas credenciais fictícias do ambiente local. Não use essa senha em ambientes publicados.

```sh
npm run db:up
npm run db:deploy
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api
- Liveness: `GET /api/health` (processo ativo)
- Readiness: `GET /api/health/ready` (consulta real via Prisma; HTTP 503 se o banco estiver indisponível)

O Vite encaminha `/api` ao backend no desenvolvimento. Em produção, configure um reverse proxy ou `VITE_API_BASE_URL` público no build e ajuste `FRONTEND_ORIGIN` no backend. Nunca coloque `DATABASE_URL` em variável `VITE_*`.

Sem PostgreSQL, a API pode iniciar com URL configurada; o readiness e a tela inicial informam indisponibilidade. Não há autenticação ou endpoints de dados pessoais neste scaffold.

## Comandos

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

`npm test` verifica configuração, casos de uso de saúde, tradução para respostas HTTP e integridade da migration em PostgreSQL embarcado descartável (PGlite), sem abrir portas locais ou exigir Docker. Esse teste não substitui a validação no PostgreSQL 18: o CI aplica a migration nesse banco e testa os endpoints e a conexão do backend compilado com `node scripts/smoke.mjs`.

Overrides restritos ao tooling Prisma atualizam `deepmerge-ts` e `mysql2` para versões corrigidas, mantendo o Prisma estável. Reavaliar esses overrides ao atualizar o Prisma.

`npm run db:generate` gera o cliente Prisma ignorado pelo Git. Build, typecheck e testes do backend também o geram automaticamente. `npm run db:validate` valida o modelo. `npm run db:deploy` aplica migrations versionadas; para criar novas, use `npm run db:migrate --workspace @pelazzo/backend -- --name <nome>` e revise o SQL gerado.

`npm run db:down` para os containers preservando o volume do banco. O Compose configura somente PostgreSQL para desenvolvimento; frontend e backend rodam pelo npm.

## Estrutura

```text
frontend/src/        # páginas React, serviços HTTP e demais pastas de interface
backend/src/
  modules/health/   # Domain, Application, Infrastructure e Presentation
  shared/           # database, config, errors e utils
backend/prisma/     # modelo e migrations
scripts/            # testes de migration e smoke de conexão real
.github/workflows/  # lint, tipos, testes, build e migration no CI
.ai/                # regras e decisões do projeto
```

Módulos de negócio serão criados conforme implementados, seguindo a mesma direção de dependências do módulo health. O lint bloqueia imports de framework e infraestrutura em Domain/Application. Controllers apenas adaptam HTTP; casos de uso dependem de contratos e são compostos por factories nos módulos NestJS.

A [arquitetura do banco](.ai/database/README.md) inclui diagrama relacional, responsabilidades por módulo, constraints, índices e um [SQL PostgreSQL de referência](.ai/database/schema.sql), seguindo a regra Clean Architecture + Modular Monolith + SOLID fornecida para o projeto.
