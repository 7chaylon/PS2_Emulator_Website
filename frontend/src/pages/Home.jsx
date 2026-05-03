import React, { useEffect, useMemo, useState } from 'react';

import { api } from '../lib/api';
import { DashboardTopbar } from '../components/layout/DashboardTopbar';
import { HomeHero } from '../components/games/HomeHero';
import { GameCatalog } from '../components/games/GameCatalog';
import { GameDetails } from '../components/games/GameDetails';
import { MessageBox } from '../components/ui/MessageBox';

export default function Home({ user, onLogout }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [message, setMessage] = useState('');
  const [loadingGames, setLoadingGames] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const hasActiveSession = useMemo(() => {
    return (
      gameSession?.status === 'starting' ||
      gameSession?.status === 'running'
    );
  }, [gameSession]);

  const currentGame = gameSession?.game || selectedGame;

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [gamesData, sessionData] = await Promise.all([
          api('/api/games'),
          api('/api/game/session'),
        ]);

        setGames(gamesData.games || []);

        if (sessionData.session) {
          setGameSession({
            status: sessionData.session.status,
            gameSessionId: sessionData.session.id,
            streamId: sessionData.session.streamId || sessionData.session.stream_id,
            game: sessionData.session.game || null,
            createdAt: sessionData.session.createdAt || sessionData.session.created_at,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
        setMessage(err.message || 'Erro ao carregar dados iniciais.');
      } finally {
        setLoadingGames(false);
        setCheckingSession(false);
      }
    }

    loadInitialData();
  }, []);

  async function play(game) {
    setMessage('');
    setLoading(true);

    try {
      const data = await api('/api/game/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: game.id,
        }),
      });

      setGameSession({
        status: data.status,
        gameSessionId: data.gameSessionId,
        streamId: data.streamId,
        game: data.game,
      });

      setMessage(`${game.title} iniciado.`);
    } catch (err) {
      if (err.session) {
        setGameSession({
          status: err.session.status,
          gameSessionId: err.session.id,
          streamId: err.session.streamId,
          gameId: err.session.gameId,
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

  return (
    <main className="dashboard-page">
      <DashboardTopbar user={user} onLogout={logout} />

      <HomeHero
        gameSession={gameSession}
        hasActiveSession={hasActiveSession}
      />

      {(loadingGames || checkingSession) && (
        <MessageBox variant="info">
          Carregando catálogo e verificando sessão ativa...
        </MessageBox>
      )}

      {message && (
        <MessageBox variant="success">
          {message}
        </MessageBox>
      )}

      {currentGame ? (
        <GameDetails
          game={currentGame}
          gameSession={gameSession}
          loading={loading}
          checkingSession={checkingSession}
          hasActiveSession={hasActiveSession}
          onBack={() => setSelectedGame(null)}
          onPlay={play}
          onStop={stop}
        />
      ) : (
        <GameCatalog
          games={games}
          loadingGames={loadingGames}
          onSelectGame={setSelectedGame}
        />
      )}
    </main>
  );
}