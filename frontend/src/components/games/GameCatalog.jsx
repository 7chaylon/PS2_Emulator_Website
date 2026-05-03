import React from 'react';
import { GameCoverCard } from './GameCoverCard';
import { MessageBox } from '../ui/MessageBox';

export function GameCatalog({ games, loadingGames, onSelectGame }) {
  return (
    <section className="games-grid">
      {games.map((game) => (
        <GameCoverCard
          key={game.id}
          game={game}
          onClick={() => onSelectGame(game)}
        />
      ))}

      {!loadingGames && games.length === 0 && (
        <MessageBox variant="info">
          Nenhum jogo cadastrado ainda.
        </MessageBox>
      )}
    </section>
  );
}