import React, { useEffect, useMemo, useState } from "react";
import { GameModeOverlay } from "../components/games/GameModeOverlay";
import { api } from "../lib/api";
import { DashboardTopbar } from "../components/layout/DashboardTopbar";
import { GameCatalog } from "../components/games/GameCatalog";
import { GameDetails } from "../components/games/GameDetails";
import { MessageBox } from "../components/ui/MessageBox";

export default function Home({ user, onLogout, onOpenAdmin, onOpenControls }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gameModeOpen, setGameModeOpen] = useState(false);
  const [gameModeGame, setGameModeGame] = useState(null);
  const hasActiveSession = useMemo(() => {
    return (
      gameSession?.status === "starting" || gameSession?.status === "running"
    );
  }, [gameSession]);
  const currentGame = gameSession?.game || selectedGame;

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [gamesData, sessionData] = await Promise.all([
          api("/api/games"),
          api("/api/game/session"),
        ]);

        const loadedGames = gamesData.games || [];
        setGames(loadedGames);

        if (sessionData.session) {
          setGameSession({
            status: sessionData.session.status,
            gameSessionId: sessionData.session.id,
            streamId:
              sessionData.session.streamId || sessionData.session.stream_id,
            game: sessionData.session.game || null,
            createdAt:
              sessionData.session.createdAt || sessionData.session.created_at,
          });
        } else {
          setSelectedGame(loadedGames[0] || null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
        setMessage(err.message || "Erro ao carregar dados iniciais.");
      } finally {
        setLoadingGames(false);
        setCheckingSession(false);
      }
    }

    loadInitialData();
  }, []);
  async function enterFullscreen() {
    const element = document.documentElement;

    if (element.requestFullscreen) {
      await element.requestFullscreen();
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  async function startGameMode(game) {
    try {
      const data = await api("/api/controls/me/status");

      if (!data.isComplete) {
        setMessage("Configure seus controles antes de jogar.");
        onOpenControls();
        return;
      }
    } catch (err) {
      setMessage(err.message || "Erro ao verificar controles.");
      return;
    }

    setGameModeGame(game);
    setGameModeOpen(true);

    try {
      await enterFullscreen();
    } catch (error) {
      console.warn("Não foi possível entrar em fullscreen:", error);
    }

    await play(game);
  }

  async function exitGameMode() {
    try {
      if (gameSession?.gameSessionId) {
        await stop();
      }
    } finally {
      setGameModeOpen(false);
      setGameModeGame(null);

      try {
        await exitFullscreen();
      } catch (error) {
        console.warn("Não foi possível sair do fullscreen:", error);
      }
    }
  }
  async function play(game) {
    setMessage("");
    setLoading(true);

    try {
      const data = await api("/api/game/play", {
        method: "POST",
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

      setSelectedGame(data.game);
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

      const details = err.hostMessage || err.host || err.error || err.details;

      setMessage(details ? `${err.message} Detalhes: ${details}` : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function stop() {
    if (!gameSession?.gameSessionId) {
      setMessage("Nenhuma sessão ativa para encerrar.");
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      await api("/api/game/stop", {
        method: "POST",
        body: JSON.stringify({
          gameSessionId: gameSession.gameSessionId,
        }),
      });

      setGameSession(null);
      setMessage("Sessão encerrada.");
    } catch (err) {
      const details = err.hostMessage || err.host || err.error || err.details;

      setMessage(details ? `${err.message} Detalhes: ${details}` : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", {
      method: "POST",
    });

    onLogout();
  }

  return (
    <main className="dashboard-page">
      <DashboardTopbar
        user={user}
        currentPage="catalog"
        onLogout={logout}
        onOpenAdmin={onOpenAdmin}
        onOpenControls={onOpenControls}
      />

      <section className="catalog-header">
        <div>
          <h1>Catálogo</h1>
          <p>Jogos de PS2 disponíveis para jogar via nuvem.</p>
        </div>
      </section>

      <section className="catalog-toolbar">
        <span className="catalog-count">{games.length} jogos encontrados</span>
      </section>

      {(loadingGames || checkingSession) && (
        <MessageBox variant="info">
          Carregando catálogo e verificando sessão ativa...
        </MessageBox>
      )}

      {message && <MessageBox variant="success">{message}</MessageBox>}

      <section className="games-shell">
        <GameCatalog
          games={games}
          selectedGameId={currentGame?.id}
          loadingGames={loadingGames}
          onSelectGame={setSelectedGame}
        />

        <GameDetails
          game={currentGame}
          gameSession={gameSession}
          loading={loading}
          checkingSession={checkingSession}
          hasActiveSession={hasActiveSession}
          onPlay={startGameMode}
          onClose={() => {
            if (!hasActiveSession) {
              setSelectedGame(null);
            }
          }}
        />
        <GameModeOverlay
          open={gameModeOpen}
          game={gameModeGame || currentGame}
          gameSession={gameSession}
          loading={loading}
          onExit={exitGameMode}
        />
      </section>
    </main>
  );
}
