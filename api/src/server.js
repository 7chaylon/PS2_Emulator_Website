import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import path from 'node:path';

import { sessionStore } from './config/sessionStore.js';
import { authRoutes } from './routes/auth.routes.js';
import { gameRoutes } from './routes/game.routes.js';
import { gamesRoutes } from './routes/games.routes.js';
import { adminGamesRoutes } from './routes/admin.games.routes.js';

const app = express();

const port = Number(process.env.PORT || 3001);


app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

app.use(session({
  name: 'sexo10k.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'sexo10k-api',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin/games', adminGamesRoutes);
app.use('/covers', express.static(path.join(process.cwd(), 'public', 'covers')));

app.listen(port, '0.0.0.0', () => {
  console.log(`API rodando em http://0.0.0.0:${port}`);
});