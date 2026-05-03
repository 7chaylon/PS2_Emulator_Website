import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onSuccess, onGoToRegister }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-pill">PS2 Cloud</div>

        <h1>Entrar na sessão</h1>

        <p className="muted">
          Entre para iniciar sua sessão própria do emulador.
        </p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="voce@email.com"
            />
          </label>

          <label>
            Senha
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              placeholder="Sua senha"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <button className="ghost" onClick={onGoToRegister}>
          Criar uma conta
        </button>
      </section>
    </main>
  );
}