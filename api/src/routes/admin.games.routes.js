import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import multer from 'multer';
import { Router } from 'express';

import { pool } from '../db.js';
import { requireAdmin } from '../middlewares/admin.js';
import { extractPs2SerialFromIso } from '../utils/isoSerial.js';
import { downloadCoverBySerial, buildRemoteCoverUrl } from '../utils/coverDownloader.js';
import {
  isValidPs2Serial,
  normalizePs2Serial,
  normalizeText,
  validateGamePayload,
  validateIsoPathExists,
} from '../utils/gameValidation.js';

export const adminGamesRoutes = Router();

const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

const DEFAULT_GAMES_DIR = 'C:/Users/chaylon/Desktop/ps2 emulator/jogo';

function sanitizeFileName(fileName) {
  return String(fileName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTitleFromFileName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/\s*\[[^\]]+\]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getAvailablePath(directory, fileName) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);

  let index = 0;
  let finalPath = path.join(directory, fileName);

  while (await fileExists(finalPath)) {
    index += 1;
    finalPath = path.join(directory, `${baseName} (${index})${extension}`);
  }

  return finalPath;
}

async function moveFile(from, to) {
  try {
    await fs.rename(from, to);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;

    await fs.copyFile(from, to);
    await fs.unlink(from);
  }
}

async function resolveCoverUrl(serial, coverUrl) {
  const customCoverUrl = String(coverUrl || '').trim();

  if (customCoverUrl) {
    return customCoverUrl;
  }

  const normalizedSerial = normalizePs2Serial(serial);

  if (!normalizedSerial) {
    return null;
  }

  const downloadedCoverUrl = await downloadCoverBySerial(normalizedSerial);

  if (downloadedCoverUrl) {
    return downloadedCoverUrl;
  }

  return buildRemoteCoverUrl(normalizedSerial);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true })
        .then(() => callback(null, TEMP_UPLOAD_DIR))
        .catch((error) => callback(error));
    },
    filename: (_req, file, callback) => {
      const safeName = sanitizeFileName(file.originalname);
      callback(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: 9 * 1024 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== '.iso') {
      return callback(new Error('Por enquanto, envie apenas arquivos .iso.'));
    }

    return callback(null, true);
  },
});

adminGamesRoutes.post('/upload', requireAdmin, (req, res) => {
  upload.single('iso')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        ok: false,
        message: uploadError.message || 'Erro ao enviar ISO.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'Envie uma ISO para cadastrar o jogo.',
      });
    }

    const tempIsoPath = req.file.path;

    try {
      const gamesDir = process.env.GAMES_DIR || DEFAULT_GAMES_DIR;

      await fs.mkdir(gamesDir, {
        recursive: true,
      });

      const detectedSerial = await extractPs2SerialFromIso(tempIsoPath);
      const serial = normalizePs2Serial(detectedSerial);

      if (!isValidPs2Serial(serial)) {
        await fs.unlink(tempIsoPath);

        return res.status(400).json({
          ok: false,
          message: 'A ISO foi lida, mas o serial detectado é inválido.',
          serial,
        });
      }

      const [existingGames] = await pool.query(
        `
        SELECT id, title
        FROM games
        WHERE serial = ?
        LIMIT 1
        `,
        [serial]
      );

      if (existingGames.length > 0) {
        await fs.unlink(tempIsoPath);

        return res.status(409).json({
          ok: false,
          message: `Já existe um jogo cadastrado com o serial ${serial}.`,
          game: existingGames[0],
        });
      }

      const originalExtension = path.extname(req.file.originalname);

      const title = normalizeText(
        req.body.title || getTitleFromFileName(req.file.originalname)
      );

      if (!title) {
        await fs.unlink(tempIsoPath);

        return res.status(400).json({
          ok: false,
          message: 'Não foi possível definir o título do jogo.',
        });
      }

      const description = normalizeText(req.body.description) || null;

      const finalFileName = sanitizeFileName(
        `${title} [${serial}]${originalExtension}`
      );

      const finalIsoPath = await getAvailablePath(gamesDir, finalFileName);

      await moveFile(tempIsoPath, finalIsoPath);

      const coverUrl = await resolveCoverUrl(serial);

      const id = crypto.randomUUID();

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
        VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [
          id,
          title,
          description,
          serial,
          finalIsoPath,
          coverUrl,
        ]
      );

      return res.status(201).json({
        ok: true,
        message: coverUrl
          ? 'Jogo enviado, capa baixada e cadastro realizado com sucesso.'
          : 'Jogo enviado e cadastrado com sucesso, mas a capa não foi encontrada.',
        game: {
          id,
          title,
          description,
          serial,
          isoPath: finalIsoPath,
          coverUrl,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('Erro ao processar upload da ISO:', error);

      try {
        await fs.unlink(tempIsoPath);
      } catch {
        // ignora erro ao limpar arquivo temporário
      }

      return res.status(500).json({
        ok: false,
        message: 'Erro ao processar upload da ISO.',
        error: error.message,
      });
    }
  });
});

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

    const validation = validateGamePayload({
      title,
      serial,
      isoPath,
    });

    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const isoValidation = await validateIsoPathExists(validation.data.isoPath);

    if (!isoValidation.ok) {
      return res.status(400).json({
        ok: false,
        message: isoValidation.message,
      });
    }

    const id = crypto.randomUUID();
    const finalCoverUrl = await resolveCoverUrl(validation.data.serial, coverUrl);
    const finalDescription = normalizeText(description) || null;

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
        validation.data.title,
        finalDescription,
        validation.data.serial,
        validation.data.isoPath,
        finalCoverUrl,
        isActive ? 1 : 0,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Jogo cadastrado com sucesso.',
      game: {
        id,
        title: validation.data.title,
        description: finalDescription,
        serial: validation.data.serial,
        isoPath: validation.data.isoPath,
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

    const validation = validateGamePayload({
      title,
      serial,
      isoPath,
    });

    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const isoValidation = await validateIsoPathExists(validation.data.isoPath);

    if (!isoValidation.ok) {
      return res.status(400).json({
        ok: false,
        message: isoValidation.message,
      });
    }

    const finalCoverUrl = await resolveCoverUrl(validation.data.serial, coverUrl);
    const finalDescription = normalizeText(description) || null;

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
        validation.data.title,
        finalDescription,
        validation.data.serial,
        validation.data.isoPath,
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