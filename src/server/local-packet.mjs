import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Local review staging only. Never promotes unallocated tax into claim calculations.
export async function loadLocalPacket(directory) {
  let packet;
  try { packet=JSON.parse(await readFile(new URL('packet.json',directory),'utf8')); }
  catch(error) { if(error.code==='ENOENT') return null; throw error; }
  const pdf=await readFile(new URL('original.pdf',directory));
  if(createHash('sha256').update(pdf).digest('hex')!==packet.sha256) throw new Error('Source packet checksum mismatch');
  return {
    metadata:packet,
    async page(number) {
      if(!Number.isInteger(number)||number<1||number>packet.pageCount) return null;
      return readFile(new URL(`page-${number}.png`,directory));
    },
    pdf
  };
}
