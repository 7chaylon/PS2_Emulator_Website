import crypto from 'node:crypto';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

export const controlsRoutes = Router();

const REQUIRED_BINDINGS = [
  'dpadUp',
  'dpadDown',
  'dpadLeft',
  'dpadRight',

  'triangle',
  'circle',
  'cross',
  'square',

  'l1',
  'l2',
  'r1',
  'r2',

  'start',
  'select',

  'leftAnalogUp',
  'leftAnalogDown',
  'leftAnalogLeft',
  'leftAnalogRight',

  'rightAnalogUp',
  'rightAnalogDown',
  'rightAnalogLeft',
  'rightAnalogRight',

  'l3',
  'r3',
];

const EMPTY_BINDINGS = REQUIRED_BINDINGS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {});

const DEFAULT_BINDINGS = {
  dpadUp: 'KeyW',
  dpadDown: 'KeyS',
  dpadLeft: 'KeyA',
  dpadRight: 'KeyD',

  triangle: 'KeyU',
  circle: 'KeyO',
  cross: 'KeyK',
  square: 'KeyJ',

  l1: 'KeyE',
  l2: 'KeyQ',
  r1: 'KeyI',
  r2: 'KeyU',

  start: 'Enter',
  select: 'Backspace',
  analog: 'Tab',

  leftAnalogUp: 'KeyI',
  leftAnalogDown: 'KeyK',
  leftAnalogLeft: 'KeyJ',
  leftAnalogRight: 'KeyL',

  rightAnalogUp: 'ArrowUp',
  rightAnalogDown: 'ArrowDown',
  rightAnalogLeft: 'ArrowLeft',
  rightAnalogRight: 'ArrowRight',

  l3: 'ShiftLeft',
  r3: 'ControlLeft',
};

function normalizeBindings(bindings) {
  const result = {
    ...EMPTY_BINDINGS,
  };

  for (const key of Object.keys(result)) {
    const value = bindings?.[key];

    result[key] = typeof value === 'string'
      ? value.trim()
      : '';
  }

  if (bindings?.analog) {
    result.analog = String(bindings.analog).trim();
  }

  return result;
}

function isProfileComplete(bindings) {
  return REQUIRED_BINDINGS.every((key) => {
    return Boolean(bindings?.[key]);
  });
}

function safeJsonParse(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapProfile(row) {
  if (!row) {
    return {
      id: null,
      profileName: 'Padrão',
      bindings: EMPTY_BINDINGS,
      isComplete: false,
      createdAt: null,
      updatedAt: null,
    };
  }

  const bindings = normalizeBindings(safeJsonParse(row.bindings_json));

  return {
    id: row.id,
    profileName: row.profile_name,
    bindings,
    isComplete: Boolean(row.is_complete),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

controlsRoutes.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        profile_name,
        bindings_json,
        is_complete,
        created_at,
        updated_at
      FROM user_control_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.session.user.id]
    );

    return res.json({
      ok: true,
      profile: mapProfile(rows[0]),
      defaultBindings: DEFAULT_BINDINGS,
      requiredBindings: REQUIRED_BINDINGS,
    });
  } catch (error) {
    console.error('Erro ao buscar controles:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao buscar configuração de controles.',
      error: error.message,
    });
  }
});

controlsRoutes.get('/me/status', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        is_complete
      FROM user_control_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.session.user.id]
    );

    return res.json({
      ok: true,
      isComplete: Boolean(rows[0]?.is_complete),
    });
  } catch (error) {
    console.error('Erro ao verificar controles:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao verificar configuração de controles.',
      error: error.message,
    });
  }
});

controlsRoutes.put('/me', requireAuth, async (req, res) => {
  try {
    const profileName = String(req.body.profileName || 'Padrão').trim() || 'Padrão';
    const bindings = normalizeBindings(req.body.bindings);
    const isComplete = isProfileComplete(bindings);

    const [existingRows] = await pool.query(
      `
      SELECT id
      FROM user_control_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.session.user.id]
    );

    if (existingRows.length > 0) {
      await pool.query(
        `
        UPDATE user_control_profiles
        SET
          profile_name = ?,
          bindings_json = ?,
          is_complete = ?,
          updated_at = NOW()
        WHERE user_id = ?
        `,
        [
          profileName,
          JSON.stringify(bindings),
          isComplete ? 1 : 0,
          req.session.user.id,
        ]
      );

      return res.json({
        ok: true,
        message: isComplete
          ? 'Controles salvos com sucesso.'
          : 'Controles salvos, mas o perfil ainda está incompleto.',
        profile: {
          id: existingRows[0].id,
          profileName,
          bindings,
          isComplete,
        },
      });
    }

    const id = crypto.randomUUID();

    await pool.query(
      `
      INSERT INTO user_control_profiles (
        id,
        user_id,
        profile_name,
        bindings_json,
        is_complete
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        req.session.user.id,
        profileName,
        JSON.stringify(bindings),
        isComplete ? 1 : 0,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: isComplete
        ? 'Controles salvos com sucesso.'
        : 'Controles salvos, mas o perfil ainda está incompleto.',
      profile: {
        id,
        profileName,
        bindings,
        isComplete,
      },
    });
  } catch (error) {
    console.error('Erro ao salvar controles:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao salvar configuração de controles.',
      error: error.message,
    });
  }
});

controlsRoutes.post('/me/default', requireAuth, async (req, res) => {
  try {
    const bindings = normalizeBindings(DEFAULT_BINDINGS);
    const isComplete = isProfileComplete(bindings);

    const [existingRows] = await pool.query(
      `
      SELECT id
      FROM user_control_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.session.user.id]
    );

    if (existingRows.length > 0) {
      await pool.query(
        `
        UPDATE user_control_profiles
        SET
          profile_name = 'Padrão',
          bindings_json = ?,
          is_complete = ?,
          updated_at = NOW()
        WHERE user_id = ?
        `,
        [
          JSON.stringify(bindings),
          isComplete ? 1 : 0,
          req.session.user.id,
        ]
      );

      return res.json({
        ok: true,
        message: 'Mapeamento padrão restaurado.',
        profile: {
          id: existingRows[0].id,
          profileName: 'Padrão',
          bindings,
          isComplete,
        },
      });
    }

    const id = crypto.randomUUID();

    await pool.query(
      `
      INSERT INTO user_control_profiles (
        id,
        user_id,
        profile_name,
        bindings_json,
        is_complete
      )
      VALUES (?, ?, 'Padrão', ?, ?)
      `,
      [
        id,
        req.session.user.id,
        JSON.stringify(bindings),
        isComplete ? 1 : 0,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Mapeamento padrão restaurado.',
      profile: {
        id,
        profileName: 'Padrão',
        bindings,
        isComplete,
      },
    });
  } catch (error) {
    console.error('Erro ao restaurar controles:', error);

    return res.status(500).json({
      ok: false,
      message: 'Erro ao restaurar configuração padrão.',
      error: error.message,
    });
  }
});