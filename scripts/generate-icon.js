/**
 * Icon Generator for Ableton OSC Chain Selector
 * Creates a PNG icon that represents chain/rack selection
 * Design: Stylized chain links with active selection highlight
 * Uses pure JavaScript with Buffer manipulation (no external dependencies)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper: smooth distance for rounded rectangles
function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(px - cx) - hw + r, 0);
  const dy = Math.max(Math.abs(py - cy) - hh + r, 0);
  return Math.sqrt(dx * dx + dy * dy) - r;
}

// Helper: blend colors
function blend(c1, c2, t) {
  t = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function createIconData(size) {
  const data = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;

  // ── Colour palette (matching the app's CSS variables) ──
  const bgPrimary   = { r: 26,  g: 26,  b: 46 };  // #1a1a2e
  const bgSecondary = { r: 22,  g: 33,  b: 62 };  // #16213e
  const bgSurface   = { r: 15,  g: 52,  b: 96 };  // #0f3460
  const accent      = { r: 79,  g: 195, b: 247 }; // #4fc3f7
  const accentDim   = { r: 33,  g: 150, b: 243 }; // #2196f3
  const textMuted   = { r: 85,  g: 85,  b: 119 }; // #555577
  const border      = { r: 42,  g: 42,  b: 74 };  // #2a2a4a
  const white       = { r: 232, g: 232, b: 240 }; // #e8e8f0

  // Icon boundary – circular mask
  const iconRadius = size * 0.47;

  // Chain item bars config
  const barCount = 5;
  const activeBar = 2; // 0-indexed, middle bar is active
  const barHeight = size * 0.072;
  const barSpacing = size * 0.022;
  const totalBarsHeight = barCount * barHeight + (barCount - 1) * barSpacing;
  const barsStartY = cy - totalBarsHeight / 2;
  const barLeftX = size * 0.18;
  const barRightX = size * 0.82;
  const barRadius = size * 0.028;

  // Left accent strip width
  const stripWidth = size * 0.03;

  // Chain link icon in center-top area
  const linkCenterY = cy - size * 0.30;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const index = (y * size + x) * 4;

      if (distance > iconRadius) {
        // Outside – transparent
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
        continue;
      }

      // Anti-alias on edge
      let alpha = 255;
      if (distance > iconRadius - 1.5) {
        alpha = Math.round(255 * Math.max(0, (iconRadius - distance) / 1.5));
      }

      // Default: background with subtle radial gradient
      const bgGrad = Math.min(1, distance / iconRadius);
      let col = blend(bgSecondary, bgPrimary, bgGrad * 0.6);

      // ── Draw chain item bars ──
      for (let i = 0; i < barCount; i++) {
        const barCY = barsStartY + i * (barHeight + barSpacing) + barHeight / 2;
        const barCX = (barLeftX + barRightX) / 2;
        const barHW = (barRightX - barLeftX) / 2;
        const barHH = barHeight / 2;

        const sdf = roundedRectSDF(x, y, barCX, barCY, barHW, barHH, barRadius);

        if (sdf < 1.5) {
          const barAlpha = sdf < 0 ? 1 : Math.max(0, 1 - sdf / 1.5);
          const isActive = i === activeBar;

          // Left accent strip
          const stripSdf = roundedRectSDF(
            x, y,
            barLeftX + stripWidth / 2, barCY,
            stripWidth / 2, barHH,
            barRadius * 0.5
          );

          let barColor;
          if (isActive) {
            // Active bar: brighter background, cyan border
            if (stripSdf < 0) {
              barColor = accent;
            } else if (sdf < 0) {
              // Subtle inner glow
              const edgeDist = Math.min(
                x - (barLeftX + stripWidth),
                barRightX - x,
                y - (barCY - barHH),
                (barCY + barHH) - y
              );
              const glowT = Math.max(0, 1 - edgeDist / (size * 0.02));
              barColor = blend(
                { r: 28, g: 50, b: 82 },
                accent,
                glowT * 0.4
              );
            } else {
              barColor = col;
            }
          } else {
            // Inactive bar
            if (stripSdf < 0) {
              barColor = border;
            } else if (sdf < 0) {
              barColor = bgSecondary;
            } else {
              barColor = col;
            }
          }

          col = blend(col, barColor, barAlpha);

          // Draw text placeholder lines inside bars (subtle)
          if (sdf < -2) {
            const textLineY = barCY;
            const textLineStartX = barLeftX + stripWidth + size * 0.04;
            const textLineEndX = isActive
              ? barRightX - size * 0.08
              : barRightX - size * 0.15 - (i % 2) * size * 0.08;
            const textLineH = size * 0.012;

            if (
              x >= textLineStartX && x <= textLineEndX &&
              y >= textLineY - textLineH && y <= textLineY + textLineH
            ) {
              const textCol = isActive
                ? blend(white, accent, 0.3)
                : textMuted;
              col = blend(col, textCol, isActive ? 0.7 : 0.35);
            }

            // Small index number placeholder on the right
            if (isActive) {
              const dotCX = barRightX - size * 0.04;
              const dotCY = barCY;
              const dotR = size * 0.015;
              const dotDist = Math.sqrt((x - dotCX) ** 2 + (y - dotCY) ** 2);
              if (dotDist < dotR) {
                col = blend(col, accent, 0.5);
              }
            }
          }

          // Active bar border glow
          if (isActive && sdf > -2 && sdf < 2) {
            const borderT = 1 - Math.abs(sdf) / 2;
            col = blend(col, accent, borderT * 0.7);
          }
        }
      }

      // ── Chain link symbol at top ──
      // Two interlocking oval links, centered above the bars
      const linkScale = size * 0.055;
      const linkGap = size * 0.018;
      const linkThickness = size * 0.016;

      // Left link
      const link1CX = cx - linkGap;
      const link1CY = barsStartY - size * 0.09;
      const link1RX = linkScale * 1.1;
      const link1RY = linkScale * 0.7;

      // Right link
      const link2CX = cx + linkGap;
      const link2CY = link1CY;
      const link2RX = linkScale * 1.1;
      const link2RY = linkScale * 0.7;

      // Draw oval links as ring shapes
      for (const link of [
        { lcx: link1CX, lcy: link1CY, lrx: link1RX, lry: link1RY },
        { lcx: link2CX, lcy: link2CY, lrx: link2RX, lry: link2RY },
      ]) {
        const ndx = (x - link.lcx) / link.lrx;
        const ndy = (y - link.lcy) / link.lry;
        const ellipseDist = Math.sqrt(ndx * ndx + ndy * ndy);
        const ringDist = Math.abs(ellipseDist - 1) * Math.min(link.lrx, link.lry);

        if (ringDist < linkThickness) {
          const ringAlpha = Math.max(0, 1 - ringDist / linkThickness);
          const linkColor = blend(accentDim, accent, ringAlpha * 0.5);
          col = blend(col, linkColor, ringAlpha * 0.9);
        }
      }

      // ── Subtle vignette overlay ──
      const vignette = Math.pow(distance / iconRadius, 3) * 0.3;
      col = blend(col, { r: 0, g: 0, b: 0 }, vignette);

      data[index] = col.r;
      data[index + 1] = col.g;
      data[index + 2] = col.b;
      data[index + 3] = alpha;
    }
  }

  return data;
}

// ── PNG encoding helpers ──

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNGChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBytes, data, crc]);
}

function createPNG(width, height, rgbaData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createPNGChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      rawData[offset++] = rgbaData[srcOffset];
      rawData[offset++] = rgbaData[srcOffset + 1];
      rawData[offset++] = rgbaData[srcOffset + 2];
      rawData[offset++] = rgbaData[srcOffset + 3];
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPNGChunk('IDAT', compressed);
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// ── Generate all icon formats ──

const { execSync } = require('child_process');

async function generateIcons() {
  const buildDir = path.join(__dirname, '..', 'build');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Generate 512x512 PNG (fallback)
  const macSize = 512;
  const macIconData = createIconData(macSize);
  const macPngBuffer = createPNG(macSize, macSize, macIconData);
  const pngPath = path.join(buildDir, 'icon.png');
  fs.writeFileSync(pngPath, macPngBuffer);
  console.log(`✅ PNG icon generated: ${pngPath} (${macSize}x${macSize})`);

  // Generate macOS .icns via iconutil
  const iconsetPath = path.join(buildDir, 'icon.iconset');
  if (!fs.existsSync(iconsetPath)) {
    fs.mkdirSync(iconsetPath, { recursive: true });
  }

  const iconSizes = [
    { size: 16,   name: 'icon_16x16.png' },
    { size: 32,   name: 'icon_16x16@2x.png' },
    { size: 32,   name: 'icon_32x32.png' },
    { size: 64,   name: 'icon_32x32@2x.png' },
    { size: 128,  name: 'icon_128x128.png' },
    { size: 256,  name: 'icon_128x128@2x.png' },
    { size: 256,  name: 'icon_256x256.png' },
    { size: 512,  name: 'icon_256x256@2x.png' },
    { size: 512,  name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
  ];

  console.log('📁 Generating macOS iconset...');
  for (const { size, name } of iconSizes) {
    const iconData = createIconData(size);
    const pngBuffer = createPNG(size, size, iconData);
    fs.writeFileSync(path.join(iconsetPath, name), pngBuffer);
    console.log(`   ✅ ${name} (${size}x${size})`);
  }

  try {
    const icnsPath = path.join(buildDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`, { stdio: 'pipe' });
    console.log(`✅ ICNS icon generated: ${icnsPath}`);
    fs.rmSync(iconsetPath, { recursive: true, force: true });
    console.log('   🧹 Cleaned up temporary iconset folder');
  } catch (error) {
    console.error('❌ Failed to generate ICNS:', error.message);
    console.log('   Note: iconutil is only available on macOS.');
    console.log('   The PNG will be used as fallback.');
  }

  // Generate 256x256 PNG → ICO (Windows)
  const winSize = 256;
  const winIconData = createIconData(winSize);
  const winPngBuffer = createPNG(winSize, winSize, winIconData);
  const winPngPath = path.join(buildDir, 'icon-256.png');
  fs.writeFileSync(winPngPath, winPngBuffer);
  console.log(`✅ PNG icon generated: ${winPngPath} (${winSize}x${winSize} for Windows ICO)`);

  try {
    const icoPath = path.join(buildDir, 'icon.ico');
    execSync(`npx png-to-ico "${winPngPath}" > "${icoPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    console.log(`✅ ICO icon generated: ${icoPath}`);
    fs.unlinkSync(winPngPath);
  } catch (error) {
    console.error('❌ Failed to generate ICO:', error.message);
    console.log('   You can manually convert the PNG to ICO using online tools.');
  }

  // Generate 16x16 tray icon
  const traySize = 32;
  const trayIconData = createIconData(traySize);
  const trayPngBuffer = createPNG(traySize, traySize, trayIconData);
  const trayPath = path.join(buildDir, 'tray-icon.png');
  fs.writeFileSync(trayPath, trayPngBuffer);
  console.log(`✅ Tray icon generated: ${trayPath} (${traySize}x${traySize})`);

  console.log('\n🎉 Icons ready for electron-builder!');
  console.log('\nIcon files location:');
  console.log(`  ICNS: ${path.join(buildDir, 'icon.icns')} (macOS)`);
  console.log(`  ICO:  ${path.join(buildDir, 'icon.ico')} (Windows)`);
  console.log(`  PNG:  ${path.join(buildDir, 'icon.png')} (fallback)`);
  console.log(`  Tray: ${path.join(buildDir, 'tray-icon.png')} (system tray)`);
}

generateIcons().catch(console.error);
