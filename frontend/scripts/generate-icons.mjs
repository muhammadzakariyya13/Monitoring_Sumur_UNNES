// Turunkan ikon PNG dari aset SVG milik proyek untuk manifest dan Apple touch icon.
import sharp from "sharp";
await Promise.all(
  [192, 512].map((size) =>
    sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`),
  ),
);
