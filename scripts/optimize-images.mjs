import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDirectory = path.join(root, "public", "images");
const outputDirectory = path.join(sourceDirectory, "optimized");
const assets = [
  { name: "about_us_1.jpg", width: 1600 },
  { name: "about_us_2.jpg", width: 1400 },
  { name: "about_us_3.jpg", width: 1000 },
  { name: "campground.jpg", width: 1600 },
  { name: "conference_flyer.png", width: 1600, quality: 96, nearLossless: true },
  { name: "crowd-bw.jpg", width: 1600 },
  { name: "crowd-bw_2.jpg", width: 1920 },
  { name: "crowd-bw_3.jpg", width: 1920 },
  { name: "linda_paul_rika.jpg", width: 1200 },
  { name: "pst_paul_rika_1.jpg", width: 1200 },
  { name: "pst_paul_rika_2.jpg", width: 1200 },
];

await mkdir(outputDirectory, { recursive: true });
let sourceTotal = 0;
let optimizedTotal = 0;

for (const asset of assets) {
  const source = path.join(sourceDirectory, asset.name);
  const destinationName = `${path.parse(asset.name).name}.webp`;
  const destination = path.join(outputDirectory, destinationName);
  const sourceBytes = (await stat(source)).size;
  const result = await sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width: asset.width, withoutEnlargement: true })
    .webp({
      quality: asset.quality ?? 84,
      effort: 6,
      smartSubsample: true,
      nearLossless: asset.nearLossless ?? false,
    })
    .toFile(destination);

  sourceTotal += sourceBytes;
  optimizedTotal += result.size;
  console.log(`${asset.name}: ${sourceBytes} -> ${result.size} bytes (${result.width}x${result.height})`);
}

console.log(`Total: ${sourceTotal} -> ${optimizedTotal} bytes (${((1 - optimizedTotal / sourceTotal) * 100).toFixed(1)}% smaller)`);
