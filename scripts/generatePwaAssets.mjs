import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#043a2c"/>
      <stop offset="50%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="pageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1efe9"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- App Background (Rounded Squircle for Standalone View) -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>

  <!-- Subtle Decorative Outer Ring -->
  <circle cx="256" cy="256" r="218" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.25" stroke-dasharray="8 8"/>

  <!-- Centered Icon Art Group -->
  <g filter="url(#glow)">
    <!-- Crescent & Star (Sacred Symbol at Top) -->
    <path d="M 256 90 A 24 24 0 0 0 270 126 A 30 30 0 1 1 256 90 Z" fill="url(#goldGrad)"/>
    <polygon points="274,104 277,112 285,112 278,117 281,125 274,120 267,125 270,117 263,112 271,112" fill="url(#goldGrad)"/>

    <!-- Rehal / Bookstand Base -->
    <path d="M 120 375 L 210 295 L 256 325 L 302 295 L 392 375 L 365 390 L 256 348 L 147 390 Z" fill="url(#goldGrad)" opacity="0.9"/>

    <!-- Left Book Page (White Parchment) -->
    <path d="M 256 310 C 210 285 140 280 96 300 L 96 195 C 140 175 210 180 256 205 Z" fill="url(#pageGrad)"/>
    <!-- Left Page Trim/Border -->
    <path d="M 96 195 C 140 175 210 180 256 205" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
    <path d="M 96 300 C 140 280 210 285 256 310" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
    <line x1="96" y1="195" x2="96" y2="300" stroke="url(#goldGrad)" stroke-width="4"/>

    <!-- Right Book Page (White Parchment) -->
    <path d="M 256 310 C 302 285 372 280 416 300 L 416 195 C 372 175 302 180 256 205 Z" fill="url(#pageGrad)"/>
    <!-- Right Page Trim/Border -->
    <path d="M 256 205 C 302 180 372 175 416 195" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
    <path d="M 256 310 C 302 285 372 280 416 300" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
    <line x1="416" y1="195" x2="416" y2="300" stroke="url(#goldGrad)" stroke-width="4"/>

    <!-- Book Spine Center Binding -->
    <path d="M 252 205 L 260 205 L 260 310 L 252 310 Z" fill="#043a2c"/>

    <!-- Golden Ribbon Bookmark Hanging Down -->
    <path d="M 253 205 Q 256 280 256 360 L 264 348 L 272 360 Q 268 280 265 205 Z" fill="url(#goldGrad)"/>

    <!-- Calligraphy-like Text Lines on Pages -->
    <!-- Left Lines -->
    <line x1="126" y1="218" x2="230" y2="228" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="120" y1="238" x2="232" y2="248" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="124" y1="258" x2="230" y2="268" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="130" y1="278" x2="226" y2="288" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>

    <!-- Right Lines -->
    <line x1="282" y1="228" x2="386" y2="218" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="280" y1="248" x2="392" y2="238" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="282" y1="268" x2="388" y2="258" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <line x1="286" y1="288" x2="382" y2="278" stroke="#059669" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgIcon, 'utf8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon, 'utf8');
console.log('Generated SVG icons');

// 2. PNG Rasterization Engine in pure Node.js
function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  return table;
}
const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function createChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0);
  t.copy(b, 4);
  data.copy(b, 8);
  b.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return b;
}
function encodePNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter 0
    rgbaBuffer.copy(scanlines, dstOffset, srcOffset, srcOffset + width * 4);
    dstOffset += width * 4;
    srcOffset += width * 4;
  }
  const idat = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([sig, createChunk('IHDR', ihdr), createChunk('IDAT', idat), createChunk('IEND', Buffer.alloc(0))]);
}

// Draw Quran App Icon to RGBA buffer
function renderQuranIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size; // 0..1
      const ny = y / size; // 0..1

      // 1. Background: Emerald Gradient (#043a2c to #059669)
      const gradT = (nx + ny) * 0.5;
      let r = Math.round(4 + gradT * (5 - 4));
      let g = Math.round(58 + gradT * (150 - 58));
      let b = Math.round(44 + gradT * (105 - 44));
      let a = 255;

      // Rounded squircle mask if not maskable (maskable covers 100% of buffer)
      if (!isMaskable) {
        const cornerR = 0.22; // 22% corner radius
        const cx = Math.abs(nx - 0.5);
        const cy = Math.abs(ny - 0.5);
        if (cx > 0.5 - cornerR && cy > 0.5 - cornerR) {
          const dx = cx - (0.5 - cornerR);
          const dy = cy - (0.5 - cornerR);
          if (dx * dx + dy * dy > cornerR * cornerR) {
            a = 0; // transparent outside rounded corner
          }
        }
      }

      if (a > 0) {
        // Safe area scaling for maskable icons (center book slightly more)
        const artScale = isMaskable ? 0.72 : 0.88;
        const artOffsetX = (1 - artScale) * 0.5;
        const artOffsetY = (1 - artScale) * 0.5;
        const sx = (nx - artOffsetX) / artScale; // normalized 0..1 inside art box
        const sy = (ny - artOffsetY) / artScale;

        if (sx >= 0 && sx <= 1 && sy >= 0 && sy <= 1) {
          const px = sx * 512;
          const py = sy * 512;

          // Crescent & Star (py: 85..135, px: 240..290)
          const cdx = px - 262;
          const cdy = py - 110;
          if (cdx * cdx + cdy * cdy <= 20 * 20 && (cdx + 4) * (cdx + 4) + cdy * cdy >= 10 * 10) {
            // Golden crescent
            r = 251; g = 191; b = 36;
          }
          const sdx = px - 275;
          const sdy = py - 110;
          if (sdx * sdx + sdy * sdy <= 6 * 6) {
            // Golden star
            r = 254; g = 240; b = 138;
          }

          // Open Quran Book pages
          // Left page: px 100..256, py 190..305
          if (px >= 100 && px <= 256) {
            const pageTop = 195 + (px - 100) * 0.06;
            const pageBottom = 300 + (px - 100) * 0.06;
            if (py >= pageTop && py <= pageBottom) {
              // Parchment page
              r = 248; g = 247; b = 244;
              // Gold border
              if (px <= 104 || py <= pageTop + 3 || py >= pageBottom - 3) {
                r = 217; g = 119; b = 6;
              }
              // Green text lines
              const lineRelY = py - pageTop;
              if ((lineRelY >= 20 && lineRelY <= 24) ||
                  (lineRelY >= 40 && lineRelY <= 44) ||
                  (lineRelY >= 60 && lineRelY <= 64) ||
                  (lineRelY >= 80 && lineRelY <= 84)) {
                if (px >= 120 && px <= 236) {
                  r = 5; g = 150; b = 105; // Emerald text
                }
              }
            }
          }

          // Right page: px 256..412, py 190..305
          if (px >= 256 && px <= 412) {
            const pageTop = 204 - (px - 256) * 0.06;
            const pageBottom = 309 - (px - 256) * 0.06;
            if (py >= pageTop && py <= pageBottom) {
              // Parchment page
              r = 248; g = 247; b = 244;
              // Gold border
              if (px >= 408 || py <= pageTop + 3 || py >= pageBottom - 3) {
                r = 217; g = 119; b = 6;
              }
              // Green text lines
              const lineRelY = py - pageTop;
              if ((lineRelY >= 20 && lineRelY <= 24) ||
                  (lineRelY >= 40 && lineRelY <= 44) ||
                  (lineRelY >= 60 && lineRelY <= 64) ||
                  (lineRelY >= 80 && lineRelY <= 84)) {
                if (px >= 276 && px <= 392) {
                  r = 5; g = 150; b = 105; // Emerald text
                }
              }
            }
          }

          // Center Spine & Ribbon
          if (px >= 254 && px <= 258 && py >= 195 && py <= 312) {
            r = 4; g = 58; b = 44; // Dark spine
          }
          if (px >= 256 && px <= 262 && py >= 205 && py <= 355) {
            r = 251; g = 191; b = 36; // Golden bookmark ribbon
          }

          // Rehal / Bookstand base legs
          if (py >= 320 && py <= 385) {
            const legDist = Math.abs(px - 256);
            if ((py >= 335 + legDist * 0.35 && py <= 350 + legDist * 0.35) ||
                (px >= 140 && px <= 372 && py >= 365 && py <= 375)) {
              r = 217; g = 119; b = 6; // Gold wood stand
            }
          }
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return encodePNG(size, size, buf);
}

// Generate PNG files
const pwa192 = renderQuranIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Generated pwa-192x192.png (', pwa192.length, 'bytes)');

const pwa512 = renderQuranIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Generated pwa-512x512.png (', pwa512.length, 'bytes)');

const apple180 = renderQuranIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180);
console.log('Generated apple-touch-icon.png (', apple180.length, 'bytes)');

const maskable512 = renderQuranIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);
console.log('Generated maskable-icon-512x512.png (', maskable512.length, 'bytes)');
