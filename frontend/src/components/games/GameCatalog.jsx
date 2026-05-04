import React from "react";

import { GameCoverCard } from "./GameCoverCard";
import { MessageBox } from "../ui/MessageBox";
import styles from "./GameCatalog.module.css";

export function GameCatalog({
  games,
  selectedGameId,
  loadingGames,
  onSelectGame,
}) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCoverCard
          key={game.id}
          game={game}
          selected={game.id === selectedGameId}
          onClick={() => onSelectGame(game)}
        />
      ))}

      {!loadingGames && games.length === 0 && (
        <MessageBox variant="info">Nenhum jogo cadastrado ainda.</MessageBox>
      )}
    </div>
  );
}