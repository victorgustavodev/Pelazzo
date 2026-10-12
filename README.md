# Pelazzo

Aplicação para organizar peladas: mensalistas e diaristas, partidas e presenças, caixa com valores livres, Pix, sorteio de times e vários administradores. Frontend React/Vite integrado à API NestJS, com PostgreSQL e Swagger.

As regras obrigatórias estão no [AGENTS.md](AGENTS.md) e na [.ai](.ai/README.md). O [guia da API](docs/api.md) explica autenticação, referências financeiras e idempotência.

## Rodar tudo em Docker

Com Node.js 24 e Docker Desktop/Engine em execução, na raiz:

```sh
node scripts/setup-dev-env.mjs
docker compose up --build -d --wait
```

O primeiro comando gera o segredo local sem exibi-lo, preservando configurações existentes. Não exige `npm install`. O Compose instala dependências na imagem, inicia PostgreSQL, aplica as migrations e sobe API e frontend após as verificações de saúde.

- [Aplicação](http://localhost:5173)
- [Swagger](http://localhost:3000/api/docs)
- [OpenAPI JSON](http://localhost:3000/api/docs-json)
- [Readiness](http://localhost:3000/api/health/ready)

Cadastre sua conta e crie a primeira pelada: você será seu primeiro administrador. No painel, crie convites por e-mail e compartilhe o código manualmente. Os convidados cadastram a conta com o mesmo e-mail e usam “Tenho um convite”. Não há conta padrão, senha pública ou dados fictícios cadastrados automaticamente.

Para confirmar presença, abra a partida como admin e use “Confirmar partida e gerar link”, informando campo/endereço. Copie o link e compartilhe com toda a turma: cada pessoa informa só o nome, sem conta ou e-mail. O link vale até 24 horas após o horário da partida; gerar outro invalida o anterior. No desenvolvimento, a URL usa `localhost`: o uso fora desta máquina depende da publicação com uma URL acessível.

O banco local usa `localhost:5432`, banco/usuário `pelazzo` e senha fictícia `local_dev_only`. As portas são limitadas a 127.0.0.1. O volume preserva os dados; `docker compose down` não apaga o banco. Não use `down -v` para uma parada normal.

```sh
docker compose ps --all
docker compose logs -f backend frontend
docker compose down
```

Código tem recarga automática. Após alterar dependências ou Dockerfile, reconstrua a imagem. Migrations são versionadas; o serviço `migrate` deve terminar com código 0. Não aplicar o SQL de referência em paralelo nem usar `db push`.

## Funcionalidades do MVP

- Cadastro, login e troca de senha; sessões revogáveis e convites de uso único ligados ao e-mail.
- Peladas isoladas, membros USER/ADMIN e proteção do último administrador, inclusive com operações concorrentes.
- Participantes com vínculo opcional à conta, modalidade e desativação sem perda de histórico.
- Agenda, presenças, valor esperado individual opcional e caixa de cada partida.
- Admin confirma partida e gera um link único para toda a turma fazer check-in informando só o nome, sem e-mail, login ou cadastro. O modal confirma presença com campo/endereço; o link pode ser encerrado ou renovado.
- Recebimentos parciais/múltiplos, despesas, anulações e correções com motivo e histórico preservado.
- Caixa geral inclui recebimentos mensais por competência; caixa da partida inclui somente os seus lançamentos.
- Usuários consultam seus próprios detalhes financeiros e totais agregados da turma.
- Uma chave Pix ativa por pelada, favorecido, copiar chave e contato WhatsApp. O comprovante é anexado manualmente; o admin confere e registra o recebimento.
- Sorteio aleatório para usuário e admin, quantidade exata de nomes e um goleiro por time quando habilitado. Goleiro conta no tamanho do time.
- Campos de nome numerados criados automaticamente por `times × pessoas por time`: 2 × 5 gera 10 campos.
- Logo Pelazzo original nas telas e no favicon; ativos em `frontend/public/brand` e geração do favicon por `scripts/generate-brand-assets.mjs`.
- Nome, cor e fuso por pelada, com contraste de texto e interface responsiva.
- Auditoria administrativa, validação de entrada, limites de requisição e Swagger com token Bearer.

Não há integração bancária, cobrança automática, upload de comprovantes, balanceamento por habilidade ou envio automático de e-mails.

## Stack

| Camada   | Tecnologia                                                      |
| -------- | --------------------------------------------------------------- |
| Frontend | React 19.3.0, Vite 8.3.4, React Router 7.18.4, TypeScript 6.0.3 |
| Backend  | NestJS 12.1.2, Better Auth 1.7.7, Swagger 12.0.2                |
| Banco    | PostgreSQL 18.6, Prisma 7.10.0                                  |
| Runtime  | Node.js 24, npm 11 ou superior                                  |

Versões estáveis fixadas no lockfile. NestJS/Prisma ficam nas camadas externas; Domain/Application dependem de portas. O lint protege a direção das dependências. Valores financeiros são inteiros em centavos e somas usam precisão inteira, com limites verificados.

## Executar com Node.js no host

```sh
npm ci
npm run dev:setup
npm run db:up
npm run db:deploy
npm run dev
```

O script prepara `.env` da raiz e do backend sem sobrescrever segredos existentes. O frontend usa `/api` via proxy por padrão. Se os containers da aplicação estiverem em execução, pare backend/frontend antes de iniciar no host para liberar as mesmas portas.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
docker compose run --rm migrate npm run test:integration
```

`npm test` verifica domínio, permissões, saúde, constraints no PGlite e jornadas do frontend. A integração HTTP usa PostgreSQL real em banco temporário criado e removido pelo runner: cadastro, convites, isolamento, concorrência, financeiro, sorteio, sessões e Swagger. O usuário de teste precisa de permissão `CREATEDB`; o teste não insere fixtures no banco principal. CI executa essas verificações no PostgreSQL 18.

## Configuração e publicação

Consulte [backend/.env.example](backend/.env.example) e [frontend/.env.example](frontend/.env.example). Segredos nunca entram em `VITE_*` nem são versionados. `AUTH_SECRET` precisa ter no mínimo 32 caracteres, `AUTH_BASE_URL` aponta à API e `FRONTEND_ORIGIN` à interface. Swagger fica desabilitado por padrão em produção.

O Dockerfile atual é para desenvolvimento. Para publicar: frontend estático com fallback de rotas para `index.html`, API Node.js e PostgreSQL gerenciado, HTTPS e configuração dos origins/URLs. Use `VITE_API_BASE_URL` no build ou proxy `/api`. Backup, recuperação e credenciais de produção precisam ser configurados no ambiente de hospedagem. A aplicação não foi publicada em serviço externo.

```text
frontend/src/{pages,components,hooks,services,types,utils}
backend/src/modules/{auth,groups,participants,matches,finance,team-draw,health}
backend/src/shared/{domain,application,infrastructure,presentation,database,config}
backend/prisma/                # schema e migrations aplicadas
docs/api.md                    # contratos e uso do Swagger
scripts/                       # configuração e testes de banco/integração
.ai/                           # regras, arquitetura e decisões
```
