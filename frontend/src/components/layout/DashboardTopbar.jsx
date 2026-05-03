import React from 'react';

export function DashboardTopbar({ user, onLogout }) {
  return (
    <nav className="topbar">
      <div>
        <strong>PS2 Emulator Website</strong>
        <span>{user.name}</span>
      </div>

      <button className="ghost" onClick={onLogout}>
        Sair
      </button>
    </nav>
  );
}