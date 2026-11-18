/** Renders public/icons/icon.svg into the PNG sizes the PWA manifest needs. Run: npm run icons */
import sharp from "sharp";

const src = "public/icons/icon.svg";
const out = (name: string) => `public/icons/${name}`;

async function main() {
  await sharp(src).resize(192, 192).png().toFile(out("icon-192.png"));
  await sharp(src).resize(512, 512).png().toFile(out("icon-512.png"));
  await sharp(src).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
  // Maskable: shrink into the 80% safe zone on a full-bleed brand background.
  const inner = await sharp(src).resize(400, 400).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0b6b3a" } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(out("maskable-512.png"));
  console.log("Icons written to public/icons/");
}

main();
