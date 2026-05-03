import bcrypt from 'bcrypt';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { publicUser } from '../utils/publicUser.js';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'Informe nome, email e senha com pelo menos 6 caracteres.',
      });
    }

    const [alreadyExists] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (alreadyExists.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Esse email já está cadastrado.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const user = {
      id: result.insertId,
      name,
      email,
    };

    req.session.user = publicUser(user);

    return res.status(201).json({
      ok: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro interno ao cadastrar usuário.',
    });
  }
});

authRoutes.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        ok: false,
        message: 'Email ou senha inválidos.',
      });
    }

    req.session.user = publicUser(user);

    return res.json({
      ok: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Erro no login:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro interno ao fazer login.',
    });
  }
});

authRoutes.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sexo10k.sid');

    return res.json({
      ok: true,
    });
  });
});

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.session.user,
  });
});