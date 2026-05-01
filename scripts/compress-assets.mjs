import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = path.join(root, "assets");
const outputDir = path.join(sourceDir, "compressed");

const jobs = [
  {
    source: "Screenshot 2026-05-01 at 2.19.29 PM.png",
    output: "manifesto-device.webp",
    width: 1200,
    quality: 82,
  },
  {
    source: "Screenshot 2026-05-01 at 2.19.38 PM.png",
    output: "manifesto-face.webp",
    width: 1200,
    quality: 82,
  },
  {
    source: "Screenshot 2026-05-01 at 2.20.01 PM.png",
    output: "manifesto-detail.webp",
    width: 1000,
    quality: 82,
  },
  {
    source: "young.png",
    output: "young.webp",
    width: 1400,
    quality: 84,
  },
  {
    source: "two.png",
    output: "two.webp",
    width: 1400,
    quality: 84,
  },
  {
    source: "mature.png",
    output: "mature.webp",
    width: 1400,
    quality: 84,
  },
];

async function compressWebp({ source, output, width, quality }) {
  await sharp(path.join(sourceDir, source), { animated: false })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(path.join(outputDir, output));
}

async function compressHeroic() {
  await sharp(path.join(sourceDir, "heroic.png"), { animated: false })
    .resize({ width: 600, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90 })
    .toFile(path.join(outputDir, "heroic.png"));
}

await mkdir(outputDir, { recursive: true });
await Promise.all(jobs.map(compressWebp));
await compressHeroic();

console.log(`Compressed ${jobs.length + 1} assets into ${path.relative(root, outputDir)}/`);
