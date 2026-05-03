import React from 'react';

export function GameDetails({
  game,
  gameSession,
  loading,
  checkingSession,
  hasActiveSession,
  onPlay,
  onStop,
  onClose,
}) {
  if (!game) {
    return (
      <aside className="game-info empty-details">
        <strong>Selecione um jogo</strong>
        <p className="muted">
          Clique em uma capa para visualizar detalhes e iniciar uma sessão.
        </p>
      </aside>
    );
  }

  return (
    <aside className="game-info">
      <button
        className="ghost back-button"
        onClick={onClose}
        disabled={loading || hasActiveSession}
        title="Fechar detalhes"
      >
        ×
      </button>

      <div className="details-header">
        <div className="details-cover-mini">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt={game.title} />
          ) : (
            <span>Sem capa</span>
          )}
        </div>

        <div>
          <small>PlayStation 2</small>
          <h2>{game.title}</h2>
        </div>
      </div>

      <div className="game-meta">
        <span>{game.serial || 'Serial não informado'}</span>

        {gameSession?.status && (
          <span>Status: {gameSession.status}</span>
        )}

        {gameSession?.streamId && (
          <span>Stream ID: {gameSession.streamId}</span>
        )}
      </div>

      <p className="muted details-description">
        {game.description || 'Sem descrição cadastrada.'}
      </p>

      <div className="details-info-grid">
        <div>
          <small>Plataforma</small>
          <strong>PS2</strong>
        </div>

        <div>
          <small>Sessão</small>
          <strong>{gameSession?.gameSessionId ? 'Ativa' : 'Pronta'}</strong>
        </div>

        <div>
          <small>Streaming</small>
          <strong>Preparando</strong>
        </div>
      </div>

      <div className="actions">
        <button
          onClick={() => onPlay(game)}
          disabled={loading || checkingSession || hasActiveSession}
        >
          ▶ {loading ? 'Carregando...' : 'Iniciar jogo'}
        </button>

        <button
          className="ghost"
          disabled
        >
          Detalhes
        </button>

        <button
          className="danger"
          onClick={onStop}
          disabled={loading || checkingSession || !hasActiveSession}
        >
          Parar sessão
        </button>
      </div>
    </aside>
  );
}