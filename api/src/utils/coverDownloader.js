import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_COVERS_DIR = path.join(process.cwd(), 'public', 'covers');

const DEFAULT_PUBLIC_COVERS_PATH = '/covers';

const DEFAULT_COVERS_BASE_URL =
  'https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default';

function normalizeSerial(serial) {
  return String(serial || '').trim().toUpperCase();
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function buildRemoteCoverUrl(serial) {
  const normalizedSerial = normalizeSerial(serial);
  const baseUrl = process.env.PS2_COVERS_BASE_URL || DEFAULT_COVERS_BASE_URL;

  return `${baseUrl}/${normalizedSerial}.jpg`;
}

export async function downloadCoverBySerial(serial) {
  const normalizedSerial = normalizeSerial(serial);

  if (!normalizedSerial) return null;

  const coversDir = process.env.COVERS_DIR || DEFAULT_COVERS_DIR;
  const publicCoversPath =
    process.env.PUBLIC_COVERS_PATH || DEFAULT_PUBLIC_COVERS_PATH;

  await fs.mkdir(coversDir, {
    recursive: true,
  });

  const coverFileName = `${normalizedSerial}.jpg`;
  const coverPath = path.join(coversDir, coverFileName);
  const publicUrl = `${publicCoversPath.replace(/\/$/, '')}/${coverFileName}`;

  if (await fileExists(coverPath)) {
    return publicUrl;
  }

  const remoteUrl = buildRemoteCoverUrl(normalizedSerial);

  const response = await fetch(remoteUrl);

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('image')) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(coverPath, buffer);

  return publicUrl;
}