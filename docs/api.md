# API REST do Pelazzo

Base local: `http://localhost:3000/api`. Documentação interativa: `/api/docs`; contrato OpenAPI: `/api/docs-json`. Ative com `SWAGGER_ENABLED=true`; em produção o padrão é desabilitado. A documentação define entradas, saídas, paginação e respostas de erro por recurso.

## Sessões e primeira pelada

1. `POST /auth/register` com `displayName`, `email`, `password` (12–128 caracteres), ou `POST /auth/login` com e-mail/senha.
2. A resposta contém `token` e `user`. O token é opaco, não é JWT. Envie `Authorization: Bearer <token>`. No Swagger use “Authorize”, informe o token e depois “Try it out”. Não cole uma senha nesse campo.
3. `POST /groups` com `name` cria a pelada junto do primeiro administrador na mesma transação.
4. `POST /groups/:groupId/invitations` exige ADMIN, recebe `email`, `role` opcional (`USER` padrão) e `ttlDays` (1–30, padrão 7). O código aparece apenas na criação; somente seu hash é persistido. Compartilhamento é manual.
5. O convidado autentica a conta do mesmo e-mail e envia `POST /invitations/accept` com `token`. Convites são de uso único, com expiração e revogação.

`GET /auth/me` consulta a identidade. `POST /auth/logout` revoga a sessão. `POST /auth/change-password` recebe `currentPassword` e `newPassword`, revogando as outras sessões. Sessões expiram em sete dias. O frontend guarda o Bearer em `sessionStorage`, remove ao sair ou receber 401 e não guarda senhas. A biblioteca Better Auth gerencia o hash das senhas.

## Recursos

| Recurso             | Rotas principais                                                           | Acesso                                 |
| ------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| Peladas             | `GET/POST /groups`, `GET/PATCH /groups/:groupId`                           | Criar: autenticado; alterar: ADMIN     |
| Meu vínculo         | `GET /groups/:groupId/membership`                                          | Membro ativo                           |
| Membros             | `GET /groups/:groupId/members`, `PATCH …/members/:userId`                  | Consulta: membro; alterar: ADMIN       |
| Convites            | `POST/GET …/invitations`, `DELETE …/invitations/:id`                       | ADMIN                                  |
| Pix                 | `GET/PATCH/DELETE …/pix`                                                   | Consulta: membro; escrita: ADMIN       |
| Participantes       | `GET/POST …/participants`, `GET/PATCH/DELETE …/participants/:id`           | Consulta: membro; escrita: ADMIN       |
| Partidas            | `GET/POST …/matches`, `GET/PATCH/DELETE …/matches/:id`                     | Consulta: membro; escrita: ADMIN       |
| Presenças           | `GET/POST …/matches/:id/participants`, `PATCH/DELETE …/participations/:id` | Consulta: membro; escrita: ADMIN       |
| Recebimentos        | `GET/POST …/payments`, `GET …/payments/:id`                                | Escrita: ADMIN; USER consulta próprios |
| Despesas            | `GET/POST …/expenses`, `GET …/expenses/:id`                                | ADMIN                                  |
| Anular/corrigir     | `POST …/{payments,expenses}/:id/{void,corrections}`                        | ADMIN                                  |
| Caixa               | `GET …/finance/summary`, `GET …/matches/:id/cash`                          | Membro                                 |
| Situação individual | `GET …/participations/:id/settlement`                                      | Titular ou ADMIN                       |
| Sorteio             | `POST …/team-draws`                                                        | USER e ADMIN                           |
| Auditoria           | `GET …/audit`                                                              | ADMIN                                  |

`…` indica `/groups/:groupId`. Listas retornam `{items,total,page,limit}`; `page` começa em 1 e `limit` vai até 100. Pagamentos aceitam filtro `participantId`, despesas `matchId`. Identificadores são UUIDs; datas ISO 8601 com offset ou `Z`. Os papéis são específicos por pelada. O servidor verifica sessão, vínculo e permissão em cada operação.

## Presença pelo link público

ADMIN gera `POST /groups/:groupId/matches/:matchId/attendance-link` com `{location}` (opcional somente se a partida já possui local). Requer partida SCHEDULED e campo/endereço; retorna `{token,expiresAt}`. Compartilhe com todos a URL do frontend `/attendance#token`; não escolher e-mail nem destinatário. Gerar novamente substitui o link anterior. `GET` no mesmo endpoint retorna `{link:{id,expiresAt,active}|null}` sem segredo; `DELETE` revoga sem apagar presenças.

Sem login, `POST /attendance/details` com `{token}` retorna somente nome da pelada, cor, fuso, título, data e local. `POST /attendance/confirm` com `{token,name}` confirma presença e retorna `{name,match}` com a mesma projeção mínima. O modal público exige só nome e mostra a confirmação com campo/endereço. As respostas têm `Cache-Control: no-store`; não colocar token nos caminhos, logs ou exemplos reais do Swagger.

O mesmo link aceita toda a turma até 24 horas após o horário da partida. Revogação, expiração, renovação ou partida finalizada/cancelada bloqueiam novas confirmações. Mesmo nome normalizado reutiliza presença existente; nome novo cria diarista sem conta. Homônimos ambíguos recebem 409 e devem usar sobrenome/apelido distintivo. Não cria conta, convite de acesso, pagamento ou valor esperado. Limites públicos por origem: detalhes 60/minuto, confirmação 20/minuto.

## Financeiro

`GET …/pix` sempre retorna JSON `{settings: configuraçãoOuNull}`, inclusive quando não há chave. `PATCH …/pix` retorna a configuração criada/alterada diretamente.

Todos os valores são centavos inteiros positivos, máximo 2.147.483.647 por lançamento. `amountCents:2750` significa R$ 27,50. Nenhum lançamento é confirmado pelo link Pix ou por envio do comprovante.

Um recebimento requer `participantId`, `amountCents`, `method` (`PIX`, `CASH`, `OTHER`), `idempotencyKey` e exatamente uma referência:

- `matchParticipantId`: participação do mesmo jogador, na mesma pelada.
- `competence`: mês `AAAA-MM`, sem participação. Entra no geral e não no caixa de uma partida.

`receivedAt` é opcional e usa o instante do registro. Despesa requer `matchId`, `description`, `amountCents`, `idempotencyKey`; `occurredAt` também é opcional.

Gere uma chave de idempotência por operação e reutilize em tentativas do mesmo envio. Mesmo corpo/chave retorna o registro existente; chave reaproveitada com corpo diferente recebe 409. A interface mantém a chave enquanto o formulário está aberto. Ao fechar e iniciar outro lançamento, trata-se de uma nova operação.

`POST …/:id/void` recebe `{reason}`. `POST …/:id/corrections` recebe o corpo do novo lançamento e `reason`, com nova chave. O original é anulado e um substituto com `replacesId` é criado atomicamente. Valores originais não são sobrescritos, históricos não são apagados e anulações deixam de entrar nas somas.

Valor esperado é opcional. Quando nulo, `settlement.status` é `UNDEFINED`, sem dívida presumida. Quando definido, situação é `UNPAID`, `PARTIAL` ou `PAID`. Excedente é informativo, sem crédito automático. Receitas e despesas são agregadas separadamente; saldo negativo é permitido. Valores esperados de terceiros são omitidos nas listas para USER.

## Sorteio

```json
{
  "teamCount": 2,
  "playersPerTeam": 2,
  "hasGoalkeepers": true,
  "players": [
    { "name": "João", "goalkeeper": true },
    { "name": "Pedro", "goalkeeper": false },
    { "name": "Lucas", "goalkeeper": true },
    { "name": "José", "goalkeeper": false }
  ]
}
```

Exige quantidade exata; goleiro conta no tamanho de time. Com goleiros, exatamente um por time. `id` de entrada é UUID opcional. Nomes precisam distinguir homônimos. Limites operacionais: 2–50 times, 1–50 pessoas/time e até 500 entradas. Fisher–Yates usa aleatoriedade criptográfica injetada; resultado não é persistido e não altera presença/financeiro.

## Erros e limites

400: entrada/regra inválida; 401: sessão inválida; 403: permissão; 404: recurso; 409: conflito/duplicidade; 429: limite de requisições; 500: mensagem genérica. DTOs rejeitam campos desconhecidos. Padrão global: 120 requisições/minuto por origem; login 10 e cadastro 5. `THROTTLE_LIMIT` ajusta o global. Não há mensagens contendo senhas, tokens ou SQL em logs de erro da aplicação.

`GET /health` confirma processo ativo; `/health/ready` verifica PostgreSQL (503 na indisponibilidade). Essas rotas são públicas. Rate limiting é em memória, adequado ao processo único de desenvolvimento; uma implantação com múltiplas instâncias precisará revisar essa configuração.
