import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Shuffle, Users } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all } from '../services/api';
import type { Cash, Match, Participant, Pix } from '../types/api';
import {
  PageHeading,
  CashCards,
  Loading,
  ErrorBox,
  Empty,
  Badge,
} from '../components/ui';
import { date } from '../utils/format';
export function OverviewPage() {
  const { group, admin, user, revision } = useGroup();
  const base = `/groups/${group.id}`;
  const resource = useResource(
    async (s) => {
      const [cash, matches, players, pix] = await Promise.all([
        api<Cash>(`${base}/finance/summary`, { signal: s }),
        all<Match>(`${base}/matches`, s),
        all<Participant>(`${base}/participants`, s),
        api<{ settings: Pix | null }>(`${base}/pix`, { signal: s }).then(
          (value) => value.settings,
        ),
      ]);
      return { cash, matches, players, pix };
    },
    [group.id, revision],
  );
  const [now] = useState(() => Date.now());
  const upcoming = resource.data?.matches
    .filter(
      (m) => m.status === 'SCHEDULED' && new Date(m.startsAt).getTime() >= now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <>
      <PageHeading
        title={`Bora jogar, ${user.displayName.split(' ')[0]}?`}
        description="Tudo pronto para tirar a organização de campo."
        action={
          <Link className="button primary" to="draw">
            <Shuffle size={18} /> Sortear times
          </Link>
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
            <div className="dashboard-grid">
              <section className="card">
                <div className="section-heading">
                  <h2>
                    <CalendarDays size={20} /> Próximas partidas
                  </h2>
                  <Link to="matches">
                    Ver todas <ArrowUpRight size={16} />
                  </Link>
                </div>
                {upcoming?.length ? (
                  upcoming.slice(0, 4).map((match) => (
                    <Link
                      className="match-row"
                      key={match.id}
                      to={`matches/${match.id}`}
                    >
                      <div className="date-tile">
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          timeZone: group.timezone,
                        }).format(new Date(match.startsAt))}
                        <small>
                          {new Intl.DateTimeFormat('pt-BR', {
                            month: 'short',
                            timeZone: group.timezone,
                          }).format(new Date(match.startsAt))}
                        </small>
                      </div>
                      <div>
                        <strong>{match.title}</strong>
                        <p className="muted">
                          {date(match.startsAt, group.timezone)} ·{' '}
                          {match.location ?? 'Local a combinar'}
                        </p>
                      </div>
                      <ArrowUpRight size={20} />
                    </Link>
                  ))
                ) : (
                  <Empty
                    title="Agenda livre"
                    action={
                      admin && (
                        <Link className="button secondary small" to="matches">
                          Agendar partida
                        </Link>
                      )
                    }
                  >
                    As próximas partidas vão aparecer aqui.
                  </Empty>
                )}
              </section>
              <section className="card squad-card">
                <div className="section-heading">
                  <h2>
                    <Users size={20} /> Nossa turma
                  </h2>
                  <Link to="players">
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
                <strong className="big-number">
                  {resource.data.players.filter((p) => p.active).length}
                </strong>
                <p className="muted">jogadores ativos na pelada</p>
                <div className="split-stats">
                  <div>
                    <strong>
                      {
                        resource.data.players.filter(
                          (p) => p.active && p.modality === 'MONTHLY',
                        ).length
                      }
                    </strong>
                    <span>Mensalistas</span>
                  </div>
                  <div>
                    <strong>
                      {
                        resource.data.players.filter(
                          (p) => p.active && p.modality === 'DAILY',
                        ).length
                      }
                    </strong>
                    <span>Diaristas</span>
                  </div>
                </div>
                <Badge>Sem cobrança fixa</Badge>
              </section>
              <section className="draw-banner">
                <div className="draw-orb">
                  <Shuffle size={34} />
                </div>
                <div>
                  <p className="eyebrow">DEIXA COM A SORTE</p>
                  <h2>Quem joga com quem?</h2>
                  <p>
                    Escolha o tamanho dos times, inclua os goleiros e faça o
                    sorteio.
                  </p>
                </div>
                <Link className="button primary" to="draw">
                  Montar os times <ArrowUpRight size={18} />
                </Link>
              </section>
              <section className="card">
                <h2>Pix da pelada</h2>
                <p className="muted">
                  {resource.data.pix
                    ? `Favorecido: ${resource.data.pix.recipientName}. Copie a chave e envie o comprovante ao administrador.`
                    : 'O administrador ainda não configurou uma chave Pix.'}
                </p>
                <Link
                  className="button secondary"
                  to={resource.data.pix ? 'pix' : admin ? 'settings' : 'pix'}
                >
                  {resource.data.pix
                    ? 'Ver dados de pagamento'
                    : admin
                      ? 'Configurar Pix'
                      : 'Consultar Pix'}{' '}
                  <ArrowUpRight size={16} />
                </Link>
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
