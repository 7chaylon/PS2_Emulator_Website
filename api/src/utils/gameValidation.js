import fs from 'node:fs/promises';
import path from 'node:path';

export function normalizePs2Serial(serial) {
  const value = String(serial || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  // Ex: SLUS_203.62 ou SLUS-203.62
  const matchWithDot = value.match(/^([A-Z]{4})[_-](\d{3})\.(\d{2})$/);

  if (matchWithDot) {
    return `${matchWithDot[1]}-${matchWithDot[2]}${matchWithDot[3]}`;
  }

  // Ex: SLUS_20362, SLUS-20362 ou SLUS20362
  const matchNormal = value.match(/^([A-Z]{4})[_-]?(\d{5})$/);

  if (matchNormal) {
    return `${matchNormal[1]}-${matchNormal[2]}`;
  }

  return value;
}

export function isValidPs2Serial(serial) {
  return /^[A-Z]{4}-\d{5}$/.test(normalizePs2Serial(serial));
}

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeIsoPath(isoPath) {
  return String(isoPath || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function validateGamePayload({ title, serial, isoPath }) {
  const errors = [];

  const normalizedTitle = normalizeText(title);
  const normalizedSerial = normalizePs2Serial(serial);
  const normalizedIsoPath = normalizeIsoPath(isoPath);

  if (!normalizedTitle) {
    errors.push('Título é obrigatório.');
  }

  if (!normalizedSerial) {
    errors.push('Serial é obrigatório.');
  } else if (!isValidPs2Serial(normalizedSerial)) {
    errors.push(
      'Serial inválido. Use o formato SLUS-20362, SLES-53702, SCUS-97472 etc.'
    );
  }

  if (!normalizedIsoPath) {
    errors.push('Caminho da ISO é obrigatório.');
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      title: normalizedTitle,
      serial: normalizedSerial,
      isoPath: normalizedIsoPath,
    },
  };
}

export async function validateIsoPathExists(isoPath) {
  const normalizedIsoPath = normalizeIsoPath(isoPath);
  const extension = path.extname(normalizedIsoPath).toLowerCase();

  if (extension !== '.iso') {
    return {
      ok: false,
      message: 'Por enquanto, apenas arquivos .iso são aceitos.',
    };
  }

  try {
    const stats = await fs.stat(normalizedIsoPath);

    if (!stats.isFile()) {
      return {
        ok: false,
        message: 'O caminho informado não é um arquivo.',
      };
    }

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      message: 'A ISO informada não existe no caminho especificado.',
    };
  }
}