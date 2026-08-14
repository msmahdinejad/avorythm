import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.store-preview');

await rm(output, {recursive: true, force: true});
await cp(join(root, 'extension'), output, {recursive: true});
await mkdir(join(output, 'store-backgrounds'), {recursive: true});

for (const locale of ['en', 'fa']) {
  await cp(
    join(root, 'docs', 'store-assets', locale, 'app-live-workspace.jpg'),
    join(output, 'store-backgrounds', `${locale}.jpg`),
  );
}

const popupPath = join(output, 'popup.html');
const popup = await readFile(popupPath, 'utf8');
await writeFile(
  popupPath,
  popup
    .replace('</head>', '<link rel="stylesheet" href="store-preview.css?v=3"></head>')
    .replace('<script type="module" src="popup.js"></script>', '<script src="store-preview.js?v=1"></script><script type="module" src="popup.js?v=1"></script>'),
  'utf8',
);

for (const scriptName of ['popup.js', 'content.js']) {
  const scriptPath = join(output, scriptName);
  const script = await readFile(scriptPath, 'utf8');
  await writeFile(
    scriptPath,
    script
      .replaceAll('chrome.', 'globalThis.__previewChrome.')
      .replace("'./core.mjs'", "'./core.js'"),
    'utf8',
  );
}
await cp(join(output, 'core.mjs'), join(output, 'core.js'));

await cp(join(root, 'scripts', 'store-preview', 'store-preview.js'), join(output, 'store-preview.js'));
await cp(join(root, 'scripts', 'store-preview', 'store-preview.css'), join(output, 'store-preview.css'));
await cp(join(root, 'scripts', 'store-preview', 'overlay.html'), join(output, 'overlay.html'));
await cp(join(root, 'scripts', 'store-preview', 'promo.html'), join(output, 'promo.html'));

console.log(`Prepared the real Lingora UI preview at ${output}`);
