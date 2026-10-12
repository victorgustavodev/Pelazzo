import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../test-dist/src/app.module.js';
import { configureApi } from '../test-dist/src/shared/presentation/configure-api.js';
import { PrismaService } from '../test-dist/src/shared/database/prisma.service.js';

const database = new URL(
  process.env.TEST_DATABASE_URL || 'postgresql://localhost/invalid',
);
assert.match(database.pathname, /^\/pelazzo_test_[0-9a-f]{16}$/);
assert.equal(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
let app, base, prisma;
const password = 'TestPassword123!';
let owner,
  user,
  outsider,
  group,
  otherGroup,
  ownerPlayer,
  userPlayer,
  guestPlayer,
  match,
  presence,
  ownerPresence;
let payment1, payment2, expense1, expense2;
function redacted(value) {
  return JSON.stringify(value, (key, item) =>
    /token|password|secret|keyValue|contactPhone/i.test(key)
      ? '[redacted]'
      : item,
  );
}
async function call(method, path, expected, body, grant) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(grant ? { authorization: `Bearer ${grant.token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const content = await response.text();
  let data;
  try {
    data = content ? JSON.parse(content) : null;
  } catch {
    data = content;
  }
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${redacted(data)}`,
  );
  return data;
}
const route = (suffix = '') => `/groups/${group.id}${suffix}`;
before(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = module.createNestApplication({ logger: false });
  configureApi(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  prisma = app.get(PrismaService);
  owner = await call('POST', '/auth/register', 201, {
    displayName: 'Owner',
    email: 'owner@example.com',
    password,
  });
  user = await call('POST', '/auth/register', 201, {
    displayName: 'Player',
    email: 'player@example.com',
    password,
  });
  outsider = await call('POST', '/auth/register', 201, {
    displayName: 'Outside',
    email: 'outside@example.com',
    password,
  });
});
after(async () => {
  if (app) await app.close();
});

test('autenticação protege recursos e não retorna senha ou papel global', async () => {
  await call('GET', '/groups', 401);
  await call('GET', '/groups', 401, undefined, { token: 'invalid' });
  assert.deepEqual(Object.keys(owner.user).sort(), [
    'displayName',
    'email',
    'id',
  ]);
  assert.deepEqual(
    await call('GET', '/auth/me', 200, undefined, owner),
    owner.user,
  );
  await call('POST', '/auth/login', 401, {
    email: 'owner@example.com',
    password: 'IncorrectPassword123!',
  });
  await call('POST', '/auth/register', 409, {
    displayName: 'Duplicate',
    email: 'OWNER@example.com',
    password,
  });
  await call('POST', '/auth/register', 400, {
    displayName: 'Injection',
    email: 'injection@example.com',
    password,
    role: 'ADMIN',
  });
  const account = await prisma.account.findFirst({
    where: { userId: owner.user.id },
  });
  assert.ok(
    account.password && account.password !== password,
    'Senha precisa estar protegida pela biblioteca.',
  );
});
test('criação da pelada é atômica com primeiro admin; acesso é isolado por pelada', async () => {
  group = await call('POST', '/groups', 201, { name: 'Pelada A' }, owner);
  otherGroup = await call(
    'POST',
    '/groups',
    201,
    { name: 'Pelada B' },
    outsider,
  );
  const members = await call('GET', route('/members'), 200, undefined, owner);
  assert.equal(members.total, 1);
  assert.equal(members.items[0].role, 'ADMIN');
  const ownMembership = await call(
    'GET',
    route('/membership'),
    200,
    undefined,
    owner,
  );
  assert.equal(ownMembership.userId, owner.user.id);
  assert.equal(ownMembership.role, 'ADMIN');
  await call('GET', route('/membership'), 403, undefined, outsider);
  await call('GET', route(), 403, undefined, outsider);
  await call('GET', `/groups/${otherGroup.id}`, 403, undefined, owner);
  await call(
    'PATCH',
    route(`/members/${owner.user.id}`),
    409,
    { active: false },
    owner,
  );
  await call(
    'PATCH',
    route(`/members/${owner.user.id}`),
    409,
    { role: 'USER' },
    owner,
  );
  const list = await call('GET', '/groups', 200, undefined, owner);
  assert.equal(list.total, 1);
  await call('GET', route('/participants?page=0'), 400, undefined, owner);
});
test('convites exigem token secreto, e-mail correto e aceitação única', async () => {
  const invitation = await call(
    'POST',
    route('/invitations'),
    201,
    { email: user.user.email },
    owner,
  );
  const stored = await prisma.groupInvitation.findUnique({
    where: { id: invitation.id },
  });
  assert.ok(stored.tokenHash !== invitation.token);
  await call(
    'POST',
    '/invitations/accept',
    403,
    { token: invitation.token },
    outsider,
  );
  const membership = await call(
    'POST',
    '/invitations/accept',
    200,
    { token: invitation.token },
    user,
  );
  assert.equal(membership.role, 'USER');
  await call(
    'POST',
    '/invitations/accept',
    409,
    { token: invitation.token },
    user,
  );
  const list = await call('GET', route('/invitations'), 200, undefined, owner);
  assert.ok(!('token' in list.items[0]) && !('tokenHash' in list.items[0]));
  await call(
    'POST',
    route('/invitations'),
    403,
    { email: outsider.user.email },
    user,
  );
  await call(
    'DELETE',
    route(`/invitations/${invitation.id}`),
    409,
    undefined,
    owner,
  );
  await call('GET', route('/audit'), 403, undefined, user);
});
test('nome, tema e Pix são administrados sem confirmar pagamentos', async () => {
  await call('PATCH', route(), 403, { name: 'Unauthorized' }, user);
  const updated = await call(
    'PATCH',
    route(),
    200,
    {
      name: 'Pelada dos irresponsáveis',
      primaryColor: '#123456',
      timezone: 'America/Sao_Paulo',
    },
    owner,
  );
  assert.equal(updated.name, 'Pelada dos irresponsáveis');
  assert.equal(updated.primaryColor, '#123456');
  await call('PATCH', route(), 400, { primaryColor: '#fff' }, owner);
  await call('PATCH', route(), 400, { name: null }, owner);
  await call('PATCH', route(), 400, { timezone: 'Wrong/Zone' }, owner);
  assert.deepEqual(await call('GET', route('/pix'), 200, undefined, owner), {
    settings: null,
  });
  const pix = {
    recipientAdminUserId: owner.user.id,
    keyType: 'EMAIL',
    keyValue: 'PIX@EXAMPLE.COM',
    recipientName: 'Owner',
    contactPhone: '+5511999999999',
  };
  await call(
    'PATCH',
    route('/pix'),
    400,
    { ...pix, recipientAdminUserId: outsider.user.id },
    owner,
  );
  await call(
    'PATCH',
    route('/pix'),
    400,
    { ...pix, recipientAdminUserId: user.user.id },
    owner,
  );
  await call('PATCH', route('/pix'), 403, pix, user);
  assert.equal(
    (await call('PATCH', route('/pix'), 200, pix, owner)).keyValue,
    'pix@example.com',
  );
  const result = (await call('GET', route('/pix'), 200, undefined, user))
    .settings;
  assert.ok(result.receiptUrl.startsWith('https://wa.me/5511999999999'));
  assert.equal(
    (await call('GET', route('/payments'), 200, undefined, owner)).total,
    0,
  );
});
test('CRUD de participantes e partidas preserva modalidade histórica e valores privados', async () => {
  ownerPlayer = await call(
    'POST',
    route('/participants'),
    201,
    { name: 'Owner', modality: 'MONTHLY', userId: owner.user.id },
    owner,
  );
  userPlayer = await call(
    'POST',
    route('/participants'),
    201,
    { name: 'Player', modality: 'DAILY', userId: user.user.id },
    owner,
  );
  guestPlayer = await call(
    'POST',
    route('/participants'),
    201,
    { name: 'Guest', modality: 'DAILY' },
    owner,
  );
  await call(
    'POST',
    route('/participants'),
    409,
    { name: 'Duplicate account', modality: 'DAILY', userId: user.user.id },
    owner,
  );
  await call(
    'POST',
    route('/participants'),
    400,
    { name: 'Foreign', modality: 'DAILY', userId: outsider.user.id },
    owner,
  );
  await call(
    'POST',
    route('/participants'),
    403,
    { name: 'Blocked', modality: 'DAILY' },
    user,
  );
  await call(
    'GET',
    route(`/participants/${guestPlayer.id}`),
    200,
    undefined,
    user,
  );
  await call(
    'PATCH',
    route(`/participants/${guestPlayer.id}`),
    200,
    { name: 'Guest changed' },
    owner,
  );
  assert.equal(
    (await call('GET', route('/participants'), 200, undefined, owner)).total,
    3,
  );
  match = await call(
    'POST',
    route('/matches'),
    201,
    { title: 'Partida', startsAt: '2026-11-01T19:00:00-03:00' },
    owner,
  );
  await call(
    'POST',
    route('/matches'),
    403,
    { title: 'Blocked', startsAt: '2026-11-01T19:00:00Z' },
    user,
  );
  await call('GET', route(`/matches/${match.id}`), 200, undefined, user);
  await call(
    'PATCH',
    route(`/matches/${match.id}`),
    200,
    { title: 'Partida atualizada' },
    owner,
  );
  presence = await call(
    'POST',
    route(`/matches/${match.id}/participants`),
    201,
    { participantId: userPlayer.id, expectedAmountCents: 4000 },
    owner,
  );
  ownerPresence = await call(
    'POST',
    route(`/matches/${match.id}/participants`),
    201,
    { participantId: ownerPlayer.id, expectedAmountCents: 5000 },
    owner,
  );
  await call(
    'POST',
    route(`/matches/${match.id}/participants`),
    409,
    { participantId: userPlayer.id },
    owner,
  );
  await call(
    'PATCH',
    route(`/participants/${userPlayer.id}`),
    200,
    { modality: 'MONTHLY' },
    owner,
  );
  const list = await call(
    'GET',
    route(`/matches/${match.id}/participants`),
    200,
    undefined,
    user,
  );
  assert.equal(
    list.items.find((row) => row.id === presence.id).modalitySnapshot,
    'DAILY',
  );
  assert.ok(
    !(
      'expectedAmountCents' in
      list.items.find((row) => row.id === ownerPresence.id)
    ),
  );
  await call('PATCH', route(`/participations/${presence.id}`), 400, {}, owner);
  await call(
    'PATCH',
    route(`/participations/${presence.id}`),
    200,
    { expectedAmountCents: null },
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participations/${presence.id}/settlement`),
        200,
        undefined,
        user,
      )
    ).status,
    'UNDEFINED',
  );
  await call(
    'PATCH',
    route(`/participations/${presence.id}`),
    200,
    { expectedAmountCents: 4000 },
    owner,
  );
  const guestPresence = await call(
    'POST',
    route(`/matches/${match.id}/participants`),
    201,
    { participantId: guestPlayer.id },
    owner,
  );
  await call(
    'DELETE',
    route(`/participations/${guestPresence.id}`),
    204,
    undefined,
    owner,
  );
  await call(
    'DELETE',
    route(`/participants/${guestPlayer.id}`),
    204,
    undefined,
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participants/${guestPlayer.id}`),
        200,
        undefined,
        owner,
      )
    ).active,
    false,
  );
});
test('recebimentos parciais, idempotência concorrente, privacidade e caixa', async () => {
  const input = {
    participantId: userPlayer.id,
    matchParticipantId: presence.id,
    amountCents: 1500,
    method: 'PIX',
    idempotencyKey: 'payment-1',
  };
  await call('POST', route('/payments'), 403, input, user);
  await call(
    'POST',
    route('/payments'),
    400,
    { ...input, amountCents: -1 },
    owner,
  );
  await call(
    'POST',
    route('/payments'),
    400,
    { ...input, currency: 'USD' },
    owner,
  );
  await call(
    'POST',
    route('/payments'),
    400,
    { ...input, matchParticipantId: ownerPresence.id },
    owner,
  );
  const concurrent = await Promise.all([
    call('POST', route('/payments'), 201, input, owner),
    call('POST', route('/payments'), 201, input, owner),
  ]);
  assert.equal(concurrent[0].id, concurrent[1].id);
  payment1 = concurrent[0];
  await call(
    'POST',
    route('/payments'),
    409,
    { ...input, amountCents: 1600 },
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participations/${presence.id}/settlement`),
        200,
        undefined,
        user,
      )
    ).status,
    'PARTIAL',
  );
  payment2 = await call(
    'POST',
    route('/payments'),
    201,
    { ...input, amountCents: 2500, idempotencyKey: 'payment-2' },
    owner,
  );
  const ownerPayment = await call(
    'POST',
    route('/payments'),
    201,
    {
      ...input,
      participantId: ownerPlayer.id,
      matchParticipantId: ownerPresence.id,
      amountCents: 5000,
      idempotencyKey: 'payment-owner',
    },
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participations/${presence.id}/settlement`),
        200,
        undefined,
        user,
      )
    ).status,
    'PAID',
  );
  await call(
    'POST',
    route('/payments'),
    201,
    {
      participantId: userPlayer.id,
      competence: '2026-10',
      amountCents: 10000,
      method: 'PIX',
      idempotencyKey: 'monthly',
    },
    owner,
  );
  expense1 = await call(
    'POST',
    route('/expenses'),
    201,
    {
      matchId: match.id,
      description: 'Quadra',
      amountCents: 2000,
      idempotencyKey: 'expense-1',
    },
    owner,
  );
  expense2 = await call(
    'POST',
    route('/expenses'),
    201,
    {
      matchId: match.id,
      description: 'Bola',
      amountCents: 1000,
      idempotencyKey: 'expense-2',
    },
    owner,
  );
  const cash = await call(
    'GET',
    route(`/matches/${match.id}/cash`),
    200,
    undefined,
    user,
  );
  assert.deepEqual(cash, {
    revenueCents: 9000,
    expenseCents: 3000,
    balanceCents: 6000,
    currency: 'BRL',
  });
  assert.equal(
    (await call('GET', route('/finance/summary'), 200, undefined, user))
      .revenueCents,
    19000,
  );
  assert.equal(
    (await call('GET', route('/payments'), 200, undefined, user)).total,
    3,
  );
  await call(
    'GET',
    route(`/payments/${ownerPayment.id}`),
    403,
    undefined,
    user,
  );
  await call(
    'GET',
    route(`/payments?participantId=${ownerPlayer.id}`),
    403,
    undefined,
    user,
  );
  await call(
    'GET',
    route(`/participations/${ownerPresence.id}/settlement`),
    403,
    undefined,
    user,
  );
  await call('GET', route('/expenses'), 403, undefined, user);
  await call(
    'GET',
    route(`/payments/${payment1.id}`),
    403,
    undefined,
    outsider,
  );
  await call(
    'DELETE',
    route(`/participations/${presence.id}`),
    409,
    undefined,
    owner,
  );
  const foreign = await call(
    'POST',
    `/groups/${otherGroup.id}/participants`,
    201,
    { name: 'Foreign', modality: 'DAILY' },
    outsider,
  );
  await call(
    'POST',
    route('/payments'),
    404,
    { ...input, participantId: foreign.id, idempotencyKey: 'foreign' },
    owner,
  );
});
test('correções e anulações preservam originais e não duplicam lançamentos', async () => {
  const input = {
    participantId: userPlayer.id,
    matchParticipantId: presence.id,
    amountCents: 1800,
    method: 'PIX',
    idempotencyKey: 'correction-1',
    reason: 'Valor conferido',
  };
  await call(
    'POST',
    route(`/payments/${payment1.id}/corrections`),
    403,
    input,
    user,
  );
  const result = await call(
    'POST',
    route(`/payments/${payment1.id}/corrections`),
    201,
    input,
    owner,
  );
  assert.equal(result.original.amountCents, 1500);
  assert.equal(result.original.status, 'VOIDED');
  assert.equal(result.replacement.replacesId, payment1.id);
  assert.equal(
    (
      await call(
        'POST',
        route(`/payments/${payment1.id}/corrections`),
        201,
        input,
        owner,
      )
    ).replacement.id,
    result.replacement.id,
  );
  await call(
    'POST',
    route(`/payments/${payment1.id}/corrections`),
    409,
    { ...input, amountCents: 1900 },
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participations/${presence.id}/settlement`),
        200,
        undefined,
        user,
      )
    ).excessAmountCents,
    300,
  );
  await call(
    'POST',
    route(`/payments/${payment2.id}/void`),
    200,
    { reason: 'Anulação' },
    owner,
  );
  await call(
    'POST',
    route(`/payments/${payment2.id}/void`),
    200,
    { reason: 'Anulação' },
    owner,
  );
  await call(
    'POST',
    route(`/payments/${payment2.id}/void`),
    409,
    { reason: 'Outro motivo' },
    owner,
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/participations/${presence.id}/settlement`),
        200,
        undefined,
        user,
      )
    ).status,
    'PARTIAL',
  );
  const expenseInput = {
    matchId: match.id,
    description: 'Quadra corrigida',
    amountCents: 2500,
    idempotencyKey: 'expense-correction',
    reason: 'Conferência',
  };
  const corrected = await call(
    'POST',
    route(`/expenses/${expense1.id}/corrections`),
    201,
    expenseInput,
    owner,
  );
  assert.equal(corrected.original.amountCents, 2000);
  assert.equal(corrected.replacement.replacesId, expense1.id);
  assert.equal(
    (
      await call(
        'POST',
        route(`/expenses/${expense1.id}/corrections`),
        201,
        expenseInput,
        owner,
      )
    ).replacement.id,
    corrected.replacement.id,
  );
  await call(
    'POST',
    route(`/expenses/${expense2.id}/void`),
    200,
    { reason: 'Sem custo' },
    owner,
  );
  const cash = await call(
    'GET',
    route(`/matches/${match.id}/cash`),
    200,
    undefined,
    user,
  );
  assert.deepEqual(cash, {
    revenueCents: 6800,
    expenseCents: 2500,
    balanceCents: 4300,
    currency: 'BRL',
  });
  await call('DELETE', route(`/matches/${match.id}`), 204, undefined, owner);
  assert.equal(
    (await call('GET', route(`/matches/${match.id}`), 200, undefined, owner))
      .status,
    'CANCELED',
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/payments/${payment1.id}`),
        200,
        undefined,
        owner,
      )
    ).status,
    'VOIDED',
  );
  assert.equal(
    (
      await call(
        'GET',
        route(`/matches/${match.id}/cash`),
        200,
        undefined,
        user,
      )
    ).balanceCents,
    4300,
  );
});
test('usuário e admin sorteiam com goleiros, sem alterar financeiro ou presença', async () => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    name: `Player ${index}`,
  }));
  const input = {
    teamCount: 2,
    playersPerTeam: 5,
    hasGoalkeepers: false,
    players,
  };
  for (const actor of [user, owner]) {
    const result = await call('POST', route('/team-draws'), 200, input, actor);
    assert.deepEqual(
      result.teams.map((t) => t.players.length),
      [5, 5],
    );
    assert.equal(
      new Set(result.teams.flatMap((t) => t.players.map((p) => p.id))).size,
      10,
    );
  }
  const keeperInput = {
    ...input,
    hasGoalkeepers: true,
    players: players.map((p, i) => ({ ...p, goalkeeper: i < 2 })),
  };
  const result = await call(
    'POST',
    route('/team-draws'),
    200,
    keeperInput,
    user,
  );
  assert.deepEqual(
    result.teams.map((t) => t.players.filter((p) => p.goalkeeper).length),
    [1, 1],
  );
  await call(
    'POST',
    route('/team-draws'),
    400,
    { ...input, players: players.slice(1) },
    user,
  );
  await call(
    'POST',
    route('/team-draws'),
    400,
    { ...input, hasGoalkeepers: true },
    user,
  );
  await call('POST', route('/team-draws'), 403, input, outsider);
  assert.equal(
    (
      await call(
        'GET',
        route(`/matches/${match.id}/cash`),
        200,
        undefined,
        user,
      )
    ).balanceCents,
    4300,
  );
});
test('último administrador permanece protegido em alterações simultâneas', async () => {
  await call(
    'PATCH',
    route(`/members/${user.user.id}`),
    200,
    { role: 'ADMIN' },
    owner,
  );
  async function demote(actor) {
    const response = await fetch(
      `${base}/api${route(`/members/${actor.user.id}`)}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ role: 'USER' }),
      },
    );
    return response.status;
  }
  const statuses = await Promise.all([demote(owner), demote(user)]);
  assert.deepEqual(statuses.sort(), [200, 409]);
  const members = await call('GET', route('/members'), 200, undefined, owner);
  assert.equal(
    members.items.filter((m) => m.active && m.role === 'ADMIN').length,
    1,
  );
  const admin =
    members.items.find((m) => m.role === 'ADMIN').userId === owner.user.id
      ? owner
      : user;
  if (members.items.find((m) => m.userId === owner.user.id).role !== 'ADMIN')
    assert.deepEqual(await call('GET', route('/pix'), 200, undefined, owner), {
      settings: null,
    });
  await call('DELETE', route('/pix'), 204, undefined, admin);
  const invite = await call(
    'POST',
    route('/invitations'),
    201,
    { email: outsider.user.email },
    admin,
  );
  await call(
    'DELETE',
    route(`/invitations/${invite.id}`),
    204,
    undefined,
    admin,
  );
  await call(
    'POST',
    '/invitations/accept',
    409,
    { token: invite.token },
    outsider,
  );
  const expired = await call(
    'POST',
    route('/invitations'),
    201,
    { email: outsider.user.email },
    admin,
  );
  await prisma.groupInvitation.update({
    where: { id: expired.id },
    data: {
      createdAt: new Date(Date.now() - 3 * 86400000),
      expiresAt: new Date(Date.now() - 86400000),
    },
  });
  await call(
    'POST',
    '/invitations/accept',
    409,
    { token: expired.token },
    outsider,
  );
  const events = await call(
    'GET',
    route('/audit?limit=100'),
    200,
    undefined,
    admin,
  );
  assert.ok(events.total > 0);
  assert.ok(!JSON.stringify(events).includes('pix@example.com'));
});
test('Swagger documenta esquemas, status e autenticação Bearer', async () => {
  const response = await fetch(`${base}/api/docs-json`);
  assert.equal(response.status, 200);
  const spec = await response.json();
  assert.equal(spec.components.securitySchemes.session.scheme, 'bearer');
  assert.ok(spec.paths['/api/auth/register'].post.requestBody);
  assert.ok(spec.paths['/api/groups/{groupId}/payments'].post.responses['201']);
  assert.ok(
    spec.paths['/api/groups/{groupId}/payments'].post.security.some(
      (s) => 'session' in s,
    ),
  );
  assert.ok(spec.paths['/api/groups/{groupId}/team-draws'].post);
  assert.ok(spec.components.schemas.DrawTeamsDto.properties.players.items.$ref);
  assert.equal((await fetch(`${base}/api/docs`)).status, 200);
});
test('troca de senha revoga outras sessões e logout invalida o token atual', async () => {
  const otherSession = await call('POST', '/auth/login', 200, {
    email: owner.user.email,
    password,
  });
  const newPassword = 'NewTestPassword123!';
  await call(
    'POST',
    '/auth/change-password',
    204,
    { currentPassword: password, newPassword },
    owner,
  );
  await call('GET', '/auth/me', 401, undefined, otherSession);
  await call('POST', '/auth/login', 401, { email: owner.user.email, password });
  const next = await call('POST', '/auth/login', 200, {
    email: owner.user.email,
    password: newPassword,
  });
  await call('POST', '/auth/logout', 204, undefined, next);
  await call('GET', '/auth/me', 401, undefined, next);
});
