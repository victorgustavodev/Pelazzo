import { useState } from 'react';
import {
  Palette,
  ScanLine,
  Users,
  Ticket,
  History,
  Plus,
  Pencil,
  Ban,
} from 'lucide-react';
import { useGroup } from '../hooks/use-group';
import { useResource } from '../hooks/use-resource';
import { api, all } from '../services/api';
import type { Member, Pix, Invitation, Audit, Page } from '../types/api';
import {
  PageHeading,
  Loading,
  ErrorBox,
  Empty,
  MutationForm,
  Field,
  Modal,
  Badge,
  Notice,
  CopyButton,
  Pagination,
} from '../components/ui';
import { formText, date, themeText } from '../utils/format';
const tabs = [
  ['theme', 'Personalização', Palette],
  ['pix', 'Pix', ScanLine],
  ['members', 'Membros', Users],
  ['invites', 'Convites', Ticket],
  ['audit', 'Histórico', History],
] as const;
const actions: Record<string, string> = {
  GROUP_CREATED: 'Pelada criada',
  GROUP_UPDATED: 'Personalização alterada',
  MEMBER_UPDATED: 'Membro alterado',
  INVITATION_CREATED: 'Convite criado',
  INVITATION_ACCEPTED: 'Convite aceito',
  INVITATION_REVOKED: 'Convite revogado',
  PIX_UPDATED: 'Pix configurado',
  PIX_CLEARED: 'Pix removido',
  PARTICIPANT_CREATED: 'Jogador cadastrado',
  PARTICIPANT_UPDATED: 'Jogador alterado',
  PARTICIPANT_DEACTIVATED: 'Jogador desativado',
  MATCH_CREATED: 'Partida criada',
  MATCH_UPDATED: 'Partida alterada',
  MATCH_CANCELED: 'Partida cancelada',
  PARTICIPATION_CREATED: 'Presença adicionada',
  PARTICIPATION_UPDATED: 'Valor esperado alterado',
  PARTICIPATION_REMOVED: 'Presença removida',
  PAYMENT_CREATED: 'Recebimento registrado',
  PAYMENT_VOIDED: 'Recebimento anulado',
  PAYMENT_CORRECTED: 'Recebimento corrigido',
  EXPENSE_CREATED: 'Despesa registrada',
  EXPENSE_VOIDED: 'Despesa anulada',
  EXPENSE_CORRECTED: 'Despesa corrigida',
};
export function SettingsPage() {
  const { group, admin, revision, refresh } = useGroup();
  const base = `/groups/${group.id}`;
  const [tab, setTab] = useState('theme');
  const [page, setPage] = useState(1);
  const [color, setColor] = useState(group.primaryColor);
  const resource = useResource(
    async (s) => {
      if (!admin) return { members: [] as Member[], pix: null as Pix | null };
      const [members, pix] = await Promise.all([
        all<Member>(`${base}/members`, s),
        api<{ settings: Pix | null }>(`${base}/pix`, { signal: s }).then(
          (value) => value.settings,
        ),
      ]);
      return { members, pix };
    },
    [group.id, revision, admin],
  );
  const list = useResource(
    (s) =>
      admin && (tab === 'invites' || tab === 'audit')
        ? api<Page<Invitation | Audit>>(
            `${base}/${tab === 'invites' ? 'invitations' : 'audit'}?page=${page}&limit=20`,
            { signal: s },
          )
        : Promise.resolve({ items: [], total: 0, page: 1, limit: 20 }),
    [group.id, admin, tab, page, revision],
  );
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const [created, setCreated] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [clearPix, setClearPix] = useState(false);
  const [saved, setSaved] = useState('');
  if (!admin)
    return (
      <Empty title="Área de administração">
        Somente administradores podem gerenciar a pelada.
      </Empty>
    );
  const done = () => {
    setEditingMember(null);
    setRevoking(null);
    setClearPix(false);
    setSaved('Alteração salva.');
    resource.reload();
    list.reload();
  };
  const pix = resource.data?.pix;
  const admins =
    resource.data?.members.filter((m) => m.active && m.role === 'ADMIN') ?? [];
  return (
    <>
      <PageHeading
        title="Do jeito da sua turma"
        description="Personalização, acesso e Pix em um só lugar."
      />
      <div className="settings-tabs">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            className={tab === value ? 'active' : ''}
            onClick={() => {
              setTab(value);
              setPage(1);
              setSaved('');
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
      {saved && <Notice>{saved}</Notice>}
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {tab === 'theme' && (
            <section className="card narrow">
              <h2>Identidade da pelada</h2>
              <MutationForm
                done={() => refresh()}
                submit={(data) =>
                  api(base, {
                    method: 'PATCH',
                    body: {
                      name: formText(data, 'name'),
                      primaryColor: color,
                      timezone: formText(data, 'timezone'),
                    },
                  })
                }
              >
                <Field label="Nome do app na pelada">
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={group.name}
                  />
                </Field>
                <Field label="Cor principal">
                  <div className="color-field">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <code>{color.toUpperCase()}</code>
                  </div>
                </Field>
                <div
                  className="theme-preview"
                  style={{ background: color, color: themeText(color) }}
                >
                  Sua turma entra em campo
                </div>
                <Field label="Fuso horário">
                  <select name="timezone" defaultValue={group.timezone}>
                    {[
                      ...new Set([
                        group.timezone,
                        'America/Sao_Paulo',
                        'America/Manaus',
                        'America/Recife',
                        'America/Fortaleza',
                        'America/Cuiaba',
                        'America/Rio_Branco',
                        'America/Noronha',
                        'UTC',
                      ]),
                    ].map((tz) => (
                      <option key={tz}>{tz}</option>
                    ))}
                  </select>
                </Field>
              </MutationForm>
            </section>
          )}
          {tab === 'pix' && (
            <section className="card narrow">
              <h2>Pix da pelada</h2>
              <p className="muted">
                Uma chave ativa por pelada, com um administrador destinatário.
              </p>
              <MutationForm
                key={pix?.keyValue ?? 'empty'}
                done={done}
                submit={(data) =>
                  api(`${base}/pix`, {
                    method: 'PATCH',
                    body: {
                      recipientAdminUserId: formText(data, 'recipient'),
                      keyType: formText(data, 'type'),
                      keyValue: formText(data, 'key'),
                      recipientName: formText(data, 'name'),
                      contactPhone: formText(data, 'phone'),
                    },
                  })
                }
              >
                <Field label="Administrador destinatário">
                  <select
                    name="recipient"
                    defaultValue={
                      pix?.recipientAdminUserId ?? admins[0]?.userId
                    }
                    required
                  >
                    {admins.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo da chave">
                  <select name="type" defaultValue={pix?.keyType ?? 'EMAIL'}>
                    <option value="EMAIL">E-mail</option>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="PHONE">Telefone</option>
                    <option value="RANDOM">Aleatória</option>
                  </select>
                </Field>
                <Field
                  label="Chave Pix"
                  hint="Telefone: +55 e número. Chave aleatória: UUID. O formato não confirma a titularidade."
                >
                  <input
                    name="key"
                    required
                    maxLength={255}
                    defaultValue={pix?.keyValue}
                  />
                </Field>
                <Field label="Nome do favorecido">
                  <input
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={pix?.recipientName}
                  />
                </Field>
                <Field
                  label="WhatsApp do administrador"
                  hint="Inclua código do país e DDD. Exemplo: +5511999999999."
                >
                  <input
                    name="phone"
                    type="tel"
                    required
                    defaultValue={pix?.contactPhone}
                    placeholder="+5511999999999"
                  />
                </Field>
              </MutationForm>
              {pix && (
                <button
                  className="button danger-button below"
                  onClick={() => setClearPix(true)}
                >
                  Remover chave ativa
                </button>
              )}
            </section>
          )}
          {tab === 'members' && (
            <section className="card table-card">
              <div className="section-heading padded">
                <h2>Acesso da turma</h2>
                <Badge>{resource.data?.members.length} membros</Badge>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Perfil</th>
                      <th>Estado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data?.members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.displayName}</strong>
                        </td>
                        <td>
                          <Badge
                            tone={m.role === 'ADMIN' ? 'green' : 'neutral'}
                          >
                            {m.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                          </Badge>
                        </td>
                        <td>{m.active ? 'Ativo' : 'Inativo'}</td>
                        <td>
                          <button
                            className="button secondary small"
                            onClick={() => setEditingMember(m)}
                          >
                            <Pencil size={15} /> Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="padded muted fine">
                A pelada precisa manter pelo menos um administrador ativo.
                Rebaixar ou desativar o destinatário do Pix remove a chave
                ativa.
              </div>
            </section>
          )}
          {(tab === 'invites' || tab === 'audit') && (
            <section className="card table-card">
              <div className="section-heading padded">
                <h2>
                  {tab === 'invites'
                    ? 'Convites para a turma'
                    : 'Histórico administrativo'}
                </h2>
                {tab === 'invites' && (
                  <button
                    className="button primary small"
                    onClick={() => setInviting(true)}
                  >
                    <Plus size={16} /> Criar convite
                  </button>
                )}
              </div>
              {list.loading ? (
                <Loading />
              ) : list.error ? (
                <ErrorBox error={list.error} retry={list.reload} />
              ) : list.data?.items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      {tab === 'invites' ? (
                        <tr>
                          <th>E-mail</th>
                          <th>Perfil</th>
                          <th>Validade</th>
                          <th>Estado</th>
                          <th>Ação</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Ação</th>
                          <th>Responsável</th>
                          <th>Data</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {list.data.items.map((item) =>
                        'email' in item ? (
                          <tr key={item.id}>
                            <td>{item.email}</td>
                            <td>
                              {item.role === 'ADMIN'
                                ? 'Administrador'
                                : 'Usuário'}
                            </td>
                            <td>{date(item.expiresAt, group.timezone)}</td>
                            <td>
                              <Badge>
                                {item.acceptedAt
                                  ? 'Aceito'
                                  : item.revokedAt
                                    ? 'Revogado'
                                    : new Date(item.expiresAt) < new Date()
                                      ? 'Expirado'
                                      : 'Pendente'}
                              </Badge>
                            </td>
                            <td>
                              {!item.acceptedAt &&
                                !item.revokedAt &&
                                new Date(item.expiresAt) > new Date() && (
                                  <button
                                    className="icon-button danger"
                                    aria-label={`Revogar convite de ${item.email}`}
                                    onClick={() => setRevoking(item)}
                                  >
                                    <Ban size={17} />
                                  </button>
                                )}
                            </td>
                          </tr>
                        ) : (
                          <tr key={item.id}>
                            <td>{actions[item.action] ?? item.action}</td>
                            <td>
                              {resource.data?.members.find(
                                (m) => m.userId === item.actorUserId,
                              )?.displayName ?? 'Membro'}
                            </td>
                            <td>{date(item.createdAt, group.timezone)}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title={
                    tab === 'invites'
                      ? 'Nenhum convite ainda'
                      : 'Sem eventos neste filtro'
                  }
                >
                  {tab === 'invites'
                    ? 'Convide pelo e-mail e compartilhe o código manualmente.'
                    : 'As alterações administrativas são registradas aqui.'}
                </Empty>
              )}
              {list.data && (
                <Pagination
                  page={page}
                  total={list.data.total}
                  change={setPage}
                />
              )}
            </section>
          )}
        </>
      )}
      {editingMember && (
        <Modal
          title={`Gerenciar ${editingMember.displayName}`}
          close={() => setEditingMember(null)}
        >
          <MutationForm
            cancel={() => setEditingMember(null)}
            done={refresh}
            submit={(data) =>
              api(`${base}/members/${editingMember.userId}`, {
                method: 'PATCH',
                body: {
                  role: formText(data, 'role'),
                  active: data.get('active') === 'on',
                },
              })
            }
          >
            <Field label="Perfil">
              <select name="role" defaultValue={editingMember.role}>
                <option value="USER">Usuário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            <label className="check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editingMember.active}
              />{' '}
              Acesso ativo
            </label>
            {editingMember.role === 'ADMIN' &&
              editingMember.active &&
              admins.length === 1 && (
                <Notice>
                  Este é o último administrador ativo. O servidor vai bloquear
                  seu rebaixamento ou desativação.
                </Notice>
              )}
            {pix?.recipientAdminUserId === editingMember.userId && (
              <Notice>
                Este membro recebe o Pix. Rebaixá-lo ou desativá-lo remove a
                configuração de pagamento.
              </Notice>
            )}
          </MutationForm>
        </Modal>
      )}
      {inviting && (
        <Modal title="Convidar para a pelada" close={() => setInviting(false)}>
          <MutationForm
            cancel={() => setInviting(false)}
            label="Gerar convite"
            done={() => {
              setInviting(false);
              list.reload();
            }}
            submit={async (data) => {
              const invitation = await api<Invitation>(`${base}/invitations`, {
                method: 'POST',
                body: {
                  email: formText(data, 'email'),
                  role: formText(data, 'role'),
                  ttlDays: Number(data.get('days')),
                },
              });
              setCreated(invitation);
            }}
          >
            <Field label="E-mail convidado">
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoFocus
              />
            </Field>
            <Field label="Perfil">
              <select name="role">
                <option value="USER">Usuário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            <Field label="Validade (dias)">
              <input
                name="days"
                type="number"
                min={1}
                max={30}
                defaultValue={7}
                required
              />
            </Field>
            <p className="muted fine">
              Somente a conta com este e-mail poderá aceitar. Nenhum e-mail é
              enviado automaticamente.
            </p>
          </MutationForm>
        </Modal>
      )}
      {created && !inviting && (
        <Modal title="Convite criado" close={() => setCreated(null)}>
          <p>
            Compartilhe o código abaixo com <strong>{created.email}</strong>.
            Ele é exibido somente agora.
          </p>
          <textarea
            className="invite-code"
            aria-label="Código criado"
            readOnly
            value={created.token}
            rows={3}
          />
          <div className="row below">
            <CopyButton value={created.token ?? ''} label="Copiar convite" />
            <button className="button primary" onClick={() => setCreated(null)}>
              Concluir
            </button>
          </div>
          <p className="muted fine">
            O destinatário deve criar a conta com esse e-mail, abrir “Tenho um
            convite” e colar o código.
          </p>
        </Modal>
      )}
      {(revoking || clearPix) && (
        <Modal
          title={revoking ? 'Revogar convite?' : 'Remover Pix?'}
          close={() => {
            setRevoking(null);
            setClearPix(false);
          }}
        >
          <MutationForm
            label={revoking ? 'Revogar convite' : 'Remover chave'}
            cancel={() => {
              setRevoking(null);
              setClearPix(false);
            }}
            done={done}
            submit={() =>
              api(
                revoking ? `${base}/invitations/${revoking.id}` : `${base}/pix`,
                { method: 'DELETE' },
              )
            }
          >
            <p>
              {revoking
                ? `O convite para ${revoking.email} não poderá mais ser aceito.`
                : 'A chave deixa de aparecer para os membros. O histórico financeiro será preservado.'}
            </p>
          </MutationForm>
        </Modal>
      )}
    </>
  );
}
