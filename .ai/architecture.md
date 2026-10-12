# Arquitetura recomendada

## Estado

O scaffold foi implementado: frontend React + Vite, backend NestJS com módulo health e PostgreSQL + Prisma com migration inicial. Funcionalidades de negócio e autenticação permanecem pendentes. A regra fornecida em `architecture-rule.md` é obrigatória: Clean Architecture pragmática, Modular Monolith e SOLID. A arquitetura física do banco está em `database/README.md`; o schema aplicado é definido pelas migrations em `backend/prisma`.

## Stack inicial

- Backend NestJS + TypeScript, organizado em módulos com Domain, Application, Infrastructure e Presentation.
- Frontend React + Vite + TypeScript consumindo exclusivamente a API REST do backend.
- PostgreSQL para persistência relacional e transações.
- Prisma para esquema e migrações.
- ValidationPipe, class-validator e class-transformer para DTOs HTTP; regras de negócio nas entidades e casos de uso.
- Provedor/biblioteca de autenticação mantido, com sessões seguras. Não criar criptografia de senhas própria.
- CSS com variáveis para tema por pelada; interface responsiva em português brasileiro.

Verificar versões e documentação oficial ao atualizar dependências. Fixar versões instaladas nos manifests e no lockfile; não usar versões candidatas como padrão.

## Organização sugerida

```text
backend/
  prisma/              # schema e migrations versionadas
  src/
    modules/
      auth/
      groups/
      participants/
      matches/
      finance/
      team-draw/
      # Cada módulo contém:
      # domain/{entities,repositories,errors}
      # application/{use-cases,services}
      # infrastructure/repositories
      # presentation/{controllers,dto}
      # <nome>.module.ts
    shared/{database,config,errors,utils}/
    app.module.ts
    main.ts
  tests/{unit,integration,e2e}/
frontend/
  src/{pages,components,services,hooks,types,routes,utils}/
```

Domain define contratos de repositório e regras, Application coordena casos de uso, Infrastructure implementa contratos com Prisma e Presentation traduz HTTP. O arquivo do módulo NestJS registra as dependências. PrismaService fica em `shared/database`, usado apenas pela Infrastructure e pela composição das dependências. Não criar repositório genérico.

Os exemplos de empresas, CNPJ e e-mail da regra original ilustram a arquitetura; não são requisitos do Pelazzo. Não criar SMTP ou notificações sem uma funcionalidade que os exija.

## Regras técnicas

- Interface apresenta dados; servidor valida sessão, associação à pelada, papel e entrada antes de ler ou alterar dados.
- Toda consulta de domínio deve ser limitada por `groupId` autorizado. Não confiar no identificador enviado pelo navegador.
- A função de sorteio deve ser pura e receber a fonte de aleatoriedade como dependência para testes reproduzíveis.
- Recebimentos, anulações e auditoria devem ser gravados em transação. Mudanças no último administrador também exigem proteção contra concorrência.
- Saldo e totais são calculados a partir dos lançamentos confirmados. Não manter um campo de saldo editável.
- Usar inteiros para centavos, verificar limites e formatar valores em `pt-BR`. Datas persistidas em UTC; exibição no fuso configurado da pelada, inicialmente `America/Sao_Paulo`.
- Configurações visuais são dados validados, nunca CSS ou código arbitrário fornecido pelo administrador.
- Não guardar segredos no repositório. Fornecer `.env.example` com nomes e valores fictícios quando a implementação existir.
- Aplicar proteção apropriada a sessões e mutações, escape de conteúdo e limites de requisições nas operações expostas.
- Logs técnicos não devem conter chave Pix completa, telefone, credenciais ou conteúdo financeiro pessoal.
- Criar estados de carregamento, vazio, erro e sucesso. Garantir navegação por teclado e uso em celular.

## Verificação

Testes unitários para sorteio e cálculos financeiros; testes de integração para permissões, transações, idempotência e isolamento; poucos testes de ponta a ponta para as jornadas principais. Testar regras observáveis, evitando testes que apenas reproduzam o código.

## Evolução

Integração Pix e upload exigem decisões próprias sobre provedor, webhooks, armazenamento privado e retenção. Não antecipar microserviços, filas ou infraestrutura adicional sem necessidade demonstrada.
