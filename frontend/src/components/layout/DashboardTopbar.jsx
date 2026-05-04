import React, { useState } from "react";

export function DashboardTopbar({
  user,
  currentPage = "catalog",
  onOpenAdmin,
  onOpenControls,
  onBack,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  function openProfileMenu() {
    setProfileOpen(true);
  }

  function closeProfileMenu() {
    setProfileOpen(false);
  }

  function handleOpenControls() {
    closeProfileMenu();
    onOpenControls?.();
  }

  function handleLogout() {
    closeProfileMenu();
    onLogout?.();
  }

  return (
    <>
      <nav className="topbar">
        <div className="brand-logo">
          <strong>
            Sexo <span>10k</span>
          </strong>
        </div>

        <div className="topbar-nav">
          {currentPage !== "catalog" && (
            <button className="topbar-link" onClick={onBack}>
              Catálogo
            </button>
          )}

          {currentPage === "catalog" && user.role === "admin" && (
            <button className="topbar-link" onClick={onOpenAdmin}>
              Admin
            </button>
          )}
        </div>

        <div className="user-menu">
          <button
            className="user-avatar"
            title={user.name}
            onClick={openProfileMenu}
          >
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </button>
        </div>
      </nav>

      {profileOpen && (
        <div className="profile-drawer-backdrop" onClick={closeProfileMenu}>
          <aside
            className="profile-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="profile-drawer-header">
              <button
                className="profile-drawer-close"
                onClick={closeProfileMenu}
                title="Fechar"
              >
                ×
              </button>

              <div className="profile-drawer-avatar">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
              </div>
            </header>

            <div className="profile-drawer-actions">
              <button type="button" onClick={handleOpenControls}>
                <span>🎮</span>
                <div>
                  <strong>Mapeamento de controle</strong>
                  <small>Configurar teclado ou controle Bluetooth</small>
                </div>
              </button>

              {user.role === "admin" && currentPage !== "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    closeProfileMenu();
                    onOpenAdmin?.();
                  }}
                >
                  <span>⚙️</span>
                  <div>
                    <strong>Painel admin</strong>
                    <small>Gerenciar jogos e catálogo</small>
                  </div>
                </button>
              )}

              <button type="button" className="profile-logout" onClick={handleLogout}>
                <span>↪</span>
                <div>
                  <strong>Sair</strong>
                  <small>Encerrar sua sessão</small>
                </div>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}