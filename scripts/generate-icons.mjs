// 生成 MIUI 风格应用图标：SVG → PNG（sharp）→ ICO/ICNS
// 用法: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'src-tauri', 'icons');

const ICON_SVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#55B5FF"/>
      <stop offset="55%" stop-color="#357BFF"/>
      <stop offset="100%" stop-color="#4B5BFF"/>
    </linearGradient>
    <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3E92FF"/>
      <stop offset="100%" stop-color="#4B5BFF"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <ellipse cx="140" cy="70" rx="230" ry="130" fill="#ffffff" opacity="0.16"/>
  <!-- 后方气泡（半透明轮廓层） -->
  <rect x="88" y="112" width="258" height="178" rx="62" fill="#ffffff" opacity="0.38"/>
  <!-- 前方气泡（实心白，带尾巴） -->
  <rect x="162" y="224" width="264" height="180" rx="62" fill="#ffffff"/>
  <path d="M206 396 L198 456 L266 396 Z" fill="#ffffff"/>
  <!-- 双向翻译箭头 -->
  <g stroke="url(#fg)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M212 290 H350"/>
    <path d="M320 260 L352 290 L320 320"/>
    <path d="M378 346 H240"/>
    <path d="M270 316 L238 346 L270 376"/>
  </g>
</svg>`;

async function renderPng(size) {
    return sharp(Buffer.from(ICON_SVG(size)), { density: 300 })
        .resize(size, size)
        .png()
        .toBuffer();
}

// ICO：多尺寸 PNG 条目打包
function buildIco(pngs) {
    const entries = pngs.map(({ size, data }) => ({
        size,
        data,
        header: Buffer.alloc(16),
    }));
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(entries.length, 4);

    let offset = 6 + entries.length * 16;
    for (const e of entries) {
        e.header.writeUInt8(e.size >= 256 ? 0 : e.size, 0); // width
        e.header.writeUInt8(e.size >= 256 ? 0 : e.size, 1); // height
        e.header.writeUInt8(0, 2); // colors
        e.header.writeUInt8(0, 3); // reserved
        e.header.writeUInt16LE(1, 4); // planes
        e.header.writeUInt16LE(32, 6); // bpp
        e.header.writeUInt32LE(e.data.length, 8);
        e.header.writeUInt32LE(offset, 12);
        offset += e.data.length;
    }
    return Buffer.concat([header, ...entries.map((e) => e.header), ...entries.map((e) => e.data)]);
}

// ICNS：PNG 分块（ic07=128, ic08=256, ic09=512）
function buildIcns(pngs) {
    const typeBySize = { 128: 'ic07', 256: 'ic08', 512: 'ic09' };
    const chunks = pngs
        .filter(({ size }) => typeBySize[size])
        .map(({ size, data }) => {
            const head = Buffer.alloc(8);
            head.write(typeBySize[size], 0, 'ascii');
            head.writeUInt32BE(data.length + 8, 4);
            return Buffer.concat([head, data]);
        });
    const body = Buffer.concat(chunks);
    const magic = Buffer.alloc(8);
    magic.write('icns', 0, 'ascii');
    magic.writeUInt32BE(body.length + 8, 4);
    return Buffer.concat([magic, body]);
}

const png = {};
for (const size of [16, 30, 32, 44, 48, 50, 64, 71, 89, 107, 128, 142, 150, 256, 284, 310, 512]) {
    png[size] = await renderPng(size);
    console.log(`rendered ${size}px`);
}

mkdirSync(iconsDir, { recursive: true });

const fileMap = {
    '32x32.png': 32,
    '64x64.png': 64,
    '128x128.png': 128,
    '128x128@2x.png': 256,
    'icon.png': 512,
    'Square30x30Logo.png': 30,
    'Square44x44Logo.png': 44,
    'Square71x71Logo.png': 71,
    'Square89x89Logo.png': 89,
    'Square107x107Logo.png': 107,
    'Square142x142Logo.png': 142,
    'Square150x150Logo.png': 150,
    'Square284x284Logo.png': 284,
    'Square310x310Logo.png': 310,
    'StoreLogo.png': 50,
};
for (const [name, size] of Object.entries(fileMap)) {
    writeFileSync(join(iconsDir, name), png[size]);
}

writeFileSync(
    join(iconsDir, 'icon.ico'),
    buildIco([16, 32, 48, 64, 128, 256].map((size) => ({ size, data: png[size] })))
);
writeFileSync(
    join(iconsDir, 'icon.icns'),
    buildIcns([128, 256, 512].map((size) => ({ size, data: png[size] })))
);
writeFileSync(join(root, 'src', 'assets', 'app-icon.png'), png[512]);

console.log('done: all icons written');
