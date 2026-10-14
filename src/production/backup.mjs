import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const safe = value => `${value}`.replace(/[^A-Za-z0-9._-]/g, '-');
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function createBackup({ backupsDir, writeSnapshot, schemaVersion, appVersion,
  extension = 'dump', now = new Date() }) {
  if (typeof writeSnapshot !== 'function') throw new Error('A consistent snapshot writer is required.');
  await mkdir(backupsDir, { recursive: true });
  const stem = `nec-ledger-${stamp(now)}-schema-${safe(schemaVersion)}`;
  const snapshot = join(backupsDir, `${stem}.${safe(extension)}`);
  const manifest = `${snapshot}.manifest.json`;
  const tempSnapshot = `${snapshot}.tmp`; const tempManifest = `${manifest}.tmp`;
  try {
    await writeSnapshot(tempSnapshot);
    const bytes = await readFile(tempSnapshot);
    if (!bytes.length) throw new Error('Backup snapshot is empty.');
    const metadata = { formatVersion: 1, snapshot: basename(snapshot), createdAt: now.toISOString(),
      appVersion: `${appVersion}`, schemaVersion: `${schemaVersion}`, bytes: bytes.length, sha256: sha256(bytes) };
    await writeFile(tempManifest, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
    await rename(tempSnapshot, snapshot); await rename(tempManifest, manifest);
    return { snapshot, manifest, metadata };
  } catch (error) {
    await Promise.allSettled([rm(tempSnapshot, { force: true }), rm(tempManifest, { force: true })]);
    throw error;
  }
}

export async function verifyBackup(snapshot, manifest = `${snapshot}.manifest.json`) {
  const [bytes, raw, info] = await Promise.all([readFile(snapshot), readFile(manifest, 'utf8'), stat(snapshot)]);
  const metadata = JSON.parse(raw);
  const valid = metadata.formatVersion === 1 && metadata.snapshot === basename(snapshot) &&
    metadata.bytes === info.size && metadata.sha256 === sha256(bytes);
  if (!valid) throw new Error('Backup verification failed. Do not restore this snapshot.');
  return metadata;
}

export async function restoreVerifiedBackup({ snapshot, manifest, restoreSnapshot, applicationClosed }) {
  if (!applicationClosed) throw new Error('Close NEC Ledger before restoring a backup.');
  if (typeof restoreSnapshot !== 'function') throw new Error('A restore adapter is required.');
  const metadata = await verifyBackup(snapshot, manifest);
  await restoreSnapshot(snapshot, metadata);
  return metadata;
}
