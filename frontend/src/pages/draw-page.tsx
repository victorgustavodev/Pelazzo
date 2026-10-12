import { useState } from 'react';
import { Shuffle, Plus, Trash2, Shield, RotateCcw } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all, message } from '../services/api';
import type { Participant, Draw, DrawPlayer } from '../types/api';
import {
  PageHeading,
  Field,
  Badge,
  Notice,
  ErrorBox,
  CopyButton,
  Loading,
} from '../components/ui';
export function DrawPage() {
  const { group } = useGroup();
  const [teamCount, setTeamCount] = useState(2);
  const [size, setSize] = useState(5);
  const [keepers, setKeepers] = useState(false);
  const [players, setPlayers] = useState<DrawPlayer[]>([]);
  const [bulk, setBulk] = useState('');
  const [result, setResult] = useState<Draw | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registered = useResource(
    (s) => all<Participant>(`/groups/${group.id}/participants`, s),
    [group.id],
  );
  const total = teamCount * size;
  const goalkeeperCount = players.filter((p) => p.goalkeeper).length;
  const ready =
    teamCount >= 2 &&
    teamCount <= 50 &&
    size >= 1 &&
    size <= 50 &&
    total <= 500 &&
    players.length === total &&
    (!keepers || goalkeeperCount === teamCount) &&
    players.every((p) => p.name.trim());
  function edit(next: DrawPlayer[]) {
    setPlayers(next);
    setResult(null);
    setError('');
  }
  async function draw() {
    setBusy(true);
    setError('');
    try {
      setResult(
        await api<Draw>(`/groups/${group.id}/team-draws`, {
          method: 'POST',
          body: {
            teamCount,
            playersPerTeam: size,
            hasGoalkeepers: keepers,
            players: players.map((p) => ({
              ...p,
              goalkeeper: keepers && p.goalkeeper,
            })),
          },
        }),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const share =
    result?.teams
      .map(
        (t) =>
          `TIME ${t.number}\n${t.players.map((p) => `${p.goalkeeper ? '🧤 ' : ''}${p.name}`).join('\n')}`,
      )
      .join('\n\n') ?? '';
  return (
    <>
      <PageHeading
        title="Deixa com a sorte"
        description="Você escolhe a turma. A gente embaralha os times."
      />
      <div className="draw-layout">
        <section className="card draw-config">
          <h2>1. Como vai ser o jogo?</h2>
          <div className="form-grid">
            <Field label="Quantidade de times">
              <input
                type="number"
                min={2}
                max={50}
                value={teamCount}
                disabled={busy}
                onChange={(e) => {
                  setTeamCount(Number(e.target.value));
                  setResult(null);
                }}
              />
            </Field>
            <Field label="Pessoas por time">
              <input
                type="number"
                min={1}
                max={50}
                value={size}
                disabled={busy}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setResult(null);
                }}
              />
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={keepers}
              disabled={busy}
              onChange={(e) => {
                setKeepers(e.target.checked);
                setResult(null);
              }}
            />
            <span>
              Um goleiro por time
              <small>O goleiro conta no tamanho do time.</small>
            </span>
          </label>
          <div className="draw-count">
            <strong>{Number.isFinite(total) ? total : '—'}</strong>
            <span>pessoas para este jogo</span>
            <Badge tone={players.length === total ? 'green' : 'neutral'}>
              {players.length} adicionadas
            </Badge>
          </div>
          <h2>2. Quem vai jogar?</h2>
          <Field
            label="Nomes, um por linha"
            hint="Para homônimos, use apelidos que diferenciem cada pessoa."
          >
            <textarea
              rows={5}
              value={bulk}
              disabled={busy}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={'João\nPedro\nLucas'}
              maxLength={20000}
            />
          </Field>
          <button
            className="button secondary full"
            disabled={!bulk.trim() || busy}
            onClick={() => {
              edit([
                ...players,
                ...bulk
                  .split('\n')
                  .map((name) => name.trim())
                  .filter(Boolean)
                  .map((name) => ({
                    id: crypto.randomUUID(),
                    name,
                    goalkeeper: false,
                  })),
              ]);
              setBulk('');
            }}
          >
            <Plus size={17} /> Adicionar nomes
          </button>
          <Field label="Ou escolher da turma">
            <select
              defaultValue=""
              onChange={(e) => {
                const player = registered.data?.find(
                  (p) => p.id === e.target.value,
                );
                if (player)
                  edit([
                    ...players,
                    { id: player.id, name: player.name, goalkeeper: false },
                  ]);
                e.target.value = '';
              }}
            >
              <option value="">Selecionar jogador cadastrado</option>
              {registered.data
                ?.filter((p) => p.active && !players.some((v) => v.id === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          {registered.error && (
            <ErrorBox error={registered.error} retry={registered.reload} />
          )}
          <Notice>
            {keepers
              ? `Identifique exatamente ${teamCount} goleiros na lista.`
              : 'Todos jogam na linha neste sorteio.'}{' '}
            O sorteio é aleatório e pode repetir uma combinação anterior.
          </Notice>
        </section>
        <section className="card draw-list">
          <div className="section-heading">
            <h2>Escalação do sorteio</h2>
            {players.length > 0 && (
              <button
                className="button secondary small"
                disabled={busy}
                onClick={() => edit([])}
              >
                Limpar
              </button>
            )}
          </div>
          {players.length ? (
            <ol className="player-inputs">
              {players.map((p, index) => (
                <li key={p.id}>
                  <span className="player-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <input
                    aria-label={`Nome do jogador ${index + 1}`}
                    maxLength={120}
                    value={p.name}
                    onChange={(e) =>
                      edit(
                        players.map((v) =>
                          v.id === p.id ? { ...v, name: e.target.value } : v,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                  {keepers && (
                    <label
                      className={`keeper-toggle ${p.goalkeeper ? 'selected' : ''}`}
                      title="Marcar como goleiro"
                    >
                      <input
                        type="checkbox"
                        aria-label={`${p.name} é goleiro`}
                        checked={p.goalkeeper}
                        disabled={busy}
                        onChange={(e) =>
                          edit(
                            players.map((v) =>
                              v.id === p.id
                                ? { ...v, goalkeeper: e.target.checked }
                                : v,
                            ),
                          )
                        }
                      />
                      <Shield size={17} />
                    </label>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Remover ${p.name}`}
                    disabled={busy}
                    onClick={() => edit(players.filter((v) => v.id !== p.id))}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="draw-empty">
              <Shuffle size={48} />
              <h3>A turma ainda está chegando</h3>
              <p className="muted">Adicione os nomes ao lado para começar.</p>
            </div>
          )}
          <div className="draw-bottom">
            <p className="muted" aria-live="polite">
              {players.length < total
                ? `Faltam ${total - players.length} pessoas.`
                : players.length > total
                  ? `Remova ${players.length - total} pessoas.`
                  : 'Quantidade de jogadores completa.'}
              {keepers && ` ${goalkeeperCount} de ${teamCount} goleiros.`}
              {total > 500 && ' Limite de 500 jogadores.'}
            </p>
            {error && <ErrorBox error={error} />}
            <button
              className="button primary full draw-button"
              disabled={!ready || busy}
              onClick={draw}
            >
              {busy ? (
                <Loading />
              ) : (
                <>
                  <Shuffle size={20} />
                  {result ? 'Sortear novamente' : 'Sortear os times'}
                </>
              )}
            </button>
            <small className="muted">
              Não altera presença ou pagamentos da partida.
            </small>
          </div>
        </section>
      </div>
      {result && (
        <section className="draw-results" aria-live="polite">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TÁ NA MÃO</p>
              <h2>Times prontos para o jogo</h2>
            </div>
            <div className="row">
              <CopyButton value={share} label="Copiar times" />
              <button
                className="button secondary small"
                onClick={draw}
                disabled={busy}
              >
                <RotateCcw size={16} /> Novo sorteio
              </button>
            </div>
          </div>
          <div className="team-grid">
            {result.teams.map((t) => (
              <section className="card team-card" key={t.number}>
                <div className="section-heading">
                  <h3>Time {String(t.number).padStart(2, '0')}</h3>
                  <Badge>{t.players.length} jogadores</Badge>
                </div>
                <ul>
                  {t.players.map((p) => (
                    <li key={p.id}>
                      {p.goalkeeper ? (
                        <Shield size={18} />
                      ) : (
                        <span className="team-dot" />
                      )}
                      <strong>{p.name}</strong>
                      {p.goalkeeper && <Badge tone="green">Goleiro</Badge>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
