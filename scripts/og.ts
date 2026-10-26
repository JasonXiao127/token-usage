import fs from 'node:fs';
import zlib from 'node:zlib';

const W = 1200, H = 630;
// simple scene: dark bg, teal/violet glow circles, white bar chart bars
const px = Buffer.alloc(W * H * 3);
const bg: [number, number, number] = [10, 12, 20];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    // vertical gradient
    const t = y / H;
    let r = bg[0] + t * 14, g = bg[1] + t * 10, b = bg[2] + t * 26;
    // teal glow left
    const d1 = Math.hypot(x - 260, y - 220);
    const gl1 = Math.max(0, 1 - d1 / 420);
    r += gl1 * 13 * 0.35; g += gl1 * 148 * 0.35; b += gl1 * 136 * 0.35;
    // violet glow right
    const d2 = Math.hypot(x - 950, y - 420);
    const gl2 = Math.max(0, 1 - d2 / 460);
    r += gl2 * 124 * 0.32; g += gl2 * 58 * 0.32; b += gl2 * 237 * 0.32;
    px[i] = Math.min(255, r); px[i + 1] = Math.min(255, g); px[i + 2] = Math.min(255, b);
  }
}
// bars (white, ascending) bottom area
const bars = [120, 170, 150, 230, 300, 260, 380, 460];
const baseY = 560, bw = 70, gap = 40, x0 = 150;
bars.forEach((h, i) => {
  const x1 = x0 + i * (bw + gap);
  for (let y = baseY - h; y < baseY; y++) {
    for (let x = x1; x < x1 + bw; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const j = (y * W + x) * 3;
      const teal = i < 4;
      px[j] = teal ? 13 : 230; px[j + 1] = teal ? 200 : 230; px[j + 2] = teal ? 190 : 240;
    }
  }
});
// accent line
for (let x = 100; x < 1100; x++) {
  const y = 120;
  const j = (y * W + x) * 3;
  px[j] = 45; px[j + 1] = 212; px[j + 2] = 191;
}

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
