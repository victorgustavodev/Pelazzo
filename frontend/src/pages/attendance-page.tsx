import { useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { useResource } from '../hooks/use-resource';
import { api } from '../services/api';
import { Brand } from '../components/brand';
import {
  Loading,
  ErrorBox,
  Modal,
  MutationForm,
  Field,
} from '../components/ui';
import { date, formText, themeText } from '../utils/format';
import type { PublicMatch, AttendanceReceipt } from '../types/api';
export function AttendancePage() {
  const location = useLocation(),
    token = location.hash.slice(1);
  return <AttendanceForm key={token} token={token} />;
}
function AttendanceForm({ token }: { token: string }) {
  const resource = useResource(
    (s) =>
      /^[0-9a-f]{64}$/.test(token)
        ? api<PublicMatch>('/attendance/details', {
            method: 'POST',
            body: { token },
            signal: s,
          })
        : Promise.reject(
            new Error('O link de presença está incompleto ou é inválido.'),
          ),
    [token],
  );
  const [open, setOpen] = useState(true),
    [receipt, setReceipt] = useState<AttendanceReceipt | null>(null);
  const game = receipt?.match ?? resource.data;
  const style = game
    ? ({
        '--theme': game.primaryColor,
        '--theme-text': themeText(game.primaryColor),
      } as CSSProperties)
    : undefined;
  const confirmation = (
    <div className="attendance-success">
      <CheckCircle2 size={50} />
      <h2>Presença confirmada!</h2>
      <p>{receipt?.name}, te aguardo em:</p>
      <strong>{game?.location}</strong>
      <p className="muted">{game && date(game.startsAt, game.timezone)}</p>
    </div>
  );
  return (
    <div className="attendance-shell" style={style}>
      <a className="brand" href="/">
        <Brand />
      </a>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <div className="card">
          <h1>Confirmação de presença</h1>
          <ErrorBox error={resource.error} retry={resource.reload} />
        </div>
      ) : (
        game && (
          <>
            <section className="card attendance-card">
              <p className="eyebrow">{game.groupName}</p>
              <h1>{game.title}</h1>
              <p className="match-detail">
                <CalendarDays size={18} />
                {date(game.startsAt, game.timezone)}
              </p>
              <p className="match-detail">
                <MapPin size={18} />
                {game.location}
              </p>
              {receipt ? (
                confirmation
              ) : (
                <>
                  <p className="muted">
                    Vai jogar com a gente? Só precisamos do seu nome.
                  </p>
                  <button
                    className="button primary full"
                    onClick={() => setOpen(true)}
                  >
                    Confirmar minha presença
                  </button>
                </>
              )}
            </section>
            {open && (
              <Modal
                title={receipt ? 'Tá confirmado!' : 'Você vai jogar?'}
                close={() => setOpen(false)}
              >
                {receipt ? (
                  <>
                    {confirmation}
                    <button
                      className="button primary full"
                      onClick={() => setOpen(false)}
                    >
                      Concluir
                    </button>
                  </>
                ) : (
                  <MutationForm
                    label="Confirmar presença"
                    done={() => {}}
                    submit={async (data) => {
                      setReceipt(
                        await api<AttendanceReceipt>('/attendance/confirm', {
                          method: 'POST',
                          body: { token, name: formText(data, 'name') },
                        }),
                      );
                    }}
                  >
                    <Field
                      label="Seu nome"
                      hint="Use nome, sobrenome ou apelido para identificar sua presença."
                    >
                      <input
                        name="name"
                        autoFocus
                        required
                        maxLength={120}
                        autoComplete="name"
                        placeholder="Como a turma te chama?"
                      />
                    </Field>
                  </MutationForm>
                )}
              </Modal>
            )}
          </>
        )
      )}
    </div>
  );
}
