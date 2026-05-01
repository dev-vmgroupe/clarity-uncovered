import { cp, mkdir, readdir, rm, unlink, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const dist = path.join(root, "dist");
const passthrough = [
  "index.html",
  "styles.css",
  "app.js",
  "package.json",
  "3d",
  "assets",
  "brand",
  "fonts",
  "utils",
  "vendor",
];

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const referenceFiles = ["index.html", "styles.css", "app.js"];
const replacements = new Map();

async function copySource() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const entry of passthrough) {
    await cp(path.join(root, entry), path.join(dist, entry), {
      recursive: true,
      force: true,
    });
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }

  return files;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function optimizeImages() {
  const assetsDir = path.join(dist, "assets");
  const files = await walk(assetsDir);

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (!imageExtensions.has(extension)) continue;

    const relative = toPosix(path.relative(dist, file));
    const image = sharp(file, { animated: false });
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const resizeWidth = width > 2200 ? 2200 : undefined;
    const pipeline = resizeWidth ? image.resize({ width: resizeWidth }) : image;

    if (extension === ".png" && metadata.hasAlpha) {
      await pipeline
        .png({ compressionLevel: 9, effort: 10, palette: true, quality: 88 })
        .toFile(`${file}.tmp`);
      await rm(file);
      await cp(`${file}.tmp`, file);
      await rm(`${file}.tmp`);
      continue;
    }

    if (extension === ".webp") {
      await pipeline.webp({ quality: 82, effort: 6 }).toFile(`${file}.tmp`);
      await rm(file);
      await cp(`${file}.tmp`, file);
      await rm(`${file}.tmp`);
      continue;
    }

    const webpPath = file.replace(/\.(png|jpe?g)$/i, ".webp");
    const webpRelative = toPosix(path.relative(dist, webpPath));
    await pipeline.webp({ quality: 82, effort: 6 }).toFile(webpPath);

    if (webpPath !== file) {
      replacements.set(relative, webpRelative);
      replacements.set(`./${relative}`, `./${webpRelative}`);
      replacements.set(`/${relative}`, `/${webpRelative}`);
      await unlink(file);
    }
  }
}

async function rewriteReferences() {
  if (!replacements.size) return;

  for (const file of referenceFiles) {
    const filePath = path.join(dist, file);
    let contents = await readFile(filePath, "utf8");

    for (const [from, to] of replacements) {
      contents = contents.split(from).join(to);
    }

    await writeFile(filePath, contents);
  }
}

async function removeUnreferencedSourceImages() {
  const assetsDir = path.join(dist, "assets");
  const entries = await readdir(assetsDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => rm(path.join(assetsDir, entry.name))),
  );
}

await copySource();
await optimizeImages();
await rewriteReferences();
await removeUnreferencedSourceImages();

console.log("Built optimized GitHub Pages artifact in dist/");
