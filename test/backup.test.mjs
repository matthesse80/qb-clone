import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createBackup, restoreVerifiedBackup, verifyBackup } from '../src/production/backup.mjs';

test('backup is atomic, checksummed and restorable only after verification',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nec-backup-'));let restored=false;
  try{
    const result=await createBackup({backupsDir:dir,schemaVersion:'002',appVersion:'0.2.0',extension:'sql',
      now:new Date('2026-10-14T02:00:00Z'),writeSnapshot:path=>writeFile(path,'consistent database snapshot')});
    assert.equal((await verifyBackup(result.snapshot)).schemaVersion,'002');
    await assert.rejects(restoreVerifiedBackup({snapshot:result.snapshot,restoreSnapshot:async()=>{},applicationClosed:false}),/Close/);
    await restoreVerifiedBackup({snapshot:result.snapshot,restoreSnapshot:async path=>{restored=(await readFile(path,'utf8')).includes('consistent');},applicationClosed:true});
    assert.equal(restored,true);
    await writeFile(result.snapshot,'tampered');
    await assert.rejects(verifyBackup(result.snapshot),/verification failed/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('failed snapshot creation leaves no completed backup',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nec-backup-fail-'));
  try{
    await assert.rejects(createBackup({backupsDir:dir,schemaVersion:'002',appVersion:'0.2.0',
      writeSnapshot:async()=>{throw new Error('dump failed');}}),/dump failed/);
    assert.deepEqual(await readdir(dir),[]);
  }finally{await rm(dir,{recursive:true,force:true});}
});
