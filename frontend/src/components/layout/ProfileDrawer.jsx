import React from "react";

import styles from "./ProfileDrawer.module.css";

export function ProfileDrawer({
  user,
  open,
  currentPage,
  onClose,
  onOpenAdmin,
  onOpenControls,
  onLogout,
}) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.drawer}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <button className={styles.close} onClick={onClose} title="Fechar">
            ×
          </button>

          <div className={styles.avatar}>
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </header>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenControls?.();
            }}
          >
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
                onClose();
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

          <button
            type="button"
            className={styles.logout}
            onClick={() => {
              onClose();
              onLogout?.();
            }}
          >
            <span>↪</span>

            <div>
              <strong>Sair</strong>
              <small>Encerrar sua sessão</small>
            </div>
          </button>
        </div>
      </aside>
    </div>
  );
}