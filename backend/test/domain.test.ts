import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  drawTeams,
  type DrawInput,
} from '../src/modules/team-draw/domain/entities/draw.js';
import {
  settlement,
  cents,
} from '../src/modules/finance/domain/entities/finance.js';
import {
  groupData,
  pixData,
} from '../src/modules/groups/domain/entities/group.js';
import { BusinessError } from '../src/shared/domain/errors.js';
import type {
  UnitOfWork,
  Repositories,
} from '../src/shared/domain/unit-of-work.js';
import {
  GetCashUseCase,
  ListPaymentsUseCase,
} from '../src/modules/finance/application/use-cases/finance.use-cases.js';
import { UpdateMemberUseCase } from '../src/modules/groups/application/use-cases/groups.use-cases.js';
import { CreateGroupUseCase } from '../src/modules/groups/application/use-cases/groups.use-cases.js';
import { SystemRuntime } from '../src/shared/infrastructure/system-runtime.js';

const players = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  name: `Jogador ${i}`,
  goalkeeper: i < 2,
}));
const base: DrawInput = {
  teamCount: 2,
  playersPerTeam: 5,
  hasGoalkeepers: true,
  players,
};
const random = { randomInt: (max: number) => Math.floor(max / 2) };
const failure = (kind: string) => (error: unknown) =>
  error instanceof BusinessError && error.kind === kind;
test('sorteio não omite/duplica entradas e mantém um goleiro por time', () => {
  const original = JSON.stringify(base);
  const result = drawTeams(base, random);
  assert.equal(JSON.stringify(base), original);
  assert.deepEqual(
    result.teams.map((team) => team.players.length),
    [5, 5],
  );
  assert.deepEqual(
    result.teams.map((team) => team.players.filter((p) => p.goalkeeper).length),
    [1, 1],
  );
  assert.equal(
    new Set(result.teams.flatMap((team) => team.players.map((p) => p.id))).size,
    10,
  );
  assert.deepEqual(
    drawTeams(
      {
        ...base,
        hasGoalkeepers: false,
        players: players.map((p) => ({ ...p, goalkeeper: false })),
      },
      random,
    ).teams.map((team) => team.players.length),
    [5, 5],
  );
});
test('sorteio valida quantidade, goleiros, nomes, homônimos e identificadores', () => {
  for (const input of [
    { ...base, players: players.slice(1) },
    { ...base, players: [...players, players[0]] },
    { ...base, teamCount: 1 },
    { ...base, playersPerTeam: 1.5 },
    { ...base, hasGoalkeepers: false },
    { ...base, players: players.map((p) => ({ ...p, goalkeeper: false })) },
    {
      ...base,
      players: players.map((p, i) => ({ ...p, name: i === 1 ? ' ' : p.name })),
    },
    {
      ...base,
      players: players.map((p, i) => ({
        ...p,
        name: i === 1 ? players[0].name : p.name,
      })),
    },
    {
      ...base,
      players: players.map((p, i) => ({
        ...p,
        id: i === 1 ? players[0].id : p.id,
      })),
    },
  ])
    assert.throws(() => drawTeams(input, random), failure('INVALID'));
});
test('quitação distingue valor indefinido, parcial e excedente sem criar crédito', () => {
  assert.deepEqual(settlement(null, 2750n), {
    status: 'UNDEFINED',
    expectedAmountCents: null,
    paidAmountCents: 2750,
    remainingAmountCents: null,
    excessAmountCents: 0,
  });
  assert.equal(settlement(4000, 0n).status, 'UNPAID');
  assert.equal(settlement(4000, 1500n).status, 'PARTIAL');
  assert.equal(settlement(4000, 4000n).status, 'PAID');
  assert.equal(settlement(4000, 4500n).excessAmountCents, 500);
  assert.throws(() => cents(9007199254740992n), failure('INVALID'));
});
test('personalização e Pix validam formatos sem afirmar titularidade', () => {
  assert.equal(groupData({ name: '  Pelada  ' }).name, 'Pelada');
  assert.throws(() => groupData({ name: 'x' }), failure('INVALID'));
  assert.throws(
    () => groupData({ name: 'Pelada', primaryColor: 'red' }),
    failure('INVALID'),
  );
  assert.throws(
    () => groupData({ name: 'Pelada', timezone: 'Wrong/Zone' }),
    failure('INVALID'),
  );
  const common = {
    recipientAdminUserId: 'id',
    recipientName: 'Admin',
    contactPhone: '+55 (11) 99999-9999',
  };
  for (const [keyType, keyValue, expected] of [
    ['CPF', '123.456.789-00', '12345678900'],
    ['CNPJ', '00.000.000/E08G-12', '00000000E08G12'],
    ['EMAIL', 'PIX@EXAMPLE.COM', 'pix@example.com'],
    ['PHONE', '+55 (11) 99999-9999', '+5511999999999'],
    [
      'RANDOM',
      'a25ae7b9-cf75-4f8a-b874-7bb3c2c32210',
      'a25ae7b9-cf75-4f8a-b874-7bb3c2c32210',
    ],
  ] as const)
    assert.equal(pixData({ ...common, keyType, keyValue }).keyValue, expected);
  assert.throws(
    () => pixData({ ...common, keyType: 'CPF', keyValue: '123' }),
    failure('INVALID'),
  );
});
const actor = { id: 'owner', displayName: 'Owner', email: 'owner@example.com' };
function fakeWork(repositories: object): UnitOfWork {
  return { run: (operation) => operation(repositories as Repositories) };
}
test('caixa usa agregados separados e suporta saldo negativo', async () => {
  const work = fakeWork({
    groups: { lock: async () => true },
    members: { find: async () => ({ role: 'USER', active: true }) },
    payments: { sum: async () => 20000n },
    expenses: { sum: async () => 25000n },
  });
  assert.deepEqual(await new GetCashUseCase(work).execute(actor, 'group'), {
    revenueCents: 20000,
    expenseCents: 25000,
    balanceCents: -5000,
    currency: 'BRL',
  });
});
test('consulta financeira aplica filtro do titular e não aceita participante de terceiro', async () => {
  let captured: unknown;
  const work = fakeWork({
    groups: { lock: async () => true },
    members: { find: async () => ({ role: 'USER', active: true }) },
    participants: { find: async () => ({ userId: 'someone-else' }) },
    payments: {
      list: async (_group: string, query: unknown) => {
        captured = query;
        return { items: [] };
      },
    },
  });
  await new ListPaymentsUseCase(work).execute(actor, 'group', {
    page: 1,
    limit: 20,
  });
  assert.deepEqual(captured, { page: 1, limit: 20, userId: actor.id });
  await assert.rejects(
    new ListPaymentsUseCase(work).execute(actor, 'group', {
      page: 1,
      limit: 20,
      participantId: 'other',
    }),
    failure('FORBIDDEN'),
  );
});
test('último administrador não pode ser desativado nem rebaixado', async () => {
  let changed = false;
  const work = fakeWork({
    groups: { lock: async () => true },
    members: {
      find: async () => ({ role: 'ADMIN', active: true }),
      countAdmins: async () => 1,
      set: async () => {
        changed = true;
      },
    },
  });
  for (const input of [{ active: false }, { role: 'USER' as const }])
    await assert.rejects(
      new UpdateMemberUseCase(work).execute(actor, 'group', actor.id, input),
      failure('CONFLICT'),
    );
  assert.equal(changed, false);
});
test('usuário comum não pode alterar membros', async () => {
  const work = fakeWork({
    groups: { lock: async () => true },
    members: { find: async () => ({ role: 'USER', active: true }) },
  });
  await assert.rejects(
    new UpdateMemberUseCase(work).execute(actor, 'group', actor.id, {
      role: 'ADMIN',
    }),
    failure('FORBIDDEN'),
  );
});
test('criação de pelada coordena primeiro administrador e auditoria pela porta transacional', async () => {
  const calls: string[] = [];
  const work = fakeWork({
    groups: {
      create: async (data: { id: string }, userId: string) => {
        calls.push(userId);
        return data;
      },
    },
    audit: {
      append: async () => {
        calls.push('audit');
      },
    },
  });
  await new CreateGroupUseCase(work, new SystemRuntime()).execute(actor, {
    name: 'Pelada',
  });
  assert.deepEqual(calls, [actor.id, 'audit']);
});
