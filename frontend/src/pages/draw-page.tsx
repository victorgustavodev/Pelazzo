import { useState } from 'react';
import { Shuffle, Shield, RotateCcw, Users } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { api, message } from '../services/api';
import type { Draw, DrawPlayer } from '../types/api';
import {
  PageHeading,
  Field,
  Badge,
  Notice,
  ErrorBox,
  CopyButton,
  Loading,
} from '../components/ui';
const blank = (): DrawPlayer => ({
  id: crypto.randomUUID(),
  name: '',
  goalkeeper: false,
});
export function DrawPage() {
  const { group } = useGroup();
  const [teamCount, setTeamCount] = useState(2);
  const [size, setSize] = useState(5);
  const [keepers, setKeepers] = useState(false);
  const [slots, setSlots] = useState<DrawPlayer[]>(() =>
    Array.from({ length: 10 }, blank),
  );
  const [result, setResult] = useState<Draw | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid =
    Number.isInteger(teamCount) &&
    teamCount >= 2 &&
    teamCount <= 50 &&
    Number.isInteger(size) &&
    size >= 1 &&
    size <= 50 &&
    teamCount * size <= 500;
  const total = valid ? teamCount * size : 0;
  const players = slots.slice(0, total);
  const filled = players.filter((p) => p.name.trim()).length;
  const goalkeeperCount = players.filter((p) => p.goalkeeper).length;
  const ready =
    valid && filled === total && (!keepers || goalkeeperCount === teamCount);
  function clearResult() {
    setResult(null);
    setError('');
  }
  function resize(teams: number, people: number) {
    setTeamCount(teams);
    setSize(people);
    clearResult();
    const count = teams * people;
    if (Number.isInteger(count) && count > slots.length && count <= 500)
      setSlots([
        ...slots,
        ...Array.from({ length: count - slots.length }, blank),
      ]);
  }
  function edit(index: number, data: Partial<DrawPlayer>) {
    setSlots(slots.map((p, i) => (i === index ? { ...p, ...data } : p)));
    clearResult();
  }
  async function draw() {
    if (!ready || busy) return;
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
              name: p.name.trim(),
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
        description="Escolha o tamanho dos times e preencha um nome em cada vaga."
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
                onChange={(e) => resize(Number(e.target.value), size)}
              />
            </Field>
            <Field label="Pessoas por time">
              <input
                type="number"
                min={1}
                max={50}
                value={size}
                disabled={busy}
                onChange={(e) => resize(teamCount, Number(e.target.value))}
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
                clearResult();
              }}
            />
            <span>
              Um goleiro por time
              <small>O goleiro conta no tamanho do time.</small>
            </span>
          </label>
          <div className="draw-equation" aria-live="polite">
            <Users size={22} />
            <div>
              <strong>
                {valid
                  ? `${teamCount} × ${size} = ${total}`
                  : 'Ajuste a configuração'}
              </strong>
              <span>
                {valid
                  ? `${teamCount} times de ${size} pessoas · ${total} campos para nomes`
                  : 'Até 50 times, 50 pessoas por time e 500 jogadores.'}
              </span>
            </div>
          </div>
          <Notice>
            Preencha cada vaga com um nome ou apelido. Para homônimos, use uma
            identificação que diferencie cada pessoa.
            {keepers && ` Marque exatamente ${teamCount} goleiros.`}
          </Notice>
          <p className="muted fine">
            O sorteio é aleatório e pode repetir uma combinação anterior.
            Reduzir e depois aumentar as vagas preserva os nomes já digitados.
          </p>
        </section>
        <section className="card draw-list">
          <div className="section-heading">
            <h2>2. Quem vai jogar?</h2>
            <Badge tone={ready ? 'green' : 'neutral'}>
              {filled}/{total} nomes
            </Badge>
          </div>
          {valid ? (
            <ol className="player-inputs fixed-slots">
              {players.map((p, index) => (
                <li key={p.id} className="py-2">
                  <span className="player-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="draw-name-slot">
                    <input
                      aria-label={`Nome do jogador ${index + 1}`}
                      maxLength={120}
                      placeholder={`Nome do jogador ${index + 1}`}
                      value={p.name}
                      disabled={busy}
                      onChange={(e) => edit(index, { name: e.target.value })}
                    />
                  </div>
                  {keepers && (
                    <label
                      className={`keeper-toggle ${p.goalkeeper ? 'selected' : ''}`}
                      title="Marcar como goleiro"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Jogador ${index + 1} é goleiro`}
                        checked={p.goalkeeper}
                        disabled={busy}
                        onChange={(e) =>
                          edit(index, { goalkeeper: e.target.checked })
                        }
                      />
                      <Shield size={17} />
                    </label>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <ErrorBox error="Informe quantidades inteiras válidas para criar os campos." />
          )}
          <div className="draw-bottom">
            <p className="muted" aria-live="polite">
              {valid
                ? filled < total
                  ? `Faltam ${total - filled} nomes.`
                  : 'Todas as vagas estão preenchidas.'
                : 'Configuração inválida.'}
              {keepers && ` ${goalkeeperCount} de ${teamCount} goleiros.`}
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
                disabled={busy}
                onClick={draw}
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
