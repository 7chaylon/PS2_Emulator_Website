import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

export const gamesRoutes = Router();

gamesRoutes.get('/', requireAuth, async (_req, res) => {
  try {
    const [games] = await pool.query(`
      SELECT
        id,
        title,
        description,
        serial,
        cover_url,
        is_active,
        created_at,
        updated_at
      FROM games
      WHERE is_active = 1
      ORDER BY title ASC
    `);

    return res.json({
      ok: true,
      games: games.map((game) => ({
        id: game.id,
        title: game.title,
        description: game.description,
        serial: game.serial,
        coverUrl: game.cover_url,
        isActive: Boolean(game.is_active),
        createdAt: game.created_at,
        updatedAt: game.updated_at,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao buscar jogos.',
      error: error.message,
    });
  }
});

gamesRoutes.get('/:id', requireAuth, async (req, res) => {
  try {
    const [games] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        serial,
        cover_url,
        is_active,
        created_at,
        updated_at
      FROM games
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
      `,
      [req.params.id]
    );

    const game = games[0];

    if (!game) {
      return res.status(404).json({
        ok: false,
        message: 'Jogo não encontrado.',
      });
    }

    return res.json({
      ok: true,
      game: {
        id: game.id,
        title: game.title,
        description: game.description,
        serial: game.serial,
        coverUrl: game.cover_url,
        isActive: Boolean(game.is_active),
        createdAt: game.created_at,
        updatedAt: game.updated_at,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar jogo:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao buscar jogo.',
      error: error.message,
    });
  }
});