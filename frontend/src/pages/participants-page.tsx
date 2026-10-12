import { useState } from 'react';
import { Plus, Search, Pencil, UserRound } from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all } from '../services/api';
import type { Participant, Member } from '../types/api';
import {
  PageHeading,
  Loading,
  ErrorBox,
  Empty,
  Modal,
  MutationForm,
  Field,
  Badge,
} from '../components/ui';
import { formText, modality } from '../utils/format';
export function ParticipantsPage() {
  const { group, admin, revision } = useGroup();
  const base = `/groups/${group.id}`;
  const resource = useResource(
    async (s) => {
      const [players, members] = await Promise.all([
        all<Participant>(`${base}/participants`, s),
        all<Member>(`${base}/members`, s),
      ]);
      return { players, members };
    },
    [group.id, revision],
  );
  const [editing, setEditing] = useState<Participant | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ACTIVE');
  const players = resource.data?.players.filter(
    (p) =>
      (filter === 'ALL' || filter === 'INACTIVE'
        ? filter === 'ALL' || !p.active
        : p.active) &&
      p.name
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR')),
  );
  const current = editing && editing !== 'new' ? editing : null;
  return (
    <>
      <PageHeading
        title="Quem entra em campo"
        description="Mensalistas e diaristas, cada um com seu lugar na turma."
        action={
          admin && (
            <button
              className="button primary"
              onClick={() => setEditing('new')}
            >
              <Plus size={18} /> Adicionar jogador
            </button>
          )
        }
      />
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar jogador"
            placeholder="Buscar jogador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar atividade"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ACTIVE">Jogadores ativos</option>
          <option value="INACTIVE">Jogadores inativos</option>
          <option value="ALL">Todos os jogadores</option>
        </select>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} retry={resource.reload} />
      ) : players?.length ? (
        <section className="card table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Modalidade</th>
                  <th>Conta vinculada</th>
                  <th>Status</th>
                  {admin && (
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={p.modality === 'MONTHLY' ? 'green' : 'neutral'}
                      >
                        {modality(p.modality)}
                      </Badge>
                    </td>
                    <td className="muted">
                      {resource.data?.members.find((m) => m.userId === p.userId)
                        ?.displayName ?? 'Sem conta vinculada'}
                    </td>
                    <td>
                      <Badge>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    {admin && (
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Editar ${p.name}`}
                          onClick={() => setEditing(p)}
                        >
                          <Pencil size={17} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <Empty
          title="Nenhum jogador por aqui"
          action={
            admin && (
              <button
                className="button secondary"
                onClick={() => setEditing('new')}
              >
                <UserRound size={18} /> Cadastrar jogador
              </button>
            )
          }
        >
          Adicione participantes ou ajuste os filtros da busca.
        </Empty>
      )}
      {editing && (
        <Modal
          title={current ? 'Editar jogador' : 'Adicionar jogador'}
          close={() => setEditing(null)}
        >
          <MutationForm
            cancel={() => setEditing(null)}
            done={() => {
              setEditing(null);
              resource.reload();
            }}
            submit={(data) =>
              api(`${base}/participants${current ? `/${current.id}` : ''}`, {
                method: current ? 'PATCH' : 'POST',
                body: {
                  name: formText(data, 'name'),
                  modality: formText(data, 'modality'),
                  userId: formText(data, 'userId') || null,
                  ...(current ? { active: data.get('active') === 'on' } : {}),
                },
              })
            }
          >
            <Field label="Nome ou apelido">
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={current?.name}
                autoFocus
              />
            </Field>
            <Field
              label="Modalidade"
              hint="A modalidade não define valor ou cobrança automática."
            >
              <select
                name="modality"
                defaultValue={current?.modality ?? 'DAILY'}
              >
                <option value="DAILY">Diarista</option>
                <option value="MONTHLY">Mensalista</option>
              </select>
            </Field>
            <Field
              label="Vincular a uma conta"
              hint="O titular poderá consultar seus próprios pagamentos."
            >
              <select name="userId" defaultValue={current?.userId ?? ''}>
                <option value="">Sem conta vinculada</option>
                {resource.data?.members
                  .filter((m) => m.active || m.userId === current?.userId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
              </select>
            </Field>
            {current && (
              <label className="check">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={current.active}
                />{' '}
                Jogador ativo <small>Desativar preserva o histórico.</small>
              </label>
            )}
          </MutationForm>
        </Modal>
      )}
    </>
  );
}
