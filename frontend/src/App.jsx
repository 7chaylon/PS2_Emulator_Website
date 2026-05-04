import React, { useEffect, useState } from 'react';

import { api } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AdminGames from './pages/AdminGames';
import ControlsSetup from './pages/ControlsSetup';

import './style.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => {
        setUser(data.user);
        setPage('home');
      })
      .catch(() => {
        setUser(null);
        setPage('login');
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    setPage('home');
  }

  function handleLogout() {
    setUser(null);
    setPage('login');
  }

  if (checking) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (user && page === 'controls') {
    return (
      <ControlsSetup
        onBack={() => setPage('home')}
      />
    );
  }

  if (user && page === 'admin') {
    return (
      <AdminGames
        user={user}
        onBack={() => setPage('home')}
        onLogout={handleLogout}
      />
    );
  }

  if (user) {
    return (
      <Home
        user={user}
        onLogout={handleLogout}
        onOpenAdmin={() => setPage('admin')}
        onOpenControls={() => setPage('controls')}
      />
    );
  }

  if (page === 'register') {
    return (
      <Register
        onSuccess={handleLogin}
        onGoToLogin={() => setPage('login')}
      />
    );
  }

  return (
    <Login
      onSuccess={handleLogin}
      onGoToRegister={() => setPage('register')}
    />
  );
}