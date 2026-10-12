import { useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Pencil, Ban } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all } from '../services/api';
import type {
  Cash,
  Payment,
  Expense,
  Participant,
  Match,
  Participation,
  Page,
} from '../types/api';
import {
  PageHeading,
  CashCards,
  Loading,
  ErrorBox,
  Empty,
  Modal,
  MutationForm,
  Field,
  Badge,
  Pagination,
  Notice,
} from '../components/ui';
import { formText, date, money, moneyInput, parseMoney } from '../utils/format';
function PaymentForm({
  original,
  players,
  matches,
  close,
  saved,
}: {
  original?: Payment;
  players: Participant[];
  matches: Match[];
  close: () => void;
  saved: () => void;
}) {
  const { group } = useGroup();
  const base = `/groups/${group.id}`;
  const [key] = useState(() => crypto.randomUUID());
  const [reference, setReference] = useState('MATCH');
  const [matchId, setMatchId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const attendances = useResource(
    (s) =>
      matchId
        ? all<Participation>(`${base}/matches/${matchId}/participants`, s)
        : Promise.resolve([]),
    [group.id, matchId],
  );
  const selected = attendances.data?.find(
    (a) => a.participantId === participantId,
  );
  return (
    <Modal
      title={original ? 'Corrigir recebimento' : 'Registrar recebimento'}
      close={close}
    >
      <MutationForm
        cancel={close}
        label={
          original ? 'Corrigir e preservar original' : 'Registrar recebimento'
        }
        done={saved}
        submit={(data) => {
          const body = {
            participantId: original?.participantId ?? participantId,
            amountCents: parseMoney(formText(data, 'amount')),
            method: formText(data, 'method'),
            idempotencyKey: key,
            ...(original
              ? {
                  matchParticipantId: original.matchParticipantId,
                  competence: original.competence,
                  receivedAt: original.receivedAt,
                  reason: formText(data, 'reason'),
                }
              : reference === 'MONTH'
                ? { competence: formText(data, 'competence') }
                : { matchParticipantId: selected?.id }),
          };
          if (!original && reference === 'MATCH' && !selected)
            throw new Error(
              'Selecione um jogador que esteja na lista de presença desta partida.',
            );
          return api(
            `${base}/payments${original ? `/${original.id}/corrections` : ''}`,
            { method: 'POST', body },
          );
        }}
      >
        {original ? (
          <Notice>
            Original:{' '}
            {players.find((p) => p.id === original.participantId)?.name ??
              'Jogador'}{' '}
            · {money(original.amountCents)}. O original será anulado e
            substituído na mesma referência.
          </Notice>
        ) : (
          <>
            <Field label="Referência">
              <select
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setParticipantId('');
                }}
              >
                <option value="MATCH">Partida</option>
                <option value="MONTH">Competência mensal</option>
              </select>
            </Field>
            {reference === 'MATCH' ? (
              <>
                <Field label="Partida">
                  <select
                    required
                    value={matchId}
                    onChange={(e) => {
                      setMatchId(e.target.value);
                      setParticipantId('');
                    }}
                  >
                    <option value="">Selecione a partida</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} · {date(m.startsAt, group.timezone)}
                      </option>
                    ))}
                  </select>
                </Field>
                {attendances.loading ? (
                  <Loading />
                ) : attendances.error ? (
                  <ErrorBox
                    error={attendances.error}
                    retry={attendances.reload}
                  />
                ) : (
                  <Field label="Jogador presente">
                    <select
                      value={participantId}
                      required
                      onChange={(e) => setParticipantId(e.target.value)}
                    >
                      <option value="">Selecione o jogador</option>
                      {attendances.data?.map((a) => (
                        <option key={a.id} value={a.participantId}>
                          {players.find((p) => p.id === a.participantId)
                            ?.name ?? 'Jogador'}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            ) : (
              <>
                <Field label="Jogador">
                  <select
                    required
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                  >
                    <option value="">Selecione o jogador</option>
                    {players
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field
                  label="Competência"
                  hint="Este recebimento entra apenas no caixa geral."
                >
                  <input name="competence" type="month" required />
                </Field>
              </>
            )}
          </>
        )}
        <div className="form-grid">
          <Field label="Valor recebido (R$)">
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="27,50"
              defaultValue={moneyInput(original?.amountCents)}
            />
          </Field>
          <Field label="Forma">
            <select name="method" defaultValue={original?.method ?? 'PIX'}>
              <option value="PIX">Pix</option>
              <option value="CASH">Dinheiro</option>
              <option value="OTHER">Outro</option>
            </select>
          </Field>
        </div>
        {original && (
          <Field label="Motivo da correção">
            <textarea name="reason" required maxLength={500} rows={2} />
          </Field>
        )}
        <p className="muted fine">
          Registre somente o valor que você conferiu como recebido. Pagamentos
          parciais são permitidos.
        </p>
      </MutationForm>
    </Modal>
  );
}
function ExpenseForm({
  original,
  matches,
  close,
  saved,
}: {
  original?: Expense;
  matches: Match[];
  close: () => void;
  saved: () => void;
}) {
  const { group } = useGroup();
  const [key] = useState(() => crypto.randomUUID());
  return (
    <Modal
      title={original ? 'Corrigir despesa' : 'Registrar despesa'}
      close={close}
    >
      <MutationForm
        cancel={close}
        label={original ? 'Corrigir e preservar original' : 'Registrar despesa'}
        done={saved}
        submit={(data) =>
          api(
            `/groups/${group.id}/expenses${original ? `/${original.id}/corrections` : ''}`,
            {
              method: 'POST',
              body: {
                matchId: formText(data, 'matchId'),
                description: formText(data, 'description'),
                amountCents: parseMoney(formText(data, 'amount')),
                idempotencyKey: key,
                ...(original
                  ? {
                      reason: formText(data, 'reason'),
                      occurredAt: original.occurredAt,
                    }
                  : {}),
              },
            },
          )
        }
      >
        <Field label="Partida">
          <select
            name="matchId"
            required
            defaultValue={original?.matchId ?? ''}
          >
            <option value="" disabled>
              Selecione a partida
            </option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} · {date(m.startsAt, group.timezone)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <input
            name="description"
            required
            maxLength={255}
            defaultValue={original?.description}
            placeholder="Aluguel da quadra"
          />
        </Field>
        <Field label="Valor da despesa (R$)">
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={moneyInput(original?.amountCents)}
            placeholder="150,00"
          />
        </Field>
        {original && (
          <Field label="Motivo da correção">
            <textarea name="reason" required maxLength={500} />
          </Field>
        )}
      </MutationForm>
    </Modal>
  );
}
export function FinancePage() {
  const { group, admin, revision } = useGroup();
  const base = `/groups/${group.id}`;
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'payments' | 'expenses'>('payments');
  const resource = useResource(
    async (s) => {
      const [cash, players, matches, records] = await Promise.all([
        api<Cash>(`${base}/finance/summary`, { signal: s }),
        all<Participant>(`${base}/participants`, s),
        all<Match>(`${base}/matches`, s),
        api<Page<Payment | Expense>>(
          `${base}/${admin ? tab : 'payments'}?page=${page}&limit=20`,
          { signal: s },
        ),
      ]);
      return { cash, players, matches, records };
    },
    [group.id, admin, revision, tab, page],
  );
  const [modal, setModal] = useState<'payment' | 'expense' | null>(null);
  const [correction, setCorrection] = useState<Payment | Expense | null>(null);
  const [voiding, setVoiding] = useState<Payment | Expense | null>(null);
  const done = () => {
    setModal(null);
    setCorrection(null);
    setVoiding(null);
    resource.reload();
  };
  const isPayment = (record: Payment | Expense): record is Payment =>
    'participantId' in record;
  return (
    <>
      <PageHeading
        title="Caixa em dia, cabeça no jogo"
        description={
          admin
            ? 'Registre o que entrou e o que saiu, sempre com valores livres.'
            : 'Acompanhe o caixa da turma e seus próprios recebimentos.'
        }
        action={
          admin && (
            <div className="row">
              <button
                className="button secondary"
                onClick={() => setModal('expense')}
              >
                <ArrowUpRight size={18} /> Despesa
              </button>
              <button
                className="button primary"
                onClick={() => setModal('payment')}
              >
                <Plus size={18} /> Recebimento
              </button>
            </div>
          )
        }
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} retry={resource.reload} />
      ) : (
        resource.data && (
          <>
            <CashCards cash={resource.data.cash} general />
            {!admin && (
              <Notice>
                Os totais são da pelada. A lista abaixo mostra apenas os seus
                pagamentos. Seu jogador precisa estar vinculado à sua conta pelo
                administrador.
              </Notice>
            )}
            <section className="card table-card">
              <div className="section-heading padded">
                <h2>Lançamentos</h2>
                {admin && (
                  <div className="tabs compact">
                    <button
                      className={tab === 'payments' ? 'active' : ''}
                      onClick={() => {
                        setTab('payments');
                        setPage(1);
                      }}
                    >
                      Recebimentos
                    </button>
                    <button
                      className={tab === 'expenses' ? 'active' : ''}
                      onClick={() => {
                        setTab('expenses');
                        setPage(1);
                      }}
                    >
                      Despesas
                    </button>
                  </div>
                )}
              </div>
              {resource.data.records.items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          {tab === 'payments'
                            ? 'Jogador / referência'
                            : 'Despesa / partida'}
                        </th>
                        <th>Valor</th>
                        <th>Data</th>
                        <th>Estado</th>
                        {admin && <th>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {resource.data.records.items.map((record) => (
                        <tr
                          key={record.id}
                          className={
                            record.status === 'VOIDED' ? 'voided-row' : ''
                          }
                        >
                          <td>
                            <div className="ledger-label">
                              {isPayment(record) ? (
                                <ArrowDownLeft size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                              <div>
                                <strong>
                                  {isPayment(record)
                                    ? (resource.data?.players.find(
                                        (p) => p.id === record.participantId,
                                      )?.name ?? 'Jogador')
                                    : record.description}
                                </strong>
                                <small>
                                  {isPayment(record)
                                    ? record.competence
                                      ? `Competência ${record.competence}`
                                      : 'Recebimento de partida'
                                    : (resource.data?.matches.find(
                                        (m) => m.id === record.matchId,
                                      )?.title ?? 'Partida')}
                                  {record.replacesId && ' · Correção'}
                                </small>
                                {record.voidReason && (
                                  <small>Motivo: {record.voidReason}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="amount">
                            {money(record.amountCents)}
                          </td>
                          <td className="muted">
                            {date(
                              isPayment(record)
                                ? record.receivedAt
                                : record.occurredAt,
                              group.timezone,
                            )}
                          </td>
                          <td>
                            <Badge
                              tone={
                                record.status === 'CONFIRMED' ? 'green' : 'red'
                              }
                            >
                              {record.status === 'CONFIRMED'
                                ? 'Confirmado'
                                : 'Anulado'}
                            </Badge>
                          </td>
                          {admin && (
                            <td>
                              {record.status === 'CONFIRMED' && (
                                <div className="row">
                                  <button
                                    className="icon-button"
                                    aria-label={`Corrigir lançamento de ${money(record.amountCents)}`}
                                    onClick={() => setCorrection(record)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className="icon-button danger"
                                    aria-label={`Anular lançamento de ${money(record.amountCents)}`}
                                    onClick={() => setVoiding(record)}
                                  >
                                    <Ban size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Nenhum lançamento">
                  Os recebimentos registrados pelo administrador vão aparecer
                  aqui.
                </Empty>
              )}
              <Pagination
                page={page}
                total={resource.data.records.total}
                change={setPage}
              />
            </section>
          </>
        )
      )}
      {resource.data &&
        (modal === 'payment' || (correction && isPayment(correction))) && (
          <PaymentForm
            original={
              correction && isPayment(correction) ? correction : undefined
            }
            players={resource.data.players}
            matches={resource.data.matches}
            close={() => {
              setModal(null);
              setCorrection(null);
            }}
            saved={done}
          />
        )}
      {resource.data &&
        (modal === 'expense' || (correction && !isPayment(correction))) && (
          <ExpenseForm
            original={
              correction && !isPayment(correction) ? correction : undefined
            }
            matches={resource.data.matches}
            close={() => {
              setModal(null);
              setCorrection(null);
            }}
            saved={done}
          />
        )}
      {voiding && (
        <Modal title="Anular lançamento" close={() => setVoiding(null)}>
          <MutationForm
            label="Anular e preservar histórico"
            cancel={() => setVoiding(null)}
            done={done}
            submit={(data) =>
              api(
                `${base}/${isPayment(voiding) ? 'payments' : 'expenses'}/${voiding.id}/void`,
                { method: 'POST', body: { reason: formText(data, 'reason') } },
              )
            }
          >
            <Notice>
              {money(voiding.amountCents)} será retirado dos totais. O registro
              original será preservado.
            </Notice>
            <Field label="Motivo da anulação">
              <textarea
                name="reason"
                required
                maxLength={500}
                autoFocus
                rows={3}
              />
            </Field>
          </MutationForm>
        </Modal>
      )}
    </>
  );
}
