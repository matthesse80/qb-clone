import test from 'node:test';
import assert from 'node:assert/strict';
import { PrivateDocuments } from '../src/storage/private-documents.mjs';
test('private storage authorizes every operation, uses new keys and verifies content', async () => {
  const objects = new Map();
  const authorize = async actor => { if (actor !== 'matt') throw new Error('Unauthorized'); };
  const adapter = {
    async putNew(input) {
      assert.equal(input.visibility, 'private'); assert.equal(input.ifNoneMatch, '*');
      assert.equal(objects.has(input.objectKey), false);
      objects.set(input.objectKey, input.bytes);
      return { provider: 'test', bucket: 'test-private', version: '1' };
    },
    async getVersion({ objectKey, version }) { assert.equal(version, '1'); return objects.get(objectKey); }
  };
  const storage = new PrivateDocuments(adapter, authorize);
  const input = { actorId: 'matt', caseId: 'dq', bytes: Buffer.from('signed source'), contentType: 'application/pdf' };
  const a = await storage.create(input); const b = await storage.create(input);
  assert.notEqual(a.objectKey, b.objectKey);
  assert.equal((await storage.read({ actorId: 'matt', document: { ...a, caseId: 'dq' } })).toString(), 'signed source');
  await assert.rejects(storage.create({ ...input, actorId: 'outsider' }), /Unauthorized/);
  await assert.rejects(storage.read({ actorId: 'outsider', document: { ...a, caseId: 'dq' } }), /Unauthorized/);
  objects.set(a.objectKey, Buffer.from('tampered'));
  await assert.rejects(storage.read({ actorId: 'matt', document: { ...a, caseId: 'dq' } }), /checksum/);
});
