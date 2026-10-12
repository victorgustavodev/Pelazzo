import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Plus,
  CalendarDays,
  MapPin,
  ArrowUpRight,
  Pencil,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all } from '../services/api';
import type {
  Match,
  Participant,
  Participation,
  Cash,
  Settlement,
  AttendanceLinkState,
} from '../types/api';
import {
  PageHeading,
  Loading,
  ErrorBox,
  Empty,
  Modal,
  MutationForm,
  Field,
  Badge,
  CashCards,
  Notice,
} from '../components/ui';
import {
  formText,
  date,
  localDateTime,
  matchStatus,
  modality,
  money,
  moneyInput,
  parseMoney,
} from '../utils/format';
import { AttendanceLinkPanel } from '../components/attendance-link-panel';
function MatchForm({
  match,
  close,
  saved,
}: {
  match?: Match;
  close: () => void;
  saved: () => void;
}) {
  const { group } = useGroup();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <Modal title={match ? 'Editar partida' : 'Agendar partida'} close={close}>
      <MutationForm
        cancel={close}
        done={saved}
        submit={(data) =>
          api(`/groups/${group.id}/matches${match ? `/${match.id}` : ''}`, {
            method: match ? 'PATCH' : 'POST',
            body: {
              title: formText(data, 'title'),
              startsAt: new Date(formText(data, 'startsAt')).toISOString(),
              location: formText(data, 'location') || null,
              ...(match ? { status: formText(data, 'status') } : {}),
            },
          })
        }
      >
        <Field label="Título">
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={match?.title}
            placeholder="Pelada de quinta"
            autoFocus
          />
        </Field>
        <Field
          label="Data e hora"
          hint={`Informe no horário do seu dispositivo (${browserTimezone}). A agenda exibe ${group.timezone}.`}
        >
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={match ? localDateTime(match.startsAt) : ''}
          />
        </Field>
        <Field label="Local (opcional)">
          <input
            name="location"
            maxLength={255}
            defaultValue={match?.location ?? ''}
            placeholder="Quadra do bairro"
          />
        </Field>
        {match && (
          <Field label="Status">
            <select name="status" defaultValue={match.status}>
              <option value="SCHEDULED">Agendada</option>
              <option value="FINISHED">Finalizada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </Field>
        )}
      </MutationForm>
    </Modal>
  );
}
function SettlementDetails({ participationId }: { participationId: string }) {
  const { group } = useGroup();
  const resource = useResource(
    (s) =>
      api<Settlement>(
        `/groups/${group.id}/participations/${participationId}/settlement`,
        { signal: s },
      ),
    [group.id, participationId],
  );
  if (resource.loading) return <Loading />;
  if (resource.error || !resource.data)
    return (
      <ErrorBox
        error={resource.error ?? 'Não foi possível consultar.'}
        retry={resource.reload}
      />
    );
  const value = resource.data;
  return (
    <div className="settlement">
      <strong>{money(value.paidAmountCents)} recebido</strong>
      {value.expectedAmountCents === null ? (
        <small>Valor esperado não definido</small>
      ) : (
        <>
          <small>
            Esperado: {money(value.expectedAmountCents)} ·{' '}
            {value.status === 'PAID'
              ? 'Quitado'
              : value.status === 'PARTIAL'
                ? 'Parcial'
                : 'Pendente'}
          </small>
          {value.excessAmountCents > 0 && (
            <small>
              Excedente: {money(value.excessAmountCents)} (sem crédito)
            </small>
          )}
        </>
      )}
    </div>
  );
}
function SettlementCell({
  participationId,
  name,
}: {
  participationId: string;
  name: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return expanded ? (
    <SettlementDetails participationId={participationId} />
  ) : (
    <button
      className="button secondary small"
      aria-label={`Ver recebimento de ${name}`}
      onClick={() => setExpanded(true)}
    >
      Ver recebimento
    </button>
  );
}
export function MatchesPage() {
  const { group, admin, revision } = useGroup();
  const resource = useResource(
    (s) => all<Match>(`/groups/${group.id}/matches`, s),
    [group.id, revision],
  );
  const [editing, setEditing] = useState<Match | 'new' | null>(null);
  const [filter, setFilter] = useState('ALL');
  const matches = resource.data
    ?.filter((m) => filter === 'ALL' || m.status === filter)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return (
    <>
      <PageHeading
        title="Toda semana, um novo jogo"
        description={`Organize `}
        action={
          admin && (
            <button
              className="button primary"
              onClick={() => setEditing('new')}
            >
              <Plus size={18} /> Agendar partida
            </button>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs compact">
          {[
            ['ALL', 'Todas'],
            ['SCHEDULED', 'Agendadas'],
            ['FINISHED', 'Finalizadas'],
            ['CANCELED', 'Canceladas'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} retry={resource.reload} />
      ) : matches?.length ? (
        <div className="match-grid">
          {matches.map((m) => (
            <section className="card match-card" key={m.id}>
              <div className="section-heading">
                <span className="round-icon">
                  <CalendarDays size={22} />
                </span>
                <Badge
                  tone={
                    m.status === 'SCHEDULED'
                      ? 'green'
                      : m.status === 'CANCELED'
                        ? 'red'
                        : 'neutral'
                  }
                >
                  {matchStatus(m.status)}
                </Badge>
              </div>
              <h2>{m.title}</h2>
              <p className="match-detail">
                <CalendarDays size={16} />
                {date(m.startsAt, group.timezone)}
              </p>
              <p className="match-detail">
                <MapPin size={16} />
                {m.location ?? 'Local a combinar'}
              </p>
              <div className="card-actions">
                <Link className="button secondary" to={m.id}>
                  Abrir partida <ArrowUpRight size={16} />
                </Link>
                {admin && (
                  <button
                    className="icon-button"
                    aria-label={`Editar ${m.title}`}
                    onClick={() => setEditing(m)}
                  >
                    <Pencil size={18} />
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Empty title="Sem partidas neste filtro">
          A agenda vai ganhar vida com os próximos encontros.
        </Empty>
      )}
      {editing && (
        <MatchForm
          match={editing === 'new' ? undefined : editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            resource.reload();
          }}
        />
      )}
    </>
  );
}
export function MatchPage() {
  const { matchId } = useParams();
  const { group, admin, user, revision } = useGroup();
  const base = `/groups/${group.id}`;
  const resource = useResource(
    async (s) => {
      const [match, attendance, players, cash, attendanceLink] =
        await Promise.all([
          api<Match>(`${base}/matches/${matchId}`, { signal: s }),
          all<Participation>(`${base}/matches/${matchId}/participants`, s),
          all<Participant>(`${base}/participants`, s),
          api<Cash>(`${base}/matches/${matchId}/cash`, { signal: s }),
          admin
            ? api<AttendanceLinkState>(
                `${base}/matches/${matchId}/attendance-link`,
                { signal: s },
              )
            : Promise.resolve({ link: null }),
        ]);
      return { match, attendance, players, cash, attendanceLink };
    },
    [group.id, matchId, admin, user.id, revision],
  );
  const [modal, setModal] = useState<'edit' | 'add' | 'cancel' | null>(null);
  const [expected, setExpected] = useState<Participation | null>(null);
  const [remove, setRemove] = useState<Participation | null>(null);
  if (resource.loading) return <Loading />;
  if (resource.error || !resource.data)
    return (
      <ErrorBox
        error={resource.error ?? 'Partida indisponível.'}
        retry={resource.reload}
      />
    );
  const { match, attendance, players, cash } = resource.data;
  const done = () => {
    setModal(null);
    setExpected(null);
    setRemove(null);
    resource.reload();
  };
  return (
    <>
      <Link className="back-link" to=".." relative="path">
        <ArrowLeft size={16} /> Todas as partidas
      </Link>
      <PageHeading
        title={match.title}
        description={`${date(match.startsAt, group.timezone)} · ${match.location ?? 'Local a combinar'}`}
        action={
          <div className="row">
            <Badge tone={match.status === 'CANCELED' ? 'red' : 'green'}>
              {matchStatus(match.status)}
            </Badge>
            {admin && (
              <button
                className="button secondary"
                onClick={() => setModal('edit')}
              >
                <Pencil size={17} /> Editar
              </button>
            )}
          </div>
        }
      />
      {match.status === 'CANCELED' && (
        <Notice>
          Partida cancelada. Presenças e histórico financeiro foram preservados.
        </Notice>
      )}
      <CashCards cash={cash} />
      {admin && (
        <AttendanceLinkPanel
          groupId={group.id}
          match={match}
          state={resource.data.attendanceLink}
          timezone={group.timezone}
          refresh={resource.reload}
        />
      )}
      <section className="card table-card">
        <div className="section-heading padded">
          <h2>
            Lista de presença <Badge>{attendance.length}</Badge>
          </h2>
          {admin && match.status !== 'CANCELED' && (
            <button
              className="button primary small"
              onClick={() => setModal('add')}
            >
              <Plus size={16} /> Adicionar jogador
            </button>
          )}
        </div>
        {attendance.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Modalidade na partida</th>
                  <th>Recebimento</th>
                  {admin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => {
                  const p = players.find((p) => p.id === a.participantId);
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{p?.name ?? 'Jogador'}</strong>
                        {a.publicConfirmedAt && (
                          <small>
                            <Badge tone="green">Confirmou pelo link</Badge>
                          </small>
                        )}
                      </td>
                      <td>
                        <Badge>{modality(a.modalitySnapshot)}</Badge>
                      </td>
                      <td>
                        {admin || p?.userId === user.id ? (
                          <SettlementCell
                            participationId={a.id}
                            name={p?.name ?? 'jogador'}
                          />
                        ) : (
                          <span className="muted">
                            Dados individuais privados
                          </span>
                        )}
                      </td>
                      {admin && (
                        <td>
                          <div className="row">
                            <button
                              className="button secondary small"
                              onClick={() => setExpected(a)}
                            >
                              Valor esperado
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label={`Remover ${p?.name ?? 'jogador'} da partida`}
                              onClick={() => setRemove(a)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Quem vai jogar?">
            O administrador pode adicionar participantes e, se quiser, definir
            um valor esperado individual.
          </Empty>
        )}
      </section>
      <div className="row end below">
        <Link className="button secondary" to={`/g/${group.id}/finance`}>
          Ver financeiro
        </Link>
        {admin && match.status !== 'CANCELED' && (
          <button
            className="button danger-button"
            onClick={() => setModal('cancel')}
          >
            Cancelar partida
          </button>
        )}
      </div>
      {modal === 'edit' && (
        <MatchForm match={match} close={() => setModal(null)} saved={done} />
      )}
      {modal === 'add' && (
        <Modal title="Adicionar à partida" close={() => setModal(null)}>
          <MutationForm
            cancel={() => setModal(null)}
            done={done}
            submit={(data) =>
              api(`${base}/matches/${match.id}/participants`, {
                method: 'POST',
                body: {
                  participantId: formText(data, 'participant'),
                  expectedAmountCents: parseMoney(
                    formText(data, 'amount'),
                    true,
                  ),
                },
              })
            }
          >
            <Field label="Jogador">
              <select name="participant" required defaultValue="">
                <option value="" disabled>
                  Selecione um jogador
                </option>
                {players
                  .filter(
                    (p) =>
                      p.active &&
                      !attendance.some((a) => a.participantId === p.id),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              label="Valor esperado (opcional)"
              hint="Deixe vazio para não definir cobrança individual."
            >
              <input name="amount" inputMode="decimal" placeholder="27,50" />
            </Field>
          </MutationForm>
        </Modal>
      )}
      {expected && (
        <Modal
          title="Valor esperado individual"
          close={() => setExpected(null)}
        >
          <MutationForm
            cancel={() => setExpected(null)}
            done={done}
            submit={(data) =>
              api(`${base}/participations/${expected.id}`, {
                method: 'PATCH',
                body: {
                  expectedAmountCents: parseMoney(
                    formText(data, 'amount'),
                    true,
                  ),
                },
              })
            }
          >
            <Field
              label="Valor esperado (R$)"
              hint="Esvazie o campo para remover. O valor não registra um recebimento."
            >
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={moneyInput(expected.expectedAmountCents)}
                autoFocus
              />
            </Field>
          </MutationForm>
        </Modal>
      )}
      {(remove || modal === 'cancel') && (
        <Modal
          title={remove ? 'Remover presença?' : 'Cancelar partida?'}
          close={() => {
            setRemove(null);
            setModal(null);
          }}
        >
          <MutationForm
            label={remove ? 'Remover presença' : 'Cancelar partida'}
            cancel={() => {
              setRemove(null);
              setModal(null);
            }}
            done={done}
            submit={() =>
              api(
                remove
                  ? `${base}/participations/${remove.id}`
                  : `${base}/matches/${match.id}`,
                { method: 'DELETE' },
              )
            }
          >
            <p>
              {remove
                ? 'A presença só pode ser removida se não existir histórico de pagamentos, inclusive anulados.'
                : 'O histórico financeiro e as presenças serão preservados.'}
            </p>
          </MutationForm>
        </Modal>
      )}
    </>
  );
}
