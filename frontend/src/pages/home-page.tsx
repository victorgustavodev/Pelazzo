import { useEffect, useState } from 'react';
import { checkReadiness } from '../services/health';

type Connection = 'loading' | 'ready' | 'unavailable';

const messages: Record<Connection, string> = {
  loading: 'Verificando conexão…',
  ready: 'Conexão disponível',
  unavailable: 'Conexão indisponível no momento',
};

export function HomePage() {
  const [connection, setConnection] = useState<Connection>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let active = true;
    void checkReadiness(controller.signal)
      .then(() => {
        if (active) setConnection('ready');
      })
      .catch(() => {
        if (active) setConnection('unavailable');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <main className="home">
      <span className="brand">Pelazzo</span>
      <h1>A próxima pelada começa aqui.</h1>
      <p className="intro">
        Um lugar para organizar partidas, acompanhar pagamentos e sortear times.
      </p>
      <p className="notice">Estamos preparando a primeira versão.</p>
      <p className={`connection ${connection}`} role="status">
        <span aria-hidden="true" className="dot" />
        {messages[connection]}
      </p>
    </main>
  );
}
