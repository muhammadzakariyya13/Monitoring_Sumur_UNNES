// Rasterize the original SIMARA symbol without changing its proportions.
import sharp from "sharp";
import { writeFile, copyFile } from "node:fs/promises";
async function icon(size) {
  const symbol = await sharp("public/logo-simara.svg")
    .resize(Math.round(size * .76), Math.round(size * .76), { fit: "inside" })
    .png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: symbol, gravity: "centre" }]).png().toBuffer();
}
for (const size of [192, 512]) await writeFile(`public/icon-${size}.png`, await icon(size));
await copyFile("public/logo-simara.svg", "public/icon.svg");
const png = await icon(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([header, png]));
