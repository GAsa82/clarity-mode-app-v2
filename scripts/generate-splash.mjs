// Generates branded Apple PWA splash screens (portrait) from public/app-icon.svg.
// Dark background + centered logo mark — font-independent, premium, fast.
// Run: node scripts/generate-splash.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BG = { r: 8, g: 11, b: 18, alpha: 1 }; // #080b12
const iconSvg = readFileSync(resolve(root, "public/app-icon.svg"));

// Common modern Apple device logical/physical portrait sizes (CSS px, dpr).
const DEVICES = [
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 }, // 14 Pro Max / 15 Plus / 15 Pro Max
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 }, // 14 Pro / 15 / 15 Pro
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 }, // 12/13/14
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 }, // 11 Pro Max / XS Max
  { w: 828,  h: 1792, dw: 414, dh: 896, dpr: 2 }, // 11 / XR
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 }, // 11 Pro / X / XS
  { w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3 }, // 8 Plus
  { w: 750,  h: 1334, dw: 375, dh: 667, dpr: 2 }, // 8 / SE2/3
  { w: 1536, h: 2048, dw: 768, dh: 1024, dpr: 2 }, // iPad 9.7
  { w: 1668, h: 2224, dw: 834, dh: 1112, dpr: 2 }, // iPad Pro 10.5
  { w: 1668, h: 2388, dw: 834, dh: 1194, dpr: 2 }, // iPad Pro 11
  { w: 2048, h: 2732, dw: 1024, dh: 1366, dpr: 2 }, // iPad Pro 12.9
];

const outDir = resolve(root, "public/splash");
mkdirSync(outDir, { recursive: true });

const links = [];

for (const d of DEVICES) {
  const logoSize = Math.round(Math.min(d.w, d.h) * 0.36);
  const logo = await sharp(iconSvg).resize(logoSize, logoSize).png().toBuffer();
  const file = `apple-splash-${d.w}-${d.h}.png`;
  await sharp({ create: { width: d.w, height: d.h, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(resolve(outDir, file));

  links.push(
    `<link rel="apple-touch-startup-image" media="screen and (device-width: ${d.dw}px) and (device-height: ${d.dh}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)" href="/splash/${file}">`
  );
  console.log("generated", file);
}

writeFileSync(resolve(outDir, "_links.html"), links.join("\n") + "\n");
console.log(`\n${DEVICES.length} splash screens written to public/splash/`);
console.log("Link tags written to public/splash/_links.html");
