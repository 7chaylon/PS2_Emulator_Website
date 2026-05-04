import React from "react";

import { getAssetUrl } from "../../lib/api";
import styles from "./GameCoverCard.module.css";

export function GameCoverCard({ game, selected, onClick }) {
  const coverUrl = getAssetUrl(game.coverUrl);

  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={onClick}
      title={game.title}
      aria-label={`Ver detalhes de ${game.title}`}
    >
      <div className={styles.cover}>
        {coverUrl ? (
          <img src={coverUrl} alt={game.title} />
        ) : (
          <span>Sem capa</span>
        )}
      </div>

      <span className={styles.title}>{game.title}</span>
    </button>
  );
}