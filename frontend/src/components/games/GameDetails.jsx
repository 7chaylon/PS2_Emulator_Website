import React from 'react';
import { PlayerPlaceholder } from './PlayerPlaceholder';

export function GameDetails({
  game,
  gameSession,
  loading,
  checkingSession,
  hasActiveSession,
  onBack,
  onPlay,
  onStop,
}) {
  return (
    <section className="game-details">
      <div className="game-cover-large">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} />
        ) : (
          <span>Sem capa</span>
        )}
      </div>

      <div className="game-info">
        <button
          className="ghost back-button"
          onClick={onBack}
          disabled={loading}
        >
          Voltar ao catálogo
        </button>

        <h2>{game.title}</h2>

        <p className="muted">
          {game.description || 'Sem descrição cadastrada.'}
        </p>

        <div className="game-meta">
          <span>Serial: {game.serial || 'Não informado'}</span>

          {gameSession?.streamId && (
            <span>Stream ID: {gameSession.streamId}</span>
          )}

          {gameSession?.gameSessionId && (
            <span>Sessão: {gameSession.gameSessionId}</span>
          )}
        </div>

        <PlayerPlaceholder />

        <div className="actions">
          <button
            onClick={() => onPlay(game)}
            disabled={loading || checkingSession || hasActiveSession}
          >
            {loading ? 'Carregando...' : 'Jogar'}
          </button>

          <button
            className="danger"
            onClick={onStop}
            disabled={loading || checkingSession || !hasActiveSession}
          >
            Parar sessão
          </button>
        </div>
      </div>
    </section>
  );
}