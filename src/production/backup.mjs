import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, lstat, mkdir, mkdtemp, open, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const safe = value => `${value}`.replace(/[^A-Za-z0-9._-]/g, '-');
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
async function digest(path) {
  if (!(await lstat(path)).isFile()) throw new Error('Snapshot must be a regular file.');
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256:hash.digest('hex') };
}
async function syncFile(path) {
  const handle = await open(path,'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function createBackup({ backupsDir, writeSnapshot, schemaVersion, appVersion,
  extension = 'dump', now = new Date() }) {
  if (typeof writeSnapshot !== 'function') throw new Error('A consistent snapshot writer is required.');
  await mkdir(backupsDir, { recursive: true, mode:0o700 });
  const stem = `nec-ledger-${stamp(now)}-schema-${safe(schemaVersion)}-${randomUUID()}`;
  const snapshot = join(backupsDir, `${stem}.${safe(extension)}`);
  const manifest = `${snapshot}.manifest.json`;
  const staging = await mkdtemp(join(backupsDir,'.nec-staging-'));
  const tempSnapshot = join(staging,'snapshot'); const tempManifest = join(staging,'manifest');
  let publishedSnapshot = false;
  try {
    await writeSnapshot(tempSnapshot);
    const checksum = await digest(tempSnapshot);
    if (!checksum.bytes) throw new Error('Backup snapshot is empty.');
    const metadata = { formatVersion: 1, snapshot: basename(snapshot), createdAt: now.toISOString(),
      appVersion: `${appVersion}`, schemaVersion: `${schemaVersion}`, ...checksum };
    await writeFile(tempManifest, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx', mode:0o600 });
    await syncFile(tempSnapshot); await syncFile(tempManifest);
    // Same-volume hard links publish complete files without replacing existing ones.
    // The manifest is the completion marker; a snapshot alone is not a valid backup.
    await link(tempSnapshot,snapshot); publishedSnapshot = true;
    await link(tempManifest,manifest);
    return { snapshot, manifest, metadata };
  } catch (error) {
    if (publishedSnapshot) await rm(snapshot,{force:true});
    throw error;
  } finally {
    await rm(staging,{recursive:true,force:true});
  }
}

export async function verifyBackup(snapshot, manifest = `${snapshot}.manifest.json`) {
  const [checksum, raw] = await Promise.all([digest(snapshot), readFile(manifest, 'utf8')]);
  const metadata = JSON.parse(raw);
  const valid = metadata.formatVersion === 1 && metadata.snapshot === basename(snapshot) &&
    checksum.bytes > 0 && metadata.bytes === checksum.bytes && metadata.sha256 === checksum.sha256;
  if (!valid) throw new Error('Backup verification failed. Do not restore this snapshot.');
  return metadata;
}

export async function restoreVerifiedBackup({ snapshot, manifest, restoreSnapshot, applicationClosed }) {
  if (applicationClosed !== true) throw new Error('Close NEC Ledger before restoring a backup.');
  if (typeof restoreSnapshot !== 'function') throw new Error('A restore adapter is required.');
  const metadata = await verifyBackup(snapshot, manifest);
  await restoreSnapshot(snapshot, metadata);
  return metadata;
}
