import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DrawPage } from '../src/pages/draw-page';
import { FinancePage } from '../src/pages/finance-page';
import { SettingsPage } from '../src/pages/settings-page';
import { setToken } from '../src/services/api';
const context = vi.hoisted(() => ({
  group: {
    id: 'group1',
    name: 'Pelada teste',
    primaryColor: '#15803d',
    timezone: 'America/Sao_Paulo',
  },
  admin: true,
  user: { id: 'user1', displayName: 'Victor', email: 'test@example.com' },
  revision: 0,
  refresh: vi.fn(),
}));
vi.mock('../src/hooks/use-group', () => ({ useGroup: () => context }));
const fetchMock = vi.fn<typeof fetch>();
const page = (items: unknown[]) => ({
  items,
  page: 1,
  limit: 100,
  total: items.length,
});
const player = {
  id: 'player1',
  name: 'Victor',
  modality: 'MONTHLY',
  userId: 'user1',
  active: true,
};
const member = {
  id: 'member1',
  groupId: 'group1',
  userId: 'user1',
  displayName: 'Victor',
  role: 'ADMIN',
  active: true,
};
beforeEach(() => {
  context.admin = true;
  setToken('test-session');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path.includes('/finance/summary'))
      return Response.json({
        revenueCents: 0,
        expenseCents: 0,
        balanceCents: 0,
        currency: 'BRL',
      });
    if (path.includes('/participants')) return Response.json(page([player]));
    if (path.includes('/members')) return Response.json(page([member]));
    if (path.endsWith('/pix')) return Response.json({ settings: null });
    return Response.json(page([]));
  });
});
test('sorteio exige quantidade exata e envia o contrato de goleiros da API', async () => {
  render(<DrawPage />);
  await screen.findByText('Selecionar jogador cadastrado');
  fireEvent.change(screen.getByLabelText('Pessoas por time'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByLabelText(/Um goleiro por time/));
  fireEvent.change(screen.getByLabelText('Nomes, um por linha'), {
    target: { value: 'João\nPedro\nLucas\nJosé' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar nomes' }));
  expect(
    (
      screen.getByRole('button', {
        name: 'Sortear os times',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByLabelText('João é goleiro'));
  fireEvent.click(screen.getByLabelText('José é goleiro'));
  fetchMock.mockImplementationOnce(async (_url, options) => {
    const input = JSON.parse(String(options?.body));
    return Response.json({
      teams: [
        { number: 1, players: input.players.slice(0, 2) },
        { number: 2, players: input.players.slice(2) },
      ],
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sortear os times' }));
  await screen.findByText('Times prontos para o jogo');
  const options = fetchMock.mock.calls.find(([url]) =>
    String(url).endsWith('/team-draws'),
  )?.[1];
  expect(JSON.parse(String(options?.body))).toMatchObject({
    teamCount: 2,
    playersPerTeam: 2,
    hasGoalkeepers: true,
  });
});
test('recebimento mensal usa centavos e mantém idempotência após falha de conexão', async () => {
  let fail = true;
  const writes: Record<string, unknown>[] = [];
  const fallback = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      writes.push(JSON.parse(String(options.body)));
      if (fail) {
        fail = false;
        throw new TypeError('network');
      }
      return Response.json({ id: 'payment1' });
    }
    return fallback(url, options);
  });
  render(<FinancePage />);
  await screen.findByText('Lançamentos');
  fireEvent.click(screen.getByRole('button', { name: 'Recebimento' }));
  fireEvent.change(screen.getByLabelText('Referência'), {
    target: { value: 'MONTH' },
  });
  fireEvent.change(screen.getByLabelText('Jogador'), {
    target: { value: 'player1' },
  });
  fireEvent.change(screen.getByLabelText('Competência'), {
    target: { value: '2026-10' },
  });
  fireEvent.change(screen.getByLabelText('Valor recebido (R$)'), {
    target: { value: '27,50' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar recebimento' }),
  );
  await screen.findByRole('alert');
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar recebimento' }),
  );
  await waitFor(() => expect(writes.length).toBe(2));
  expect(writes[0]).toEqual(writes[1]);
  expect(writes[0]).toMatchObject({
    amountCents: 2750,
    competence: '2026-10',
    participantId: 'player1',
    method: 'PIX',
  });
  expect(writes[0].matchParticipantId).toBeUndefined();
});
test('usuário não recebe controles administrativos ou consulta despesas', async () => {
  context.admin = false;
  render(<FinancePage />);
  await screen.findByText('Lançamentos');
  expect(screen.queryByRole('button', { name: 'Recebimento' })).toBeNull();
  expect(
    fetchMock.mock.calls.some(([url]) => String(url).includes('/expenses')),
  ).toBe(false);
});
test('criar convite envia ttlDays e exibe o segredo somente na criação', async () => {
  const fallback = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) =>
    options?.method === 'POST'
      ? Response.json({
          id: 'invite1',
          email: 'novo@example.com',
          token: 'a'.repeat(64),
          role: 'USER',
        })
      : fallback(url, options),
  );
  render(<SettingsPage />);
  await screen.findByText('Identidade da pelada');
  fireEvent.click(screen.getByRole('button', { name: 'Convites' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Criar convite' }));
  fireEvent.change(screen.getByLabelText('E-mail convidado'), {
    target: { value: 'novo@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Validade (dias)'), {
    target: { value: '3' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar convite' }));
  await screen.findByText('Convite criado');
  expect(
    (screen.getByLabelText('Código criado') as HTMLTextAreaElement).value,
  ).toBe('a'.repeat(64));
  const options = fetchMock.mock.calls.find(
    ([, options]) => options?.method === 'POST',
  )?.[1];
  expect(JSON.parse(String(options?.body))).toMatchObject({
    ttlDays: 3,
    email: 'novo@example.com',
    role: 'USER',
  });
});
