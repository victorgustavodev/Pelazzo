import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Brand } from '../components/brand';
import { api } from '../services/api';
import { PageHeading, MutationForm, Field, Notice } from '../components/ui';
export function AccountPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  return (
    <div className="groups-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <Brand />
        </Link>
        <Link className="button secondary" to="/">
          Voltar às peladas
        </Link>
      </header>
      <main>
        <PageHeading
          title="Sua conta"
          description={`${user?.displayName} · ${user?.email}`}
        />
        <section className="card narrow">
          <h2>Alterar senha</h2>
          <p className="muted">As outras sessões serão encerradas ao salvar.</p>
          {saved && <Notice>Senha alterada com sucesso.</Notice>}
          <MutationForm
            key={String(saved)}
            label="Alterar senha"
            done={() => setSaved(true)}
            submit={async (data) => {
              if (data.get('new') !== data.get('confirm'))
                throw new Error('As novas senhas não coincidem.');
              await api('/auth/change-password', {
                method: 'POST',
                body: {
                  currentPassword: String(data.get('current')),
                  newPassword: String(data.get('new')),
                },
              });
            }}
          >
            <Field label="Senha atual">
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
            <Field label="Nova senha">
              <input
                name="new"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
          </MutationForm>
        </section>
      </main>
    </div>
  );
}
