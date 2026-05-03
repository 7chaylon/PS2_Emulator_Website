import crypto from 'node:crypto';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAdmin } from '../middlewares/admin.js';

export const adminGamesRoutes = Router();

function buildCoverUrl(serial, coverUrl) {
  if (coverUrl) return coverUrl;

  if (!serial) return null;

  return `https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg`;
}

adminGamesRoutes.get('/', requireAdmin, async (_req, res) => {
  try {
    const [games] = await pool.query(`
      SELECT
        id,
        title,
        description,
        serial,
        iso_path,
        cover_url,
        is_active,
        created_at,
        updated_at
      FROM games
      ORDER BY title ASC
    `);

    return res.json({
      ok: true,
      games: games.map((game) => ({
        id: game.id,
        title: game.title,
        description: game.description,
        serial: game.serial,
        isoPath: game.iso_path,
        coverUrl: game.cover_url,
        isActive: Boolean(game.is_active),
        createdAt: game.created_at,
        updatedAt: game.updated_at,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar jogos admin:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao buscar jogos.',
      error: error.message,
    });
  }
});

adminGamesRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      serial,
      isoPath,
      coverUrl,
      isActive = true,
    } = req.body;

    if (!title || !serial || !isoPath) {
      return res.status(400).json({
        ok: false,
        message: 'Título, serial e caminho da ISO são obrigatórios.',
      });
    }

    const id = crypto.randomUUID();
    const finalCoverUrl = buildCoverUrl(serial, coverUrl);

    await pool.query(
      `
      INSERT INTO games (
        id,
        title,
        description,
        serial,
        iso_path,
        cover_url,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        title,
        description || null,
        serial,
        isoPath,
        finalCoverUrl,
        isActive ? 1 : 0,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Jogo cadastrado com sucesso.',
      game: {
        id,
        title,
        description: description || null,
        serial,
        isoPath,
        coverUrl: finalCoverUrl,
        isActive: Boolean(isActive),
      },
    });
  } catch (error) {
    console.error('Erro ao cadastrar jogo:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        message: 'Já existe um jogo cadastrado com esse serial.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Erro ao cadastrar jogo.',
      error: error.message,
    });
  }
});

adminGamesRoutes.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      serial,
      isoPath,
      coverUrl,
      isActive = true,
    } = req.body;

    if (!title || !serial || !isoPath) {
      return res.status(400).json({
        ok: false,
        message: 'Título, serial e caminho da ISO são obrigatórios.',
      });
    }

    const finalCoverUrl = buildCoverUrl(serial, coverUrl);

    const [result] = await pool.query(
      `
      UPDATE games
      SET
        title = ?,
        description = ?,
        serial = ?,
        iso_path = ?,
        cover_url = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        title,
        description || null,
        serial,
        isoPath,
        finalCoverUrl,
        isActive ? 1 : 0,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Jogo não encontrado.',
      });
    }

    return res.json({
      ok: true,
      message: 'Jogo atualizado com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao atualizar jogo:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        message: 'Já existe outro jogo com esse serial.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Erro ao atualizar jogo.',
      error: error.message,
    });
  }
});

adminGamesRoutes.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      `
      UPDATE games
      SET
        is_active = 0,
        updated_at = NOW()
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Jogo não encontrado.',
      });
    }

    return res.json({
      ok: true,
      message: 'Jogo desativado com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao desativar jogo:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao desativar jogo.',
      error: error.message,
    });
  }
});