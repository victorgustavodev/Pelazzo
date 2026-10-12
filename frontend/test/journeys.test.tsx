import { beforeEach, expect, test, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DrawPage } from '../src/pages/draw-page';
import { AttendancePage } from '../src/pages/attendance-page';
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
  await screen.findByLabelText('Nome do jogador 1');
  expect(
    screen.getAllByRole('textbox', { name: /Nome do jogador/ }),
  ).toHaveLength(10);
  expect(screen.getByText('2 × 5 = 10')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Pessoas por time'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByLabelText(/Um goleiro por time/));
  expect(
    screen.getAllByRole('textbox', { name: /Nome do jogador/ }),
  ).toHaveLength(4);
  ['João', 'Pedro', 'Lucas', 'José'].forEach((name, index) =>
    fireEvent.change(screen.getByLabelText(`Nome do jogador ${index + 1}`), {
      target: { value: name },
    }),
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'Sortear os times',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByLabelText('Jogador 1 é goleiro'));
  fireEvent.click(screen.getByLabelText('Jogador 4 é goleiro'));
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
    players: [
      { name: 'João', goalkeeper: true },
      { name: 'Pedro', goalkeeper: false },
      { name: 'Lucas', goalkeeper: false },
      { name: 'José', goalkeeper: true },
    ],
  });
});

test('alterar vagas preserva nomes e impede sorteio com campos vazios ou configuração excessiva', async () => {
  render(<DrawPage />);
  await screen.findByLabelText('Nome do jogador 1');
  fireEvent.change(screen.getByLabelText('Nome do jogador 10'), {
    target: { value: 'Último jogador' },
  });
  fireEvent.change(screen.getByLabelText('Pessoas por time'), {
    target: { value: '2' },
  });
  expect(screen.queryByLabelText('Nome do jogador 10')).toBeNull();
  fireEvent.change(screen.getByLabelText('Pessoas por time'), {
    target: { value: '5' },
  });
  expect(
    (screen.getByLabelText('Nome do jogador 10') as HTMLInputElement).value,
  ).toBe('Último jogador');
  expect(
    (
      screen.getByRole('button', {
        name: 'Sortear os times',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText('Quantidade de times'), {
    target: { value: '50' },
  });
  fireEvent.change(screen.getByLabelText('Pessoas por time'), {
    target: { value: '50' },
  });
  expect(
    screen.queryAllByRole('textbox', { name: /Nome do jogador/ }),
  ).toHaveLength(0);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(
    fetchMock.mock.calls.some(([url]) => String(url).endsWith('/team-draws')),
  ).toBe(false);
});

test('link compartilhado abre modal, pede só nome e confirma local sem conta', async () => {
  setToken(null);
  const token = 'b'.repeat(64);
  const game = {
    groupName: 'Pelada da turma',
    title: 'Sábado de bola',
    location: 'Campo Central — Rua das Flores, 100',
    startsAt: '2026-11-01T19:00:00Z',
    timezone: 'America/Sao_Paulo',
    primaryColor: '#15803d',
  };
  fetchMock.mockImplementation(async (url) =>
    Response.json(
      String(url).endsWith('/attendance/confirm')
        ? { name: 'João', match: game }
        : game,
    ),
  );
  render(
    <MemoryRouter initialEntries={[`/attendance#${token}`]}>
      <AttendancePage />
    </MemoryRouter>,
  );
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
  expect(screen.queryByLabelText(/E-mail/)).toBeNull();
  expect(screen.queryByLabelText(/Senha/)).toBeNull();
  fireEvent.change(within(dialog).getByLabelText('Seu nome'), {
    target: { value: 'João' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Confirmar presença' }),
  );
  await within(dialog).findByText('Presença confirmada!');
  expect(within(dialog).getByText(game.location)).toBeTruthy();
  expect(within(dialog).getByText('João, te aguardo em:')).toBeTruthy();
  const options = fetchMock.mock.calls.find(([url]) =>
    String(url).endsWith('/attendance/confirm'),
  )?.[1];
  expect(JSON.parse(String(options?.body))).toEqual({ token, name: 'João' });
  expect(new Headers(options?.headers).has('authorization')).toBe(false);
});

test('link inválido não abre formulário nem consulta dados da partida', async () => {
  render(
    <MemoryRouter initialEntries={['/attendance#invalid']}>
      <AttendancePage />
    </MemoryRouter>,
  );
  await screen.findByRole('alert');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByLabelText('Seu nome')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
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
