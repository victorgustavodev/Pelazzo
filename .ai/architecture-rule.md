AI ARCHITECTURE RULE

Clean Architecture + Modular Monolith + SOLID

Esta regra é obrigatória para todo código criado, alterado, refatorado ou revisado pela IA neste projeto.

1. Objetivo

Construir a aplicação utilizando uma Clean Architecture pragmática, organizada como um Modular Monolith, mantendo:

baixo acoplamento;

alta coesão;

separação clara de responsabilidades;

testabilidade;

independência das regras de negócio em relação a frameworks e infraestrutura;

facilidade de manutenção e evolução;

simplicidade proporcional ao escopo.

Não utilizar microserviços.

Não implementar padrões arquiteturais desnecessários apenas para demonstrar complexidade.

2. Princípio fundamental

As regras de negócio não podem depender de detalhes externos.

A direção das dependências deve apontar para dentro:

Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure

O Domain nunca deve conhecer NestJS, Prisma, PostgreSQL, HTTP, SMTP, React ou detalhes de infraestrutura.

3. Estrutura obrigatória do Backend

src/
├── modules/
│   └── companies/
│       ├── domain/
│       │   ├── entities/
│       │   │   └── company.entity.ts
│       │   ├── repositories/
│       │   │   └── company.repository.ts
│       │   └── errors/
│       ├── application/
│       │   ├── use-cases/
│       │   │   ├── create-company.use-case.ts
│       │   │   ├── update-company.use-case.ts
│       │   │   ├── delete-company.use-case.ts
│       │   │   ├── list-companies.use-case.ts
│       │   │   └── get-company-by-id.use-case.ts
│       │   └── services/
│       ├── infrastructure/
│       │   ├── repositories/
│       │   │   └── prisma-company.repository.ts
│       │   └── email/
│       │       └── email-notification.service.ts
│       ├── presentation/
│       │   ├── controllers/
│       │   │   └── companies.controller.ts
│       │   └── dto/
│       │       ├── create-company.dto.ts
│       │       └── update-company.dto.ts
│       └── companies.module.ts
├── shared/
│   ├── database/
│   ├── config/
│   ├── errors/
│   └── utils/
├── app.module.ts
└── main.ts

Essa estrutura só pode ser alterada mediante justificativa técnica.

4. Domain

O Domain contém:

Entities;

Value Objects quando realmente necessários;

regras de negócio;

interfaces/ports;

erros específicos do domínio.

Regra absoluta

O Domain não pode importar:

@nestjs/*
@prisma/*
express
nodemailer
axios

nem qualquer biblioteca de infraestrutura.

Exemplo:

export interface CompanyRepository {
  create(company: Company): Promise<Company>;
  findById(id: string): Promise<Company | null>;
  findAll(): Promise<Company[]>;
  update(company: Company): Promise<Company>;
  delete(id: string): Promise<void>;
}

O Domain define o contrato. A Infrastructure implementa o contrato.

5. Application

A camada Application contém os Use Cases.

Cada operação relevante deve possuir seu próprio Use Case:

CreateCompanyUseCase;

UpdateCompanyUseCase;

DeleteCompanyUseCase;

ListCompaniesUseCase;

GetCompanyByIdUseCase.

O Use Case deve:

receber os dados necessários;

executar o fluxo da aplicação;

aplicar regras de negócio;

utilizar interfaces do Domain;

coordenar dependências;

retornar o resultado.

O Use Case não deve:

acessar Prisma diretamente;

executar SQL;

manipular HTTP;

conhecer Request/Response;

enviar SMTP diretamente;

conter lógica específica de Controller.

Proibido:

class CreateCompanyUseCase {
  constructor(private prisma: PrismaService) {}
}

Preferir:

class CreateCompanyUseCase {
  constructor(
    private companyRepository: CompanyRepository,
    private notificationService: NotificationService,
  ) {}
}

6. Repository Pattern

O acesso ao banco deve ser abstraído.

O Domain define o contrato:

interface CompanyRepository {
  create(company: Company): Promise<Company>;
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  update(company: Company): Promise<Company>;
  delete(id: string): Promise<void>;
}

A Infrastructure implementa:

class PrismaCompanyRepository implements CompanyRepository {
  // implementação
}

Application e Domain não devem depender diretamente de PrismaService, PrismaClient, SQL ou PostgreSQL.

7. Notificações

O envio de e-mail deve utilizar abstração.

Criar uma interface equivalente a:

export interface NotificationService {
  sendCompanyCreated(company: Company): Promise<void>;
}

A implementação fica na Infrastructure.

O Use Case conhece apenas a abstração e nunca diretamente SMTP, Nodemailer, Resend, SendGrid ou outro provedor.

8. Controllers

Controllers devem ser finos.

Responsabilidades:

receber HTTP request;

receber DTO;

chamar Use Case;

retornar resposta HTTP.

Não colocar em Controllers:

regra de negócio;

acesso ao banco;

Prisma;

envio de e-mail;

cálculos de negócio;

decisões complexas.

Preferir:

@Post()
async create(@Body() dto: CreateCompanyDto) {
  return this.createCompanyUseCase.execute(dto);
}

9. DTOs

DTOs pertencem à Presentation.

Eles representam o contrato HTTP.

Não utilizar DTOs como entidades de domínio.

10. Infrastructure

Infrastructure contém detalhes técnicos:

Prisma;

PostgreSQL;

SMTP;

provedor de e-mail;

APIs externas;

filesystem;

outras integrações.

PrismaService só deve ser utilizado na Infrastructure.

11. Dependency Inversion

Quando uma camada interna precisar de um recurso externo:

definir uma interface;

injetar a interface;

implementar na Infrastructure;

registrar a implementação no NestJS Module.

12. SOLID

Aplicar SOLID pragmaticamente.

Single Responsibility

Cada classe deve possuir responsabilidade clara.

Open/Closed

Permitir substituição de implementações sem alterar regras de negócio.

Liskov Substitution

Implementações devem respeitar integralmente seus contratos.

Interface Segregation

Não criar interfaces gigantes.

Dependency Inversion

Application e Domain dependem de abstrações, não de implementações concretas.

13. Testes

Os Use Cases devem ser testáveis isoladamente.

Utilizar fakes/mocks para:

CompanyRepository;

NotificationService.

Testar obrigatoriamente:

criação;

edição;

exclusão;

listagem;

busca por ID quando implementada;

envio de notificação na criação;

cenários de erro relevantes.

Os testes unitários não devem depender desnecessariamente de banco ou SMTP reais.

14. Banco de dados

Utilizar:

PostgreSQL + Prisma

Modelo mínimo:

id
name
cnpj
tradeName
address
createdAt
updatedAt

Aplicar:

CNPJ único;

timestamps;

constraints relevantes;

migrations;

índices somente quando justificáveis.

15. API REST

Endpoints esperados:

POST   /companies
GET    /companies
GET    /companies/:id
PATCH  /companies/:id
DELETE /companies/:id

Utilizar códigos HTTP adequados, incluindo 200, 201, 204, 400, 404, 409 e 500 conforme o caso.

16. Validação

Toda entrada externa deve ser validada.

Utilizar mecanismos apropriados do NestJS, como:

ValidationPipe;

class-validator;

class-transformer.

Validações de entrada devem ser separadas de regras de negócio.

17. Erros

Criar erros específicos quando necessário:

CompanyNotFoundError
CompanyAlreadyExistsError
InvalidCompanyError

A Presentation deve traduzir erros de aplicação/domínio em respostas HTTP apropriadas.

18. Configuração

Nunca colocar secrets no código.

Utilizar variáveis de ambiente:

DATABASE_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
NOTIFICATION_EMAILS

Nunca versionar .env.

Manter .env.example.

19. Frontend

Utilizar:

React + TypeScript

Estrutura recomendada:

src/
├── pages/
├── components/
├── services/
├── hooks/
├── types/
├── routes/
└── utils/

O frontend consome exclusivamente a API REST.

20. Docker

Preferir ambiente reproduzível com Docker:

frontend
backend
postgres

Um servidor SMTP fake/local pode ser usado no desenvolvimento.

21. Anti-overengineering

Não criar sem necessidade:

microserviços;

Event Sourcing;

CQRS;

Kafka;

RabbitMQ;

Redis;

múltiplas camadas artificiais;

factories sem necessidade;

repositories genéricos;

interfaces artificiais.

Toda abstração deve ter justificativa técnica.

Pergunta obrigatória:

Essa abstração reduz acoplamento, melhora testabilidade ou protege uma regra de negócio?

Se não, não criar.

22. Design Patterns

Patterns permitidos quando justificados:

Repository;

Dependency Injection;

Dependency Inversion;

Strategy;

Adapter;

Factory.

Prioridade:

Dependency Inversion
+
Repository
+
Dependency Injection

23. Regra de implementação da IA

Antes de criar ou alterar código:

identificar a camada correta;

verificar dependências existentes;

respeitar a direção das dependências;

evitar acoplamento;

reutilizar abstrações existentes;

evitar duplicação;

manter simplicidade;

preservar testes;

criar/atualizar testes quando necessário;

explicar decisões arquiteturais relevantes.

24. Checklist arquitetural

Antes de concluir:

Domain não depende de Infrastructure.

Domain não depende de NestJS.

Application não acessa Prisma.

Controllers são finos.

Infrastructure implementa interfaces.

Dependências apontam para abstrações.

Regras de negócio não estão nos Controllers.

Use Cases têm responsabilidade clara.

Prisma está isolado.

Testes unitários são isoláveis.

Secrets não estão no código.

Não existe abstração sem justificativa.

25. Violação arquitetural

Quando uma solicitação violar a arquitetura, a IA não deve simplesmente executar.

Deve informar:

⚠️ ARCHITECTURE VIOLATION

Camada afetada:
[camada]

Violação:
[descrição]

Motivo:
[explicação]

Solução recomendada:
[alternativa]

Depois deve implementar a alternativa arquiteturalmente correta, salvo instrução explícita do desenvolvedor.

26. Princípio final

A arquitetura deve ser:

Simples o suficiente para o problema atual, mas estruturada o suficiente para permitir evolução.

Regra de ouro:

Nunca coloque uma dependência de infraestrutura dentro do Domain ou dos Use Cases quando uma abstração puder ser utilizada.

Nunca crie uma abstração sem justificativa técnica.

Sempre priorize clareza, testabilidade, baixo acoplamento e simplicidade.