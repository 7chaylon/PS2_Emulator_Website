import React from "react";

import styles from "./HomeHero.module.css";

export function HomeHero({ gameSession, hasActiveSession }) {
  return (
    <section className={styles.hero}>
      <div>
        <span className={styles.brandPill}>Catálogo PS2</span>
        <h1>Escolha um jogo</h1>
        <p>Selecione uma capa do catálogo para abrir os detalhes do jogo.</p>
      </div>

      {hasActiveSession && (
        <div className={styles.activeSession}>
          <span>Sessão ativa</span>
          <strong>{gameSession?.game?.title || "Jogo em execução"}</strong>
          <small>Status: {gameSession.status}</small>
        </div>
      )}
    </section>
  );
}