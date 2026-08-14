import {readFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'store-assets');
const localized = new Map([
  ['screenshot-01-live-extension.jpg', [640, 400]],
  ['screenshot-02-output-mixer.jpg', [640, 400]],
  ['screenshot-03-floating-captions.jpg', [640, 400]],
  ['small-promo-440x280.jpg', [440, 280]],
  ['marquee-1400x560.jpg', [1400, 560]],
]);

function pngSize(buffer, path) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG file`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function jpegSize(buffer, path) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error(`${path} is not a JPEG file`);
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (startOfFrame.has(marker)) return [buffer.readUInt16BE(offset + 7), buffer.readUInt16BE(offset + 5)];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) break;
    offset += length + 2;
  }
  throw new Error(`${path} has no readable JPEG size marker`);
}

async function assertSize(path, expected) {
  const buffer = await readFile(path);
  const actual = path.endsWith('.png') ? pngSize(buffer, path) : jpegSize(buffer, path);
  if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
    throw new Error(`${path} is ${actual.join('×')}; expected ${expected.join('×')}`);
  }
  console.log(`✓ ${path} (${actual.join('×')})`);
}

await assertSize(join(root, 'icon-128.png'), [128, 128]);
for (const locale of ['en', 'fa']) {
  for (const [name, size] of localized) await assertSize(join(root, locale, name), size);
}
