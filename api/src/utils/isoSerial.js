import fs from 'node:fs/promises';

const SECTOR_SIZE = 2048;

function normalizeSerial(prefix, partA, partB) {
  return `${prefix.toUpperCase()}-${partA}${partB}`;
}

function extractSerialFromText(text) {
  const match = text.match(/([A-Z]{4})[_-](\d{3})\.(\d{2})/i);

  if (!match) return null;

  return normalizeSerial(match[1], match[2], match[3]);
}

function readUInt32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

async function readSectors(fileHandle, sector, length) {
  const buffer = Buffer.alloc(length);

  await fileHandle.read(
    buffer,
    0,
    length,
    sector * SECTOR_SIZE
  );

  return buffer;
}

function parseDirectoryRecords(buffer) {
  const records = [];
  let offset = 0;

  while (offset < buffer.length) {
    const recordLength = buffer[offset];

    if (recordLength === 0) {
      offset = (Math.floor(offset / SECTOR_SIZE) + 1) * SECTOR_SIZE;
      continue;
    }

    if (offset + recordLength > buffer.length) break;

    const record = buffer.subarray(offset, offset + recordLength);

    const extent = readUInt32LE(record, 2);
    const size = readUInt32LE(record, 10);
    const flags = record[25];
    const nameLength = record[32];
    const rawName = record.subarray(33, 33 + nameLength);

    let name = rawName.toString('utf8');

    if (name === '\u0000') name = '.';
    if (name === '\u0001') name = '..';

    name = name.replace(/;1$/i, '');

    records.push({
      name,
      extent,
      size,
      isDirectory: Boolean(flags & 0x02),
    });

    offset += recordLength;
  }

  return records;
}

async function findFileInDirectory(fileHandle, directoryRecord, targetName, depth = 0) {
  if (depth > 8) return null;

  const directoryBuffer = await readSectors(
    fileHandle,
    directoryRecord.extent,
    directoryRecord.size
  );

  const records = parseDirectoryRecords(directoryBuffer);

  for (const record of records) {
    const normalizedName = record.name.toUpperCase();

    if (!record.isDirectory && normalizedName === targetName.toUpperCase()) {
      return record;
    }
  }

  for (const record of records) {
    if (!record.isDirectory) continue;
    if (record.name === '.' || record.name === '..') continue;

    const found = await findFileInDirectory(fileHandle, record, targetName, depth + 1);

    if (found) return found;
  }

  return null;
}

export async function extractPs2SerialFromIso(isoPath) {
  const fileHandle = await fs.open(isoPath, 'r');

  try {
    const primaryVolumeDescriptor = await readSectors(fileHandle, 16, SECTOR_SIZE);

    const rootRecord = primaryVolumeDescriptor.subarray(156, 190);

    const rootDirectory = {
      extent: readUInt32LE(rootRecord, 2),
      size: readUInt32LE(rootRecord, 10),
      isDirectory: true,
      name: '/',
    };

    const systemCnfRecord = await findFileInDirectory(
      fileHandle,
      rootDirectory,
      'SYSTEM.CNF'
    );

    if (!systemCnfRecord) {
      throw new Error('SYSTEM.CNF não encontrado dentro da ISO.');
    }

    const systemCnfBuffer = await readSectors(
      fileHandle,
      systemCnfRecord.extent,
      Math.min(systemCnfRecord.size, 32 * 1024)
    );

    const systemCnfText = systemCnfBuffer.toString('utf8');
    const serial = extractSerialFromText(systemCnfText);

    if (!serial) {
      throw new Error('Não foi possível detectar o serial da ISO.');
    }

    return serial;
  } finally {
    await fileHandle.close();
  }
}