import fs from 'node:fs';
import zlib from 'node:zlib';

const W = 1200, H = 630;
// Index palette: cool stone, ink bars, thin blue/amber provenance strips
const px = Buffer.alloc(W * H * 3);
const paper: [number, number, number] = [241, 242, 237];
const rule: [number, number, number] = [201, 207, 199];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    px[i] = paper[0]; px[i + 1] = paper[1]; px[i + 2] = paper[2];
  }
}
function rect(x0: number, y0: number, w: number, h: number, c: [number, number, number]) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const j = (y * W + x) * 3;
      px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2];
    }
  }
}
// masthead rule + margin rule
rect(80, 120, 1040, 3, [22, 27, 24]);
rect(80, 150, 3, 400, [201, 207, 199]);
// combined-token bars in ink; each sits on a thin source-provenance strip
const ink: [number, number, number] = [22, 27, 24];
const blue: [number, number, number] = [30, 78, 140];
const amber: [number, number, number] = [165, 90, 27];
const baseY = 530;
const groups: Array<[number, number, number]> = [[150, 300, 0.58], [330, 210, 0.72], [510, 150, 0.41], [690, 110, 0.35], [870, 80, 0.22]];
for (const [x, h, ocFrac] of groups) {
  rect(x, baseY - h, 102, h, ink);
  const ocW = Math.round(102 * ocFrac);
  rect(x, baseY, ocW, 10, blue);
  rect(x + ocW, baseY, 102 - ocW, 10, amber);
}
// baseline
rect(120, baseY, 960, 2, [22, 27, 24]);

function crc32(buf: Buffer): number {
  let table: number[] | null = (crc32 as unknown as { t?: number[] }).t || null;
  if (!table) {
    table = new Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as unknown as { t: number[] }).t = table;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/og.png', png);
console.log('og.png written', png.length, 'bytes');
