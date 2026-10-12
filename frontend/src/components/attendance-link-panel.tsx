import { useState } from 'react';
import { Link2, Ban } from 'lucide-react';
import { api } from '../services/api';
import { Modal, MutationForm, Field, CopyButton, Badge } from './ui';
import { date, formText } from '../utils/format';
import type { Match, AttendanceLinkState } from '../types/api';
export function AttendanceLinkPanel({
  groupId,
  match,
  state,
  timezone,
  refresh,
}: {
  groupId: string;
  match: Match;
  state: AttendanceLinkState;
  timezone: string;
  refresh: () => void;
}) {
  const [generating, setGenerating] = useState(false),
    [closing, setClosing] = useState(false);
  const [created, setCreated] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const endpoint = `/groups/${groupId}/matches/${match.id}/attendance-link`;
  const url = created
    ? `${window.location.origin}/attendance#${created.token}`
    : '';
  return (
    <>
      <section className="card attendance-link-card">
        <div>
          <h2>
            <Link2 size={20} /> Check-in da turma
          </h2>
          <p className="muted">
            Um único link para todos confirmarem presença apenas pelo nome.
          </p>
          {state.link && (
            <Badge tone={state.link.active ? 'green' : 'neutral'}>
              {state.link.active ? 'Link aberto' : 'Link encerrado ou expirado'}
            </Badge>
          )}
        </div>
        <div className="row">
          {match.status === 'SCHEDULED' && (
            <button
              className="button primary"
              onClick={() => setGenerating(true)}
            >
              <Link2 size={17} />
              {state.link
                ? 'Gerar novo link'
                : 'Confirmar partida e gerar link'}
            </button>
          )}
          {state.link?.active && (
            <button
              className="button secondary"
              onClick={() => setClosing(true)}
            >
              <Ban size={16} /> Encerrar link
            </button>
          )}
        </div>
      </section>
      {generating && (
        <Modal
          title="Abrir confirmação de presença"
          close={() => setGenerating(false)}
        >
          <MutationForm
            label="Confirmar partida e gerar link"
            cancel={() => setGenerating(false)}
            done={() => setGenerating(false)}
            submit={async (data) => {
              setCreated(
                await api(endpoint, {
                  method: 'POST',
                  body: { location: formText(data, 'location') },
                }),
              );
            }}
          >
            <Field label="Campo ou endereço">
              <input
                name="location"
                required
                maxLength={255}
                defaultValue={match.location ?? ''}
                placeholder="Nome do campo e endereço"
                autoFocus
              />
            </Field>
            <p className="muted fine">
              O mesmo link serve para toda a turma, sem e-mail ou cadastro. Ele
              vale até 24 horas após o horário da partida.
              {state.link?.active && ' Gerar um novo link invalida o anterior.'}
            </p>
          </MutationForm>
        </Modal>
      )}
      {created && !generating && (
        <Modal
          title="Link pronto para a turma"
          close={() => {
            setCreated(null);
            refresh();
          }}
        >
          <p>
            Compartilhe este link. Cada pessoa informa só o nome para confirmar
            presença.
          </p>
          <textarea
            className="invite-code"
            aria-label="Link de presença"
            readOnly
            value={url}
            rows={3}
          />
          <div className="row below">
            <CopyButton value={url} label="Copiar link" />
            <a
              className="button secondary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir formulário
            </a>
            <button
              className="button primary"
              onClick={() => {
                setCreated(null);
                refresh();
              }}
            >
              Concluir
            </button>
          </div>
          <p className="muted fine">
            Válido até {date(created.expiresAt, timezone)}. Copie antes de
            fechar.
          </p>
        </Modal>
      )}
      {closing && (
        <Modal
          title="Encerrar o link de presença?"
          close={() => setClosing(false)}
        >
          <MutationForm
            label="Encerrar link"
            cancel={() => setClosing(false)}
            done={() => {
              setClosing(false);
              refresh();
            }}
            submit={() => api(endpoint, { method: 'DELETE' })}
          >
            <p>
              As presenças já confirmadas serão mantidas. O link deixará de
              aceitar novos check-ins.
            </p>
          </MutationForm>
        </Modal>
      )}
    </>
  );
}
