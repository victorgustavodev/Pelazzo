# Arquitetura recomendada

## Estado

O MVP possui frontend React + Vite integrado aos módulos NestJS auth, groups, participants, matches, finance, team-draw e health. PostgreSQL + Prisma possui migrations inicial e aditiva de autenticação/convites/correções. A regra fornecida em `architecture-rule.md` é obrigatória: Clean Architecture pragmática, Modular Monolith e SOLID. A arquitetura física está em `database/README.md`; migrations em `backend/prisma` definem o esquema aplicado.

O ambiente completo de desenvolvimento usa Docker Compose: PostgreSQL, serviço temporário de migrations, NestJS e Vite. A inicialização depende da saúde do banco e do sucesso das migrations. Volumes preservam o banco e isolam o cliente Prisma gerado; bind mounts e polling permitem recarga do código no Docker Desktop. O Dockerfile compartilhado instala as dependências dos workspaces em Linux, sem reutilizar `node_modules` do host.

## Stack inicial

- Backend NestJS + TypeScript, organizado em módulos com Domain, Application, Infrastructure e Presentation.
- Frontend React + Vite + TypeScript consumindo exclusivamente a API REST do backend.
- PostgreSQL para persistência relacional e transações.
- Prisma para esquema e migrações.
- ValidationPipe, class-validator e class-transformer para DTOs HTTP; regras de negócio nas entidades e casos de uso.
- Provedor/biblioteca de autenticação mantido, com sessões seguras. Não criar criptografia de senhas própria.
- Better Auth na Infrastructure gerencia e-mail/senha e sessões opacas revogáveis. A Presentation expõe somente os contratos REST do aplicativo; convites são um domínio da pelada, sem SMTP.
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

Uma UnitOfWork no Domain expõe contratos específicos dos módulos para a transação. Infrastructure constrói repositórios ligados ao cliente transacional Prisma. O bloqueio da linha da pelada serializa mutações sensíveis e garante permissões atuais, último administrador e idempotência concorrente. Os casos de uso não importam framework, SQL ou Prisma. Classes de operação relacionadas compartilham um arquivo por módulo para manter o escopo compacto; cada operação relevante conserva sua própria classe.

Frontend usa React Router, serviços REST tipados, hooks de carregamento canceláveis e componentes de formulário acessíveis. Bearer fica em sessionStorage, nunca senha. Não há dados fictícios nem consulta direta ao PostgreSQL pelo navegador. Financeiro, convites e auditoria têm paginação; seletores carregam listas por páginas. A chave de idempotência permanece estável ao reenviar o mesmo formulário.

Páginas maiores carregam sob demanda com Suspense. O build da raiz força NODE_ENV=production mesmo na imagem de desenvolvimento. A consulta Pix retorna `{settings: configuraçãoOuNull}`, evitando uma resposta HTTP vazia quando ainda não há configuração. O ambiente de revisão visual cria banco temporário e o remove ao encerrar, sem inserir demonstrações no banco principal.

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
