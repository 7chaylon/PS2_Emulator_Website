import React, { useState } from "react";

import { ProfileDrawer } from "./ProfileDrawer";
import styles from "./DashboardTopbar.module.css";

export function DashboardTopbar({
  user,
  currentPage = "catalog",
  onOpenAdmin,
  onOpenControls,
  onBack,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <nav className={styles.topbar}>
        <div className={styles.brandLogo}>
          <strong>
            Sexo <span>10k</span>
          </strong>
        </div>

        <div className={styles.nav}>
          {currentPage !== "catalog" && (
            <button className={styles.link} onClick={onBack}>
              Catálogo
            </button>
          )}

          {currentPage === "catalog" && user.role === "admin" && (
            <button className={styles.link} onClick={onOpenAdmin}>
              Admin
            </button>
          )}
        </div>

        <div className={styles.userMenu}>
          <button
            className={styles.avatar}
            title={user.name}
            onClick={() => setProfileOpen(true)}
          >
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </button>
        </div>
      </nav>

      <ProfileDrawer
        user={user}
        open={profileOpen}
        currentPage={currentPage}
        onClose={() => setProfileOpen(false)}
        onOpenAdmin={onOpenAdmin}
        onOpenControls={onOpenControls}
        onLogout={onLogout}
      />
    </>
  );
}