# Registro de decisões

## Premissas adotadas para o MVP

Estas escolhas completam pontos não especificados pelo responsável e podem ser revisadas.

| Decisão                                          | Motivo                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| Acesso por conta e associação à pelada           | Permite controlar dados pessoais e vários administradores           |
| Preparar isolamento de várias peladas            | Nome, tema, Pix e permissões pertencem ao grupo                     |
| Uma chave Pix ativa por pelada                   | Evita dúvida sobre o destinatário mesmo com vários administradores  |
| Comprovante enviado manualmente pelo WhatsApp    | Atende ao envio ao número do administrador sem integração ou upload |
| Goleiro incluído no tamanho do time              | Dois times de cinco continuam usando dez pessoas                    |
| Quantidade exata de participantes no sorteio     | Evita reservas ou pessoas excluídas silenciosamente                 |
| Sorteio aleatório sem avaliação de habilidade    | Corresponde ao pedido de aleatoriedade                              |
| Competência mensal sem rateio automático         | Não inventa distribuição de mensalidade entre partidas              |
| Despesas por partida                             | Permite calcular saldo real além das receitas                       |
| Detalhes financeiros individuais privados        | Usuário vê seus pagamentos e caixa agregado                         |
| Monólito modular com stack TypeScript/PostgreSQL | Reduz complexidade inicial e suporta transações                     |

## Confirmar antes de implementar funcionalidades dependentes

- Como a primeira pelada e seu primeiro administrador serão criados: fluxo de cadastro ou provisionamento inicial.
- Provedor de autenticação e forma de entrada dos demais membros: convite ou aprovação administrativa.
- Se mensalidades deverão ser rateadas entre partidas no futuro e qual a regra explícita de rateio.
- Se haverá sorteio público sem conta, reservas, múltiplos times com tamanhos distintos ou balanceamento por habilidade.
- Se Pix por administrador individual deve substituir a configuração única por pelada.
- Se comprovantes deverão ser armazenados no aplicativo e por quanto tempo.
- Hospedagem, banco gerenciado e estratégia de backup antes da publicação.

Esses pontos não impedem criar componentes de domínio, protótipos ou testes das regras já definidas. Não habilitar fluxos dependentes sem resolver a decisão correspondente.

## Formato de novas decisões

### 2026-10-11 — Arquitetura e persistência

O responsável forneceu a regra Clean Architecture + Modular Monolith + SOLID. Ela substitui a recomendação anterior de Next.js para operações no servidor. Adotar NestJS no backend, React + TypeScript no frontend e PostgreSQL + Prisma. Não criar módulos de empresas nem CNPJ de empresa: são exemplos do arquivo original.

Um único banco e schema `public` atendem ao MVP; módulos possuem suas tabelas e acessam outros módulos por contratos. Chaves estrangeiras compostas reforçam o isolamento por pelada. Checks e índices parciais necessários serão mantidos em migrations SQL, sem transferir acesso SQL para os casos de uso.

O arquivo `.ai/database/schema.sql` é um blueprint físico, não uma migration aplicada nem um backend pronto. Um banco real e a versão de Prisma ainda precisam ser definidos para gerar e validar as migrations de implementação.

### 2026-10-11 — Chore frontend/backend

Adotar npm workspaces (`frontend` e `backend`) com lockfile único e Node.js 24. Versões estáveis consultadas: React 19.3.0, Vite 8.3.4, NestJS 12.1.2, PostgreSQL 18.6 e Prisma 7.10.0. O Prisma publicado no canal latest apontava para RC 8; selecionada a linha 7 estável. TypeScript 6.0.3 foi escolhido pela compatibilidade com CLI NestJS e typescript-eslint, sem forçar peer dependencies.

O modelo Prisma e a migration inicial substituem o blueprint como fonte do banco aplicado. Checks e índices parciais ficam no SQL versionado. PGlite permite testar integridade sem Docker local; CI usa PostgreSQL 18 para aplicar migrations e testar o Prisma com backend compilado.

O módulo health demonstra as camadas: uma porta permite trocar a sonda de banco por fake nos testes; um caso de uso sem NestJS/Prisma coordena a disponibilidade; Infrastructure executa a consulta e Presentation traduz indisponibilidade em HTTP 503. Nenhum repositório genérico, CRUD de negócio ou mecanismo de autenticação foi inventado.

Compose contém apenas PostgreSQL no chore; Node.js executa web e API localmente. Containers de aplicação e estratégia de publicação serão definidos quando solicitados.

NestJS 12 usa ESM: backend e cliente Prisma são gerados em ESM com resolução NodeNext e extensões `.js` nos imports locais. Overrides restritos ao tooling Prisma usam deepmerge-ts 8.0.2 e mysql2 3.24.5 para corrigir os avisos da auditoria; não executar `npm audit fix --force` indiscriminadamente.

Testes locais de controllers/casos de uso não abrem portas, pois a conexão HTTP local foi bloqueada pelo sandbox e a execução fora dele foi recusada. O workflow inclui smoke HTTP com o backend compilado e PostgreSQL real.

Registrar data, contexto, decisão, motivo e consequências. Marcar decisões substituídas sem apagar o histórico. Atualizar os demais documentos afetados na mesma alteração.
