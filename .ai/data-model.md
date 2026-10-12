# Modelo de dados inicial

Identificadores são UUIDs. Entidades persistidas possuem `createdAt` e `updatedAt` quando aplicável. Valores monetários são inteiros em centavos.

O detalhamento físico, índices, diagrama e limites de integridade estão em [database/README.md](database/README.md). O SQL de referência inicial usa `snake_case`, mapeado no Prisma. A autenticação é local por e-mail/senha com Better Auth; sessões e contas foram adicionadas por migration própria.

| Entidade         | Campos principais                                                                                                                                                                                            | Restrições                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User             | id, displayName, identidade do provedor                                                                                                                                                                      | Conta autenticada; credenciais geridas pela solução de autenticação                                            |
| Group            | id, name, primaryColor, timezone                                                                                                                                                                             | Nome e cor validados                                                                                           |
| Membership       | id, groupId, userId, role, active                                                                                                                                                                            | Par único groupId/userId; role USER ou ADMIN                                                                   |
| Participant      | id, groupId, userId opcional, name, modality, active                                                                                                                                                         | Vínculo opcional com conta; modalidade MONTHLY ou DAILY                                                        |
| Match            | id, groupId, title, startsAt, location opcional, status                                                                                                                                                      | Estados definidos nas regras de negócio                                                                        |
| MatchParticipant | id, groupId, matchId, participantId, modalitySnapshot, expectedAmountCents opcional                                                                                                                          | Par único matchId/participantId; esperado nulo ou positivo                                                     |
| Payment          | id, groupId, participantId, matchParticipantId opcional, competence opcional, amountCents, receivedAt, method, status, recordedBy, voidReason opcional, voidedBy opcional, voidedAt opcional, idempotencyKey | Exatamente uma referência: participação ou competência; valor positivo; chave de idempotência única por pelada |
| Expense          | id, groupId, matchId, description, amountCents, occurredAt, status, recordedBy, voidReason opcional, voidedBy opcional, voidedAt opcional, idempotencyKey                                                    | Valor positivo; estados CONFIRMED ou VOIDED; chave única por pelada                                            |
| PixSettings      | groupId, recipientAdminUserId, keyType, keyValue, recipientName, contactPhone                                                                                                                                | Uma configuração por pelada; destinatário deve ser administrador ativo                                         |
| AuditEvent       | id, groupId, actorUserId, action, entityType, entityId, metadata, createdAt                                                                                                                                  | Histórico sem edição pelo usuário; metadados mínimos sem segredos                                              |

## Invariantes relacionais

- MatchAttendanceLink pertence ao módulo matches: id, groupId, matchId único, tokenHash único, expiresAt, createdBy, revokedAt, createdAt e updatedAt. FKs compostas garantem partida e administrador criador da mesma pelada. Regeneração atualiza a mesma linha e troca o hash.
- MatchParticipant inclui `publicConfirmedAt` opcional para indicar confirmação pelo link. Mantém unicidade de participante por partida, modalidade histórica e valor esperado opcional.
- AuditEvent permite `actorUserId` nulo exclusivamente para ações sem conta, como check-in público. Quando preenchido, a FK composta continua exigindo membro da mesma pelada.
- Um índice parcial não único por pelada e nome normalizado de participante ativo atende ao check-in; homônimos continuam permitidos.

- User possui e-mail normalizado único, nome e campos exigidos pelo provedor. AuthAccount guarda credenciais geridas pelo Better Auth, AuthSession guarda sessões revogáveis e AuthVerification é uma tabela de suporte da biblioteca (fluxos de e-mail fora do MVP).
- GroupInvitation vincula e-mail convidado, papel e pelada; apenas hash do token é guardado. Possui expiração, autor, aceitação e revogação. Aceitação requer a conta do mesmo e-mail e convite válido, de uso único.
- Payment/Expense possuem `replacesId` opcional único, FK da mesma pelada e proibição de auto-referência. Não editar valores existentes: correção anula o original e cria o substituto atomicamente.

- Referências de participantes, partidas, lançamentos e configurações devem pertencer à mesma pelada. Validar no servidor e reforçar com restrições relacionais quando possível.
- `Payment.participantId` deve corresponder ao participante da participação vinculada.
- Se uma conta estiver vinculada a participante, manter no máximo um participante ativo por conta e pelada.
- Recebimento mensal usa competência válida `AAAA-MM` e não possui `matchParticipantId`.
- Recebimento por partida possui `matchParticipantId` e não possui competência.
- `method` identifica PIX, CASH ou OTHER; não altera a necessidade de confirmação administrativa.
- Recebimentos e despesas possuem `currency = BRL`; identidades locais usam o par único `authProvider/authSubject`.
- Não usar exclusão em cascata que apague lançamentos financeiros. Preferir desativação de participantes e membros com histórico.
- Ao rebaixar o destinatário do Pix, exigir outro administrador destinatário ou remover a configuração ativa na mesma transação.
- Resultados do sorteio podem ficar apenas na sessão no MVP. Persistência e compartilhamento público não são requisitos iniciais.
