import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Register({ onSuccess, onGoToLogin }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

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
      const data = await api('/api/auth/register', {
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

        <h1>Criar conta</h1>

        <p className="muted">
          Crie sua conta para usar uma sessão própria do emulador.
        </p>

        <form onSubmit={submit}>
          <label>
            Nome
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Seu nome"
            />
          </label>

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
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button disabled={loading}>
            {loading ? 'Carregando...' : 'Cadastrar'}
          </button>
        </form>

        <button className="ghost" onClick={onGoToLogin}>
          Já tenho conta
        </button>
      </section>
    </main>
  );
}