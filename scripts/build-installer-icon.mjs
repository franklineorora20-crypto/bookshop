import fs from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const [source, output] = process.argv.slice(2);
if (!source || !output) {
  throw new Error('Provide the source PNG and destination ICO paths.');
}

const sizes = [16, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((size) => sharp(source).resize(size, size).png().toBuffer())
);
await fs.writeFile(output, await pngToIco(pngs));
