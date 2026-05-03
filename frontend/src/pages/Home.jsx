import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Home({ user, onLogout }) {
  const [gameSession, setGameSession] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function loadActiveSession() {
      try {
        const data = await api('/api/game/session');

        if (data.session) {
          setGameSession({
            ok: true,
            status: data.session.status,
            gameSessionId: data.session.id,
            streamId: data.session.stream_id,
            createdAt: data.session.created_at,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar sessão ativa:', err);
      } finally {
        setCheckingSession(false);
      }
    }

    loadActiveSession();
  }, []);

  async function play() {
    setMessage('');
    setLoading(true);

    try {
      const data = await api('/api/game/play', {
        method: 'POST',
      });

      setGameSession({
        ok: true,
        status: data.status,
        gameSessionId: data.gameSessionId,
        streamId: data.streamId,
      });

      setMessage('Jogo iniciado.');
    } catch (err) {
      if (err.session) {
        setGameSession({
          ok: true,
          status: err.session.status,
          gameSessionId: err.session.id,
          streamId: err.session.streamId,
        });
      }

      const details =
        err.hostMessage ||
        err.host ||
        err.error ||
        err.details;

      setMessage(
        details
          ? `${err.message} Detalhes: ${details}`
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function stop() {
    if (!gameSession?.gameSessionId) {
      setMessage('Nenhuma sessão ativa para encerrar.');
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      await api('/api/game/stop', {
        method: 'POST',
        body: JSON.stringify({
          gameSessionId: gameSession.gameSessionId,
        }),
      });

      setGameSession(null);
      setMessage('Sessão encerrada.');
    } catch (err) {
      const details =
        err.hostMessage ||
        err.host ||
        err.error ||
        err.details;

      setMessage(
        details
          ? `${err.message} Detalhes: ${details}`
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api('/api/auth/logout', {
      method: 'POST',
    });

    onLogout();
  }

  const hasActiveSession =
    gameSession?.status === 'starting' || gameSession?.status === 'running';

  return (
    <main className="dashboard-page">
      <nav className="topbar">
        <div>
          <strong>Sexo 10k</strong>
          <span>{user.name}</span>
        </div>

        <button className="ghost" onClick={logout}>
          Sair
        </button>
      </nav>

      <section className="panel">
        <h1>Sessão do emulador</h1>

        <p className="muted">
          Cada usuário possui uma sessão própria com um ID separado.
        </p>

        {checkingSession && (
          <div className="success">
            Verificando sessão ativa...
          </div>
        )}

        <div className="actions">
          <button
            onClick={play}
            disabled={loading || checkingSession || hasActiveSession}
          >
            {loading ? 'Carregando...' : 'Iniciar jogo'}
          </button>

          <button
            className="danger"
            onClick={stop}
            disabled={loading || checkingSession || !hasActiveSession}
          >
            Parar jogo
          </button>
        </div>

        {gameSession && (
          <div className="session-box">
            <span>Status: {gameSession.status}</span>
            <span>Game session: {gameSession.gameSessionId}</span>
            <span>Stream ID: {gameSession.streamId}</span>
          </div>
        )}

        {message && <div className="success">{message}</div>}
      </section>
    </main>
  );
}