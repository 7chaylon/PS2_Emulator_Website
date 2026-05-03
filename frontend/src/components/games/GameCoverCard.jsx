import React from 'react';

import { getAssetUrl } from '../../lib/api';

export function GameCoverCard({ game, selected, onClick }) {
  const coverUrl = getAssetUrl(game.coverUrl);

  return (
    <button
      type="button"
      className={`game-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      title={game.title}
      aria-label={`Ver detalhes de ${game.title}`}
    >
      <div className="game-cover">
        {coverUrl ? (
          <img src={coverUrl} alt={game.title} />
        ) : (
          <span>Sem capa</span>
        )}
      </div>

      <span className="game-title-small">
        {game.title}
      </span>
    </button>
  );
}