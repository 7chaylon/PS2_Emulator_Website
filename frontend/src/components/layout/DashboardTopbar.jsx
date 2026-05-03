import React from 'react';

export function DashboardTopbar({
  user,
  currentPage = 'catalog',
  onOpenAdmin,
  onBack,
  onLogout,
}) {
  return (
    <nav className="topbar">
      <div className="brand-logo">
        <strong>
          Sexo <span>10k</span>
        </strong>
      </div>

      <div className="topbar-nav">
        {currentPage !== 'catalog' && (
          <button className="topbar-link" onClick={onBack}>
            Catálogo
          </button>
        )}

        {currentPage === 'catalog' && user.role === 'admin' && (
          <button className="topbar-link" onClick={onOpenAdmin}>
            Admin
          </button>
        )}
      </div>

      <div className="user-menu">
        <button className="user-avatar" title={user.name}>
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </button>

        <button className="logout-link" onClick={onLogout}>
          Sair
        </button>
      </div>
    </nav>
  );
}