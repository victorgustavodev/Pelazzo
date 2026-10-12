import { useEffect, useState, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext } from './hooks/use-auth';
import { api, hasSession, setToken } from './services/api';
import type { Grant, User } from './types/api';
import { Loading, ErrorBox } from './components/ui';
import { AuthPage } from './pages/auth-page';
import { GroupsPage } from './pages/groups-page';
import { GroupLayout } from './components/group-layout';
import { OverviewPage } from './pages/overview-page';
const ParticipantsPage = lazy(() =>
  import('./pages/participants-page').then((m) => ({
    default: m.ParticipantsPage,
  })),
);
const MatchesPage = lazy(() =>
  import('./pages/matches-page').then((m) => ({ default: m.MatchesPage })),
);
const MatchPage = lazy(() =>
  import('./pages/matches-page').then((m) => ({ default: m.MatchPage })),
);
const FinancePage = lazy(() =>
  import('./pages/finance-page').then((m) => ({ default: m.FinancePage })),
);
const DrawPage = lazy(() =>
  import('./pages/draw-page').then((m) => ({ default: m.DrawPage })),
);
import { PixPage } from './pages/pix-page';
const SettingsPage = lazy(() =>
  import('./pages/settings-page').then((m) => ({ default: m.SettingsPage })),
);
import { AccountPage } from './pages/account-page';
import { AttendancePage } from './pages/attendance-page';
const publicEntry = window.location.pathname === '/attendance';
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(publicEntry || !hasSession());
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    if (hasSession() && !publicEntry)
      api<User>('/auth/me')
        .then((value) => {
          if (alive) setUser(value);
        })
        .catch((e) => {
          if (alive && hasSession()) setError(e.message);
        })
        .finally(() => {
          if (alive) setReady(true);
        });
    const unauthorized = () => {
      setUser(null);
      setError('');
      setReady(true);
    };
    window.addEventListener('pelazzo:unauthorized', unauthorized);
    return () => {
      alive = false;
      window.removeEventListener('pelazzo:unauthorized', unauthorized);
    };
  }, []);
  const login = (grant: Grant) => {
    setToken(grant.token);
    setUser(grant.user);
  };
  async function logout() {
    await api<void>('/auth/logout', { method: 'POST' });
    setToken(null);
    setUser(null);
  }
  if (!ready) return <Loading />;
  if (error)
    return (
      <div className="auth-shell">
        <ErrorBox error={error} retry={() => location.reload()} />
      </div>
    );
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <AuthPage />}
          />
          <Route
            path="/"
            element={user ? <GroupsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/account"
            element={user ? <AccountPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/g/:groupId"
            element={user ? <GroupLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<OverviewPage />} />
            <Route path="players" element={<ParticipantsPage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="matches/:matchId" element={<MatchPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="draw" element={<DrawPage />} />
            <Route path="pix" element={<PixPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
