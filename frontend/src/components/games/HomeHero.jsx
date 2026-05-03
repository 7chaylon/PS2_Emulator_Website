import React from 'react';

export function HomeHero({ gameSession, hasActiveSession }) {
  return (
    <section className="hero-panel">
      <div>
        <span className="brand-pill">Catálogo PS2</span>
        <h1>Escolha um jogo</h1>
        <p className="muted">
          Selecione uma capa do catálogo para abrir os detalhes do jogo.
        </p>
      </div>

      {hasActiveSession && (
        <div className="active-session-card">
          <span>Sessão ativa</span>
          <strong>{gameSession?.game?.title || 'Jogo em execução'}</strong>
          <small>Status: {gameSession.status}</small>
        </div>
      )}
    </section>
  );
}