import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Users, Ticket, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { Brand } from '../components/brand';
import { useResource } from '../hooks/use-resource';
import { api, all, message } from '../services/api';
import type { Group, Member } from '../types/api';
import {
  PageHeading,
  Empty,
  Loading,
  ErrorBox,
  Modal,
  MutationForm,
  Field,
} from '../components/ui';
import { formText } from '../utils/format';
export function GroupsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const resource = useResource((s) => all<Group>('/groups', s), []);
  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');
  return (
    <div className="groups-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <Brand />
        </Link>
        <div className="row">
          <Link className="button secondary small" to="/account">
            {user?.displayName}
          </Link>
          <button
            className="icon-button"
            title="Sair"
            aria-label="Sair"
            onClick={() => logout().catch((e) => setError(message(e)))}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main>
        <PageHeading
          eyebrow="BORA JOGAR"
          title="Suas peladas"
          description="Cada turma tem seu próprio espaço. Escolha a sua para entrar no jogo."
          action={
            <div className="row">
              <button
                className="button secondary"
                onClick={() => setModal('join')}
              >
                <Ticket size={18} /> Tenho um convite
              </button>
              <button
                className="button primary"
                onClick={() => setModal('create')}
              >
                <Plus size={18} /> Criar pelada
              </button>
            </div>
          }
        />
        {error && <ErrorBox error={error} />}
        {resource.loading ? (
          <Loading />
        ) : resource.error ? (
          <ErrorBox error={resource.error} retry={resource.reload} />
        ) : resource.data?.length ? (
          <div className="group-grid">
            {resource.data.map((group) => (
              <Link className="group-card" to={`/g/${group.id}`} key={group.id}>
                <div
                  className="group-symbol"
                  style={{ color: group.primaryColor }}
                >
                  <Users size={30} />
                </div>
                <ArrowUpRight className="group-arrow" size={20} />
                <h2>{group.name}</h2>
                <p className="muted">Sua turma, seu ritmo.</p>
                <span>
                  Abrir pelada <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="O primeiro jogo começa aqui."
            action={
              <button
                className="button primary"
                onClick={() => setModal('create')}
              >
                Criar minha pelada
              </button>
            }
          >
            Crie uma pelada e torne-se administrador, ou entre usando o convite
            da sua turma.
          </Empty>
        )}
      </main>
      {modal && (
        <Modal
          title={modal === 'create' ? 'Uma nova pelada' : 'Entrar por convite'}
          close={() => setModal(null)}
        >
          <MutationForm
            label={modal === 'create' ? 'Criar pelada' : 'Aceitar convite'}
            cancel={() => setModal(null)}
            done={() => {}}
            submit={async (data) => {
              if (modal === 'create') {
                const group = await api<Group>('/groups', {
                  method: 'POST',
                  body: {
                    name: formText(data, 'name'),
                    primaryColor: formText(data, 'color'),
                  },
                });
                navigate(`/g/${group.id}`);
              } else {
                const member = await api<Member>('/invitations/accept', {
                  method: 'POST',
                  body: { token: formText(data, 'token') },
                });
                navigate(`/g/${member.groupId}`);
              }
            }}
          >
            {modal === 'create' ? (
              <>
                <Field label="Nome da pelada">
                  <input
                    name="name"
                    placeholder="Pelada dos irresponsáveis"
                    required
                    minLength={2}
                    maxLength={80}
                    autoFocus
                  />
                </Field>
                <Field label="Cor da turma">
                  <input type="color" name="color" defaultValue="#15803d" />
                </Field>
              </>
            ) : (
              <>
                <p className="muted">
                  Use a conta do e-mail para o qual o convite foi criado:{' '}
                  <strong>{user?.email}</strong>.
                </p>
                <Field label="Código do convite">
                  <textarea
                    name="token"
                    required
                    minLength={64}
                    maxLength={64}
                    autoFocus
                    rows={3}
                    spellCheck={false}
                  />
                </Field>
              </>
            )}
          </MutationForm>
        </Modal>
      )}
    </div>
  );
}
