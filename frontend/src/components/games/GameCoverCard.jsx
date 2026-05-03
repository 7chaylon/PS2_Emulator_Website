import React from 'react';

export function GameCoverCard({ game, onClick }) {
  return (
    <button
      type="button"
      className="game-card"
      onClick={onClick}
      title={game.title}
      aria-label={`Ver detalhes de ${game.title}`}
    >
      <div className="game-cover">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} />
        ) : (
          <span>Sem capa</span>
        )}
      </div>
    </button>
  );
}