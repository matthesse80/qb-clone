import { createHash, randomUUID } from 'node:crypto';

/** Server-only port. Adapter MUST implement conditional, private, versioned writes.
 * No production cloud SDK is selected in Phase 1. Do not use browser credentials.
 */
export class PrivateDocuments {
  constructor(adapter, authorize) {
    this.adapter = adapter;
    this.authorize = authorize;
  }
  async create({ actorId, caseId, bytes, contentType }) {
    await this.authorize(actorId, caseId, 'write');
    if (!Buffer.isBuffer(bytes) || !bytes.length || !contentType) throw new Error('Nonempty document and content type required');
    const objectKey = `cases/${randomUUID()}/${randomUUID()}`;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const stored = await this.adapter.putNew({ objectKey, bytes, contentType, sha256,
      visibility: 'private', ifNoneMatch: '*' });
    if (!stored?.version || !stored.bucket || !stored.provider) throw new Error('Storage adapter must return immutable version, bucket and provider');
    return { objectKey, objectVersion: stored.version, bucket: stored.bucket, storageProvider: stored.provider,
      sha256, byteLength: bytes.length, contentType };
  }
  async read({ actorId, document }) {
    await this.authorize(actorId, document.caseId, 'read');
    const bytes = await this.adapter.getVersion({ objectKey: document.objectKey, version: document.objectVersion,
      bucket: document.bucket, provider: document.storageProvider });
    if (createHash('sha256').update(bytes).digest('hex') !== document.sha256) throw new Error('Document checksum mismatch');
    return bytes;
  }
}
