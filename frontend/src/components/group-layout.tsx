import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Shuffle,
  ScanLine,
  Settings,
  ArrowLeft,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useResource } from '../hooks/use-resource';
import { api, message } from '../services/api';
import type { Group, Member, GroupContext } from '../types/api';
import { Loading, ErrorBox, Badge } from './ui';
import { themeText } from '../utils/format';
const links = [
  ['', 'Visão geral', LayoutDashboard],
  ['matches', 'Partidas', CalendarDays],
  ['players', 'Jogadores', Users],
  ['finance', 'Caixa', Wallet],
  ['draw', 'Sortear times', Shuffle],
  ['pix', 'Pagar com Pix', ScanLine],
] as const;
export function GroupLayout() {
  const { groupId } = useParams();
  const { user, logout } = useAuth();
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  const resource = useResource(
    async (s) => {
      const [group, member] = await Promise.all([
        api<Group>(`/groups/${groupId}`, { signal: s }),
        api<Member>(`/groups/${groupId}/membership`, { signal: s }),
      ]);
      return { group, member };
    },
    [groupId, revision],
  );
  const appName = resource.data?.group.name;
  const appColor = resource.data?.group.primaryColor;
  useEffect(() => {
    if (appName) document.title = appName;
    if (appColor)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', appColor);
    return () => {
      document.title = 'Pelazzo';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', '#15803d');
    };
  }, [appName, appColor]);
  if (resource.loading) return <Loading />;
  if (resource.error || !resource.data || !user)
    return (
      <div className="groups-shell">
        <Link to="/">← Suas peladas</Link>
        <ErrorBox
          error={resource.error ?? 'Pelada indisponível.'}
          retry={resource.reload}
        />
      </div>
    );
  const { group, member } = resource.data;
  const admin = member.role === 'ADMIN';
  const context: GroupContext = {
    group,
    member,
    admin,
    user,
    revision,
    refresh: () => setRevision((v) => v + 1),
  };
  return (
    <div
      className="app-shell"
      style={
        {
          '--theme': group.primaryColor,
          '--theme-text': themeText(group.primaryColor),
        } as CSSProperties
      }
    >
      <button
        className={`mobile-menu icon-button ${open ? 'menu-open' : ''}`}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link className="brand" to="/">
          P<span>•</span> Pelazzo
        </Link>
        <div className="sidebar-group">
          <span className="sidebar-dot" />
          <div>
            <strong>{group.name}</strong>
            <small>Seu espaço de jogo</small>
          </div>
        </div>
        <p className="nav-label">NA SUA PELADA</p>
        <nav>
          {links.map(([path, title, Icon]) => (
            <NavLink
              end={path === ''}
              to={path ? `/g/${groupId}/${path}` : `/g/${groupId}`}
              key={path}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {title}
              {path === 'draw' && <span className="nav-new">JOGAR</span>}
            </NavLink>
          ))}
          {admin && (
            <>
              <p className="nav-label">ADMINISTRAÇÃO</p>
              <NavLink
                to={`/g/${groupId}/settings`}
                onClick={() => setOpen(false)}
              >
                <Settings size={19} /> Painel do admin
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <Link to="/">
            <ArrowLeft size={16} /> Trocar pelada
          </Link>
          <Link className="profile" to="/account">
            <span className="avatar">
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.displayName}</strong>
              <small>{admin ? 'Administrador' : 'Jogador'}</small>
            </span>
          </Link>
          <button
            className="sidebar-logout"
            onClick={() => logout().catch((e) => setError(message(e)))}
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="app-topbar">
          <span>
            Pelada <span className="muted">/</span>{' '}
            <strong>{group.name}</strong>
          </span>
          <Badge tone={admin ? 'green' : 'neutral'}>
            {admin ? 'Administrador' : 'Jogador'}
          </Badge>
        </header>
        <main className="main-content">
          {error && <ErrorBox error={error} />}
          <Suspense fallback={<Loading />}>
            <Outlet context={context} />
          </Suspense>
        </main>
        <footer className="app-footer">
          Jogar junto fica mais fácil. <span>Pelazzo</span>
        </footer>
      </div>
    </div>
  );
}
