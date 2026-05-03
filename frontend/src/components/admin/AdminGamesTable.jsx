import React from 'react';
import { getAssetUrl } from '../../lib/api';

export function AdminGamesTable({
  games,
  totalGames,
  loadingGames,
  loading,
  onEdit,
  onToggleActive,
}) {
  return (
    <section className="admin-panel admin-list">
      <div className="admin-list-title">
        <h2>Jogos cadastrados</h2>
        <span>{totalGames} jogos</span>
      </div>

      {loadingGames && (
        <p className="muted">Carregando jogos...</p>
      )}

      {!loadingGames && games.length === 0 && (
        <p className="muted">Nenhum jogo encontrado.</p>
      )}

      <div className="admin-table-head">
        <span>Jogo</span>
        <span>Serial</span>
        <span>Caminho da ISO</span>
        <span>Status</span>
        <span>Ações</span>
      </div>

      <div className="admin-games-list">
        {games.map((game) => (
          <article className="admin-game-row" key={game.id}>
            <div className="admin-game-cover">
              {game.coverUrl ? (
                <img src={getAssetUrl(game.coverUrl)} alt={game.title} />
              ) : (
                <span>Sem capa</span>
              )}
            </div>

            <div className="admin-game-title">
              <h3>{game.title}</h3>
            </div>

            <p className="admin-game-serial">
              {game.serial}
            </p>

            <small className="admin-game-path">
              {game.isoPath}
            </small>

            <span className={game.isActive ? 'status-active' : 'status-inactive'}>
              {game.isActive ? 'Ativo' : 'Inativo'}
            </span>

            <div className="admin-game-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => onEdit(game)}
                disabled={loading}
              >
                Editar
              </button>

              <button
                type="button"
                className={game.isActive ? 'ghost' : 'ghost'}
                onClick={() => onToggleActive(game, !game.isActive)}
                disabled={loading}
              >
                {game.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}