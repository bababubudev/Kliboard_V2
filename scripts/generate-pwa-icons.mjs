import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const source = resolve(root, "design/logo-transparent.png");
const outDir = resolve(root, "public");

const DARK_BG = "#0d0f0f";

async function fitContain(size, background) {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function maskable(size) {
  const safeZone = Math.round(size * 0.8);
  const logo = await sharp(source)
    .resize(safeZone, safeZone, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: DARK_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

await mkdir(outDir, { recursive: true });

const tasks = [
  { name: "icon-192.png", buf: await fitContain(192) },
  { name: "icon-512.png", buf: await fitContain(512) },
  { name: "icon-maskable-512.png", buf: await maskable(512) },
  { name: "apple-touch-icon.png", buf: await fitContain(180, DARK_BG) },
];

for (const { name, buf } of tasks) {
  const path = resolve(outDir, name);
  await sharp(buf).toFile(path);
  console.log(`wrote ${path}`);
}
