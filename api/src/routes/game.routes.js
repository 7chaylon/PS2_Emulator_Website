import crypto from 'node:crypto';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

export const gameRoutes = Router();

const HOST_BACKEND_URL =
  process.env.HOST_BACKEND_URL || 'http://127.0.0.1:8080';

async function callHost(path, params = {}) {
  const searchParams = new URLSearchParams(params);
  const url = `${HOST_BACKEND_URL}${path}?${searchParams.toString()}`;

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

async function getHostSessionStatus(sessionId) {
  const url = `${HOST_BACKEND_URL}/status?sessionId=${encodeURIComponent(sessionId)}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  const data = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    data,
    url,
  };
}

gameRoutes.post('/play', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({
      ok: false,
      message: 'Informe o jogo que deseja iniciar.',
    });
  }

  const gameSessionId = crypto.randomUUID();
  const streamId = crypto.randomUUID();

  try {
    const [games] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        serial,
        iso_path,
        cover_url
      FROM games
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
      `,
      [gameId]
    );

    const game = games[0];

    if (!game) {
      return res.status(404).json({
        ok: false,
        message: 'Jogo não encontrado.',
      });
    }

    const [activeSessions] = await pool.query(
      `
      SELECT
        id,
        status,
        stream_id,
        game_id,
        created_at
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
          gameId: activeSessions[0].game_id,
          createdAt: activeSessions[0].created_at,
        },
      });
    }

    await pool.query(
      `
      INSERT INTO game_sessions (
        id,
        user_id,
        game_id,
        status,
        stream_id
      )
      VALUES (?, ?, ?, 'starting', ?)
      `,
      [gameSessionId, userId, game.id, streamId]
    );

    const hostResult = await callHost('/play', {
      sessionId: gameSessionId,
      isoPath: game.iso_path,
    });

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
        game: {
          id: game.id,
          title: game.title,
          serial: game.serial,
          coverUrl: game.cover_url,
        },
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
      game: {
        id: game.id,
        title: game.title,
        description: game.description,
        serial: game.serial,
        coverUrl: game.cover_url,
      },
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
        SELECT
          id,
          status
        FROM game_sessions
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [gameSessionId, userId]
      );

      session = rows[0] || null;
    }

    if (!session) {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          status
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

    const hostResult = await callHost('/stop', {
      sessionId: gameSessionId,
    });

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
        gs.id,
        gs.status,
        gs.stream_id,
        gs.host_message,
        gs.error_message,
        gs.created_at,
        gs.started_at,
        gs.stopped_at,
        gs.failed_at,
        g.id AS game_id,
        g.title AS game_title,
        g.description AS game_description,
        g.serial AS game_serial,
        g.cover_url AS game_cover_url
      FROM game_sessions gs
      LEFT JOIN games g ON g.id = gs.game_id
      WHERE gs.user_id = ?
        AND gs.status IN ('starting', 'running')
      ORDER BY gs.created_at DESC
      LIMIT 1
      `,
      [req.session.user.id]
    );

    const session = rows[0];

    if (!session) {
      return res.json({
        ok: true,
        session: null,
      });
    }

    try {
      const hostStatus = await getHostSessionStatus(session.id);

      if (hostStatus.ok && hostStatus.data?.running === false) {
        await pool.query(
          `
          UPDATE game_sessions
          SET
            status = 'stopped',
            host_message = 'PCSX2 encerrado fora da API.',
            stopped_at = NOW()
          WHERE id = ?
            AND user_id = ?
            AND status IN ('starting', 'running')
          `,
          [session.id, req.session.user.id]
        );

        return res.json({
          ok: true,
          session: null,
        });
      }
    } catch (hostError) {
      console.error('Erro ao consultar status do host:', hostError);
    }

    return res.json({
      ok: true,
      session: {
        id: session.id,
        status: session.status,
        streamId: session.stream_id,
        hostMessage: session.host_message,
        errorMessage: session.error_message,
        createdAt: session.created_at,
        startedAt: session.started_at,
        stoppedAt: session.stopped_at,
        failedAt: session.failed_at,
        game: session.game_id
          ? {
              id: session.game_id,
              title: session.game_title,
              description: session.game_description,
              serial: session.game_serial,
              coverUrl: session.game_cover_url,
            }
          : null,
      },
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