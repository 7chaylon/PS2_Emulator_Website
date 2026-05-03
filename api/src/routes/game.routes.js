import crypto from 'node:crypto';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

export const gameRoutes = Router();

const HOST_BACKEND_URL =
  process.env.HOST_BACKEND_URL || 'http://127.0.0.1:8080';

async function callHost(path, sessionId) {
  const url = `${HOST_BACKEND_URL}${path}?sessionId=${encodeURIComponent(sessionId)}`;

  const response = await fetch(url, {
    method: 'POST',
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
    url,
  };
}

gameRoutes.post('/play', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const gameSessionId = crypto.randomUUID();
  const streamId = crypto.randomUUID();

  try {
    const [activeSessions] = await pool.query(
      `
      SELECT id, status, stream_id, created_at
      FROM game_sessions
      WHERE user_id = ?
        AND status IN ('starting', 'running')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (activeSessions.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Você já possui uma sessão ativa.',
        session: {
          id: activeSessions[0].id,
          status: activeSessions[0].status,
          streamId: activeSessions[0].stream_id,
          createdAt: activeSessions[0].created_at,
        },
      });
    }

    await pool.query(
      `
      INSERT INTO game_sessions (
        id,
        user_id,
        status,
        stream_id
      )
      VALUES (?, ?, 'starting', ?)
      `,
      [gameSessionId, userId, streamId]
    );

    const hostResult = await callHost('/play', gameSessionId);

    if (!hostResult.ok) {
      await pool.query(
        `
        UPDATE game_sessions
        SET
          status = 'failed',
          host_message = ?,
          error_message = ?,
          failed_at = NOW()
        WHERE id = ? AND user_id = ?
        `,
        [
          hostResult.text,
          `Host retornou HTTP ${hostResult.status}`,
          gameSessionId,
          userId,
        ]
      );

      return res.status(502).json({
        ok: false,
        message: 'O host do emulador não conseguiu iniciar o jogo.',
        gameSessionId,
        streamId,
        hostStatus: hostResult.status,
        hostMessage: hostResult.text,
        hostUrl: hostResult.url,
      });
    }

    await pool.query(
      `
      UPDATE game_sessions
      SET
        status = 'running',
        host_message = ?,
        started_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [hostResult.text, gameSessionId, userId]
    );

    return res.json({
      ok: true,
      status: 'running',
      gameSessionId,
      streamId,
      host: hostResult.text,
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);

    try {
      await pool.query(
        `
        UPDATE game_sessions
        SET
          status = 'failed',
          error_message = ?,
          failed_at = NOW()
        WHERE id = ? AND user_id = ?
        `,
        [error.message, gameSessionId, userId]
      );
    } catch {
      // evita quebrar a resposta caso a própria atualização falhe
    }

    return res.status(503).json({
      ok: false,
      message: 'Erro ao iniciar sessão do emulador.',
      gameSessionId,
      streamId,
      error: error.message,
    });
  }
});

gameRoutes.post('/stop', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    let { gameSessionId } = req.body;

    let session = null;

    if (gameSessionId) {
      const [rows] = await pool.query(
        `
        SELECT id, status
        FROM game_sessions
        WHERE id = ? AND user_id = ?
        LIMIT 1
        `,
        [gameSessionId, userId]
      );

      session = rows[0] || null;
    }

    if (!session) {
      const [rows] = await pool.query(
        `
        SELECT id, status
        FROM game_sessions
        WHERE user_id = ?
          AND status IN ('starting', 'running')
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );

      session = rows[0] || null;
    }

    if (!session) {
      return res.status(404).json({
        ok: false,
        message: 'Nenhuma sessão ativa encontrada para esse usuário.',
      });
    }

    gameSessionId = session.id;

    const hostResult = await callHost('/stop', gameSessionId);

    await pool.query(
      `
      UPDATE game_sessions
      SET
        status = 'stopped',
        host_message = ?,
        stopped_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [hostResult.text, gameSessionId, userId]
    );

    return res.json({
      ok: true,
      status: 'stopped',
      gameSessionId,
      host: hostResult.text,
    });
  } catch (error) {
    console.error('Erro ao parar sessão:', error);

    return res.status(503).json({
      ok: false,
      message: 'Erro ao parar sessão do emulador.',
      error: error.message,
    });
  }
});

gameRoutes.get('/session', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        status,
        stream_id,
        host_message,
        error_message,
        created_at,
        started_at,
        stopped_at,
        failed_at
      FROM game_sessions
      WHERE user_id = ?
        AND status IN ('starting', 'running')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [req.session.user.id]
    );

    return res.json({
      ok: true,
      session: rows[0] || null,
    });
  } catch (error) {
    console.error('Erro ao buscar sessão:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao buscar sessão.',
      error: error.message,
    });
  }
});