import { loadLocalPacket } from './local-packet.mjs';
import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { embeddedDatabase } from './database.mjs';
import { Workspace } from './workspace.mjs';
import { seedPreview, PREVIEW_SUBJECT } from './preview-data.mjs';
import { createWorkspaceServer } from './http.mjs';
if(process.env.NODE_ENV==='production') throw new Error('The synthetic preview cannot run in production.');
const path=new URL('../../.preview/database/',import.meta.url);
await mkdir(new URL('../../.preview/',import.meta.url),{recursive:true});
const db=new PGlite(fileURLToPath(path));
await seedPreview(db);
const workspace=new Workspace(embeddedDatabase(db),{preview:true});
const packet=await loadLocalPacket(new URL('../../.preview/packet/',import.meta.url));
const server=createWorkspaceServer({workspace,packet,preview:true,authenticate:async()=>PREVIEW_SUBJECT});
server.listen(Number(process.env.PORT??4173),'127.0.0.1',()=>console.log(`NEC Ledger synthetic preview: http://127.0.0.1:${server.address().port}/workspace.html`));
async function close(){server.close(async()=>{await db.close();process.exit(0);});}
process.on('SIGINT',close); process.on('SIGTERM',close);
