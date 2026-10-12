import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL embarcado e descartável; não acessa dados de desenvolvimento.
const db = new PGlite();
const id = Object.fromEntries(
  [
    'groupA',
    'groupB',
    'userA',
    'userB',
    'participantA',
    'participantA2',
    'participantB',
    'matchA',
    'matchB',
    'presenceA',
    'presenceA2',
  ].map((key) => [key, randomUUID()]),
);

before(async () => {
  const migration = await readFile(
    new URL(
      '../backend/prisma/migrations/20261011000100_initial_schema/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  await db.exec(migration);
  for (const suffix of ['A', 'B']) {
    await db.query('INSERT INTO groups(id, name) VALUES ($1, $2)', [
      id[`group${suffix}`],
      `Pelada ${suffix}`,
    ]);
    await db.query(
      'INSERT INTO users(id, display_name, auth_provider, auth_subject) VALUES ($1, $2, $3, $4)',
      [id[`user${suffix}`], `Admin ${suffix}`, 'test', suffix],
    );
    await db.query(
      'INSERT INTO memberships(id, group_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [randomUUID(), id[`group${suffix}`], id[`user${suffix}`], 'ADMIN'],
    );
    await db.query(
      'INSERT INTO participants(id, group_id, user_id, name, modality) VALUES ($1, $2, $3, $4, $5)',
      [
        id[`participant${suffix}`],
        id[`group${suffix}`],
        id[`user${suffix}`],
        `Jogador ${suffix}`,
        'DAILY',
      ],
    );
    await db.query(
      'INSERT INTO matches(id, group_id, title, starts_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [id[`match${suffix}`], id[`group${suffix}`], `Partida ${suffix}`],
    );
  }
  await db.query(
    'INSERT INTO participants(id, group_id, name, modality) VALUES ($1, $2, $3, $4)',
    [id.participantA2, id.groupA, 'Jogador A2', 'MONTHLY'],
  );
  for (const suffix of ['A', 'A2']) {
    await db.query(
      'INSERT INTO match_participants(id, group_id, match_id, participant_id, modality_snapshot) VALUES ($1, $2, $3, $4, $5)',
      [
        id[`presence${suffix}`],
        id.groupA,
        id.matchA,
        id[`participant${suffix}`],
        'DAILY',
      ],
    );
  }
});

after(async () => {
  await db.close();
});

async function insertPayment(overrides = {}) {
  const value = {
    participant: id.participantA,
    presence: id.presenceA,
    competence: null,
    amount: 2750,
    actor: id.userA,
    key: randomUUID(),
    status: 'CONFIRMED',
    ...overrides,
  };
  return db.query(
    `INSERT INTO payments
    (id, group_id, participant_id, match_participant_id, competence, amount_cents, received_at, method, recorded_by, idempotency_key, status)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'PIX', $7, $8, $9)`,
    [
      randomUUID(),
      id.groupA,
      value.participant,
      value.presence,
      value.competence,
      value.amount,
      value.actor,
      value.key,
      value.status,
    ],
  );
}

const sqlError = (code) => (error) => error.code === code;

test('migration cria as dez tabelas do domínio', async () => {
  const result = await db.query(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  assert.equal(result.rows[0].count, 10);
});

test('recebimentos rejeitam zero e valores negativos', async () => {
  await assert.rejects(insertPayment({ amount: 0 }), sqlError('23514'));
  await assert.rejects(insertPayment({ amount: -100 }), sqlError('23514'));
});

test('referência deve ser presença ou competência mensal válida', async () => {
  await assert.rejects(insertPayment({ presence: null }), sqlError('23514'));
  await assert.rejects(
    insertPayment({ competence: '2026-10' }),
    sqlError('23514'),
  );
  await assert.rejects(
    insertPayment({ presence: null, competence: '2026-13' }),
    sqlError('23514'),
  );
  await insertPayment({ presence: null, competence: '2026-10', amount: 10000 });
});

test('recebimento rejeita participante errado e administrador de outra pelada', async () => {
  await assert.rejects(
    insertPayment({ participant: id.participantA2 }),
    sqlError('23503'),
  );
  await assert.rejects(
    insertPayment({ participant: id.participantB }),
    sqlError('23503'),
  );
  await assert.rejects(insertPayment({ actor: id.userB }), sqlError('23503'));
});

test('presença rejeita partida de outra pelada e duplicação', async () => {
  const sql =
    'INSERT INTO match_participants(id, group_id, match_id, participant_id, modality_snapshot) VALUES ($1, $2, $3, $4, $5)';
  await assert.rejects(
    db.query(sql, [
      randomUUID(),
      id.groupA,
      id.matchB,
      id.participantA,
      'DAILY',
    ]),
    sqlError('23503'),
  );
  await assert.rejects(
    db.query(sql, [
      randomUUID(),
      id.groupA,
      id.matchA,
      id.participantA,
      'DAILY',
    ]),
    sqlError('23505'),
  );
});

test('conta não pode ter dois participantes ativos na mesma pelada', async () => {
  await assert.rejects(
    db.query(
      'INSERT INTO participants(id, group_id, user_id, name, modality) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), id.groupA, id.userA, 'Duplicado', 'DAILY'],
    ),
    sqlError('23505'),
  );
});

test('idempotência impede receita duplicada e anulação exige metadados', async () => {
  await insertPayment({ key: 'same-operation', amount: 1500 });
  await assert.rejects(
    insertPayment({ key: 'same-operation' }),
    sqlError('23505'),
  );
  await assert.rejects(insertPayment({ status: 'VOIDED' }), sqlError('23514'));
  await db.query(
    "UPDATE payments SET status = 'VOIDED', void_reason = 'Correção', voided_by = $1, voided_at = CURRENT_TIMESTAMP WHERE idempotency_key = 'same-operation'",
    [id.userA],
  );
});

test('Pix rejeita destinatário de outra pelada', async () => {
  await assert.rejects(
    db.query(
      "INSERT INTO pix_settings(group_id, recipient_admin_user_id, key_type, key_value, recipient_name, contact_phone) VALUES ($1, $2, 'EMAIL', 'test@example.com', 'Admin', '+5511999999999')",
      [id.groupA, id.userB],
    ),
    sqlError('23503'),
  );
});

test('caixa não multiplica receitas por despesas nem inclui mensalidade ou anulação', async () => {
  await insertPayment({ key: 'revenue-1', amount: 20000 });
  await insertPayment({ key: 'revenue-2', amount: 5000 });
  for (const amount of [10000, 5000]) {
    await db.query(
      "INSERT INTO expenses(id, group_id, match_id, description, amount_cents, occurred_at, recorded_by, idempotency_key) VALUES ($1, $2, $3, 'Quadra', $4, CURRENT_TIMESTAMP, $5, $6)",
      [randomUUID(), id.groupA, id.matchA, amount, id.userA, randomUUID()],
    );
  }
  const result = await db.query(
    `WITH revenue AS (
    SELECT SUM(p.amount_cents) AS cents FROM payments p
    JOIN match_participants mp ON (mp.group_id, mp.id, mp.participant_id) = (p.group_id, p.match_participant_id, p.participant_id)
    WHERE p.group_id = $1 AND mp.match_id = $2 AND p.status = 'CONFIRMED'
  ), cost AS (
    SELECT SUM(amount_cents) AS cents FROM expenses WHERE group_id = $1 AND match_id = $2 AND status = 'CONFIRMED'
  ) SELECT COALESCE(r.cents, 0)::int AS revenue, COALESCE(c.cents, 0)::int AS expense,
    (COALESCE(r.cents, 0) - COALESCE(c.cents, 0))::int AS balance
    FROM revenue r CROSS JOIN cost c`,
    [id.groupA, id.matchA],
  );
  assert.deepEqual(result.rows[0], {
    revenue: 25000,
    expense: 15000,
    balance: 10000,
  });
});

test('não é possível apagar participante com histórico financeiro', async () => {
  await assert.rejects(
    db.query('DELETE FROM participants WHERE id = $1', [id.participantA]),
    sqlError('23503'),
  );
});
