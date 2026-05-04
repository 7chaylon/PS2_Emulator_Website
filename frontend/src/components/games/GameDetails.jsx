import React from "react";

import { getAssetUrl } from "../../lib/api";
import styles from "./GameDetails.module.css";

export function GameDetails({
  game,
  gameSession,
  loading,
  checkingSession,
  hasActiveSession,
  onPlay,
  onClose,
}) {
  if (!game) {
    return (
      <aside className={`${styles.info} ${styles.empty}`}>
        <strong>Selecione um jogo</strong>
        <p>Clique em uma capa para visualizar detalhes e iniciar uma sessão.</p>
      </aside>
    );
  }

  const coverUrl = getAssetUrl(game.coverUrl);

  return (
    <aside className={styles.info}>
      <button
        className={styles.backButton}
        onClick={onClose}
        disabled={loading || hasActiveSession}
        title="Fechar detalhes"
      >
        ×
      </button>

      <div className={styles.header}>
        <div className={styles.coverMini}>
          {coverUrl ? (
            <img src={coverUrl} alt={game.title} />
          ) : (
            <span>Sem capa</span>
          )}
        </div>

        <div>
          <small>PlayStation 2</small>
          <h2>{game.title}</h2>
        </div>
      </div>

      <div className={styles.meta}>
        <span>{game.serial || "Serial não informado"}</span>

        {gameSession?.status && <span>Status: {gameSession.status}</span>}

        {gameSession?.streamId && <span>Stream ID: {gameSession.streamId}</span>}
      </div>

      <p className={styles.description}>
        {game.description || "Sem descrição cadastrada."}
      </p>

      <div className={styles.infoGrid}>
        <div>
          <small>Plataforma</small>
          <strong>PS2</strong>
        </div>

        <div>
          <small>Sessão</small>
          <strong>{gameSession?.gameSessionId ? "Ativa" : "Pronta"}</strong>
        </div>

        <div>
          <small>Streaming</small>
          <strong>Preparando</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => onPlay(game)}
          disabled={loading || checkingSession || hasActiveSession}
        >
          ▶ {loading ? "Carregando..." : "Iniciar jogo"}
        </button>

        <button className={styles.secondaryButton} disabled>
          Detalhes
        </button>
      </div>
    </aside>
  );
}