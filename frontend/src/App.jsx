import React, { useEffect, useState } from 'react';
import { api } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import './style.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (user) {
    return <Home user={user} onLogout={() => setUser(null)} />;
  }

  if (page === 'register') {
    return (
      <Register
        onSuccess={setUser}
        onGoToLogin={() => setPage('login')}
      />
    );
  }

  return (
    <Login
      onSuccess={setUser}
      onGoToRegister={() => setPage('register')}
    />
  );
}