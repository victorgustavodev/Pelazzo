import { useState } from 'react';
import { ArrowRight, ShieldCheck, Shuffle, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { api } from '../services/api';
import type { Grant } from '../types/api';
import { MutationForm, Field } from '../components/ui';
import { formText } from '../utils/format';
export function AuthPage() {
  const [register, setRegister] = useState(false);
  const { login } = useAuth();
  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          P<span>•</span> Pelazzo
        </a>
        <div className="auth-copy">
          <p className="eyebrow">BORA PRA PELADA</p>
          <h1>
            O jogo é em campo.
            <br />A organização
            <br />
            <em>fica por aqui.</em>
          </h1>
          <p>
            Junte a turma, organize o caixa e deixe os times nas mãos da sorte.
          </p>
          <div className="pitch-art" aria-hidden="true">
            <div className="pitch-line" />
            <div className="pitch-circle" />
            <span className="pitch-dot one" />
            <span className="pitch-dot two" />
            <span className="pitch-dot three" />
          </div>
        </div>
        <div className="auth-features">
          <span>
            <Wallet size={18} /> Valores livres
          </span>
          <span>
            <Shuffle size={18} /> Times aleatórios
          </span>
          <span>
            <ShieldCheck size={18} /> Sua turma
          </span>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form">
          <p className="eyebrow">SEU PONTO DE ENCONTRO</p>
          <h2>{register ? 'Entre para o jogo.' : 'Bom te ver por aqui.'}</h2>
          <p className="muted">
            {register
              ? 'Crie sua conta para organizar ou entrar em uma pelada.'
              : 'Acesse sua conta para acompanhar a pelada.'}
          </p>
          <div className="tabs">
            <button
              className={!register ? 'active' : ''}
              onClick={() => setRegister(false)}
            >
              Entrar
            </button>
            <button
              className={register ? 'active' : ''}
              onClick={() => setRegister(true)}
            >
              Criar conta
            </button>
          </div>
          <MutationForm
            key={String(register)}
            label={register ? 'Criar minha conta' : 'Entrar na pelada'}
            done={() => {}}
            submit={async (data) => {
              const grant = await api<Grant>(
                `/auth/${register ? 'register' : 'login'}`,
                {
                  method: 'POST',
                  body: {
                    email: formText(data, 'email'),
                    password: String(data.get('password')),
                    ...(register
                      ? { displayName: formText(data, 'name') }
                      : {}),
                  },
                },
              );
              login(grant);
            }}
          >
            {register && (
              <Field label="Seu nome">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  autoFocus
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="voce@exemplo.com"
              />
            </Field>
            <Field label="Senha" hint="Use de 12 a 128 caracteres.">
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
          </MutationForm>
          <div className="auth-foot">
            <ArrowRight size={16} />
            <span>
              Recebeu um convite? Entre com o e-mail convidado e cole o código
              na próxima tela.
            </span>
          </div>
        </div>
        <small className="muted">Feito para jogar junto.</small>
      </section>
    </div>
  );
}
