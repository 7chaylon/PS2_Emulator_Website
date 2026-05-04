import React from "react";

import { getAssetUrl } from "../../lib/api";
import styles from "./AdminGamesTable.module.css";

export function AdminGamesTable({
  games,
  totalGames,
  loadingGames,
  loading,
  onEdit,
  onToggleActive,
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.title}>
        <h2>Jogos cadastrados</h2>
        <span>{totalGames} jogos</span>
      </div>

      {loadingGames && <p className={styles.muted}>Carregando jogos...</p>}

      {!loadingGames && games.length === 0 && (
        <p className={styles.muted}>Nenhum jogo encontrado.</p>
      )}

      <div className={styles.tableHead}>
        <span>Jogo</span>
        <span>Serial</span>
        <span>Caminho da ISO</span>
        <span>Status</span>
        <span>Ações</span>
      </div>

      <div className={styles.list}>
        {games.map((game) => (
          <article className={styles.row} key={game.id}>
            <div className={styles.cover}>
              {game.coverUrl ? (
                <img src={getAssetUrl(game.coverUrl)} alt={game.title} />
              ) : (
                <span>Sem capa</span>
              )}
            </div>

            <div className={styles.gameTitle}>
              <h3>{game.title}</h3>
            </div>

            <p className={styles.serial}>{game.serial}</p>

            <small className={styles.path}>{game.isoPath}</small>

            <span className={game.isActive ? styles.active : styles.inactive}>
              {game.isActive ? "Ativo" : "Inativo"}
            </span>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onEdit(game)}
                disabled={loading}
              >
                Editar
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onToggleActive(game, !game.isActive)}
                disabled={loading}
              >
                {game.isActive ? "Desativar" : "Ativar"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}