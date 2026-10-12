import {
  useEffect,
  useRef,
  useId,
  cloneElement,
  isValidElement,
  type ReactElement,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  LoaderCircle,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { message } from '../services/api';
import { money } from '../utils/format';
import type { Cash } from '../types/api';
export function PageHeading({
  eyebrow = 'SUA PELADA, ORGANIZADA',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">◌</div>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} /> Carregando…
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="alert error" role="alert">
      <AlertCircle size={20} />
      <span>{error}</span>
      {retry && (
        <button className="button small secondary" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="alert info">{children}</div>;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function CashCards({
  cash,
  general = false,
}: {
  cash: Cash;
  general?: boolean;
}) {
  return (
    <div className="stats">
      <div className="stat balance">
        <Wallet size={22} />
        <span>{general ? 'Saldo geral' : 'Saldo da partida'}</span>
        <strong>{money(cash.balanceCents)}</strong>
        <small>Receitas menos despesas</small>
      </div>
      <div className="stat">
        <ArrowDownLeft size={22} />
        <span>Receitas confirmadas</span>
        <strong>{money(cash.revenueCents)}</strong>
        <small>
          {general ? 'Partidas e mensalidades' : 'Apenas esta partida'}
        </small>
      </div>
      <div className="stat">
        <ArrowUpRight size={22} />
        <span>Despesas confirmadas</span>
        <strong>{money(cash.expenseCents)}</strong>
        <small>Gastos registrados pelo admin</small>
      </div>
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MutationForm({
  submit,
  done,
  children,
  label = 'Salvar',
  cancel,
}: {
  submit: (data: FormData) => Promise<unknown>;
  done: () => void;
  children: ReactNode;
  label?: string;
  cancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await submit(data);
      done();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="form-stack">
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <ErrorBox error={error} />}
      <div className="form-actions">
        {cancel && (
          <button
            type="button"
            className="button secondary"
            onClick={cancel}
            disabled={busy}
          >
            Cancelar
          </button>
        )}
        <button className="button primary" disabled={busy}>
          {busy && <LoaderCircle size={17} className="spin" />}
          {busy ? 'Salvando…' : label}
        </button>
      </div>
    </form>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  if (
    isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type)
  ) {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        {cloneElement(children as ReactElement<Record<string, unknown>>, {
          id,
          ...(hint ? { 'aria-describedby': `${id}-hint` } : {}),
        })}
        {hint && <small id={`${id}-hint`}>{hint}</small>}
      </div>
    );
  }
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Pagination({
  page,
  total,
  limit = 20,
  change,
}: {
  page: number;
  total: number;
  limit?: number;
  change: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>
        {total} registro{total === 1 ? '' : 's'} · página {page} de {pages}
      </span>
      <button
        className="icon-button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => change(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        className="icon-button"
        aria-label="Próxima página"
        disabled={page >= pages}
        onClick={() => change(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
export function CopyButton({
  value,
  label = 'Copiar',
}: {
  value: string;
  label?: string;
}) {
  const [state, setState] = useState('');
  return (
    <>
      <button
        type="button"
        className="button secondary small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setState('Copiado!');
          } catch {
            setState('Selecione o texto e copie manualmente.');
          }
        }}
      >
        {label}
      </button>
      <small role="status">{state}</small>
    </>
  );
}
