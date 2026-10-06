// i18n consistency checker for Avorythm.
//
// Validates that every UI locale is complete across all four i18n entry
// points (desktop app, help page, audio guide, browser extension) and that
// the Chrome extension _locales directory covers every manifest message key.
//
// Run:  node scripts/check_i18n.mjs
// Exit code 0 = all checks pass; 1 = issues found.

import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

let failures = 0;
const fail = (msg) => { console.error(`  ✖ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✔ ${msg}`);

// ── Expected locale set ────────────────────────────────────────────────
// Every i18n entry point must support exactly these locales.  Add a new
// language here once and the checker will flag every dictionary that is
// still missing it.
const EXPECTED_LOCALES = ['fa', 'en', 'zh-Hans'];

// ── 1. JS dictionary key alignment ─────────────────────────────────────
// Each file below embeds a JS dictionary object (messages/copy) whose
// top-level keys are locale codes.  Values are objects whose keys are
// translation string identifiers.  Every locale block must expose the same
// set of identifier keys.
//
// We extract keys with a regex rather than eval'ing the source so the
// checker runs in pure Node without loading chrome APIs or the DOM.

/**
 * Extract the set of translation-key names from a single locale block inside
 * a JS dictionary literal.  `blockSrc` is the text between the opening `{`
 * and the matching closing `}` of one locale entry (e.g. the `fa: { … }`
 * arm of `messages`).  Keys like `navLive: '...'` or `selectedCount: (c)=>…`
 * are captured; nested objects/braces are ignored.
 */
export function extractKeys(blockSrc) {
  const keys = new Set();
  // Match `identifier:` or `'identifier':` at the start of a key-value pair.
  // We walk the string tracking brace depth so nested objects are skipped.
  let depth = 0;
  let i = 0;
  while (i < blockSrc.length) {
    const ch = blockSrc[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }
    if (depth === 0) {
      // Try to match a key at this position.
      const m = blockSrc.slice(i).match(/^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][A-Za-z0-9_$]*))\s*:/);
      if (m) {
        keys.add(m[1] ?? m[2] ?? m[3]);
        // Skip past the key and its value until the next top-level comma.
        i += m[0].length;
        // Skip the value: advance until top-level comma or end.
        while (i < blockSrc.length) {
          const c = blockSrc[i];
          if (c === '{') { depth++; i++; continue; }
          if (c === '}') { depth--; i++; continue; }
          if (c === ',' && depth === 0) { i++; break; }
          i++;
        }
        continue;
      }
    }
    i++;
  }
  return keys;
}

/**
 * Given the full source of a JS file and the variable name of the dictionary
 * (e.g. `messages` or `copy`), return a Map<locale, Set<key>>.
 * Handles both `fa: {…}` and `'zh-Hans': {…}` key styles.
 */
export function parseDictionary(src, varName, expectedLocales = EXPECTED_LOCALES) {
  const result = new Map();
  // Match `varName = {` … `};`  (the top-level dictionary assignment).
  const dictStart = src.indexOf(`${varName} = {`);
  if (dictStart === -1) return result;
  const dictBody = src.slice(dictStart);

  for (const locale of expectedLocales) {
    // Find the locale arm: either `fa: {` or `'zh-Hans': {`.
    const patterns = [
      new RegExp(`(^|\\n)\\s*${locale}:\\s*\\{`),
      new RegExp(`(^|\\n)\\s*'${locale}':\\s*\\{`),
    ];
    let armStart = -1;
    for (const re of patterns) {
      const m = dictBody.match(re);
      if (m) { armStart = m.index + m[0].length; break; }
    }
    if (armStart === -1) continue;

    // Walk to find the matching closing brace.
    let depth = 1;
    let j = armStart;
    while (j < dictBody.length && depth > 0) {
      if (dictBody[j] === '{') depth++;
      else if (dictBody[j] === '}') depth--;
      j++;
    }
    const blockSrc = dictBody.slice(armStart, j - 1);
    result.set(locale, extractKeys(blockSrc));
  }

  // Also collect standalone assignments like `messages.fa.projectHomepage = '…'`.
  const standaloneRe = new RegExp(
    `${varName}(?:\\.([A-Za-z][A-Za-z0-9_-]*)|\\[['"]([^'"]+)['"]\\])\\s*\\.\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\s*=`,
    'g'
  );
  let m;
  while ((m = standaloneRe.exec(src)) !== null) {
    const locale = m[1] || m[2];
    const key = m[3];
    if (expectedLocales.includes(locale)) {
      if (!result.has(locale)) result.set(locale, new Set());
      result.get(locale).add(key);
    }
  }

  return result;
}

function checkJsDictionary(filePath, varName) {
  console.log(`\n📄 ${filePath} (${varName})`);
  const src = read(filePath);
  const dict = parseDictionary(src, varName);

  const foundLocales = [...dict.keys()].sort();
  const missingLocales = EXPECTED_LOCALES.filter((l) => !dict.has(l));
  if (missingLocales.length) {
    fail(`Missing locale block(s): ${missingLocales.join(', ')}`);
  } else {
    ok(`All ${EXPECTED_LOCALES.length} locales present: ${foundLocales.join(', ')}`);
  }

  // Compare key sets across locales.
  const refLocale = EXPECTED_LOCALES.find((l) => dict.has(l));
  if (!refLocale) return;
  const refKeys = dict.get(refLocale);
  for (const locale of EXPECTED_LOCALES) {
    if (!dict.has(locale)) continue;
    const keys = dict.get(locale);
    const missing = [...refKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !refKeys.has(k));
    if (missing.length) fail(`${locale}: missing ${missing.length} key(s): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`);
    if (extra.length) fail(`${locale}: ${extra.length} extra key(s): ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? '…' : ''}`);
    if (!missing.length && !extra.length) ok(`${locale}: ${keys.size} keys aligned with ${refLocale}`);
  }
}

// ── 2. HTML data-attribute completeness ────────────────────────────────
// help.html and audio-guide.html use data-en / data-fa / data-zh-hans
// attributes on elements.  Every translated element must have all three.

export function findHtmlDataAttributeIssues(src) {
  const attrs = ['data-en', 'data-fa', 'data-zh-hans'];
  const issues = [];
  for (const match of src.matchAll(/<[a-z][^>]*>/giu)) {
    const tag = match[0];
    const present = attrs.filter((attr) => new RegExp(`\\b${attr}\\s*=`, 'iu').test(tag));
    if (!present.length || present.length === attrs.length) continue;
    issues.push({tag, missing: attrs.filter((attr) => !present.includes(attr))});
  }
  return issues;
}

function checkHtmlDataAttrs(filePath, anchorAttr) {
  console.log(`\n📄 ${filePath} (data-* attributes)`);
  const src = read(filePath);

  const issues = findHtmlDataAttributeIssues(src);
  if (!issues.length) ok('Every translated element has data-en, data-fa, and data-zh-hans');
  else issues.forEach(({tag, missing}) => fail(`Translated element is missing ${missing.join(', ')}: ${tag.slice(0, 120)}`));
}

// ── 3. Chrome extension _locales completeness ──────────────────────────
// Every _locales/<lang>/messages.json must contain every __MSG_*__ key
// referenced in manifest.json.  Also verifies a _locales dir exists for
// each expected locale (fa→fa, en→en, zh-Hans→zh_CN).

function checkExtensionLocales() {
  console.log('\n📄 extension/_locales/ (Chrome i18n)');
  const manifest = JSON.parse(read('extension/manifest.json'));

  // Extract all __MSG_key__ references from manifest.
  const msgKeys = new Set();
  const msgRe = /__MSG_(\w+)__/g;
  let m;
  const manifestSrc = read('extension/manifest.json');
  while ((m = msgRe.exec(manifestSrc)) !== null) {
    msgKeys.add(m[1]);
  }
  ok(`Manifest references ${msgKeys.size} message key(s): ${[...msgKeys].join(', ')}`);

  // Map internal locale codes to Chrome's locale directory names.
  const localeDirMap = {'fa': 'fa', 'en': 'en', 'zh-Hans': 'zh_CN'};
  const localesDir = join(root, 'extension', '_locales');

  for (const [locale, dirName] of Object.entries(localeDirMap)) {
    if (!existsSync(join(localesDir, dirName, 'messages.json'))) {
      fail(`${locale}: missing _locales/${dirName}/messages.json`);
    }
  }
  for (const dirName of readdirSync(localesDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
    const msgPath = join(localesDir, dirName, 'messages.json');
    if (!existsSync(msgPath)) {
      fail(`Missing _locales/${dirName}/messages.json`);
      continue;
    }
    const messages = JSON.parse(readFileSync(msgPath, 'utf8'));
    const fileKeys = new Set(Object.keys(messages));
    const missing = [...msgKeys].filter((k) => !fileKeys.has(k));
    if (missing.length) {
      fail(`_locales/${dirName}: missing ${missing.length} key(s): ${missing.join(', ')}`);
    } else {
      ok(`_locales/${dirName}: all ${msgKeys.size} manifest key(s) present`);
    }
  }
}

// ── 4. <select> localeToggle consistency ───────────────────────────────
// Every HTML file with a #localeToggle must have <option> elements for all
// expected locales.

function checkSelectOptions(filePath) {
  console.log(`\n📄 ${filePath} (language <select>)`);
  const src = read(filePath);
  // Some files use #localeToggle, audio-guide.html uses #language.
  const hasToggle = src.includes('id="localeToggle"') || src.includes('id="language"');
  if (!hasToggle) return; // no language selector in this file
  if (!src.includes('<select')) {
    fail('Language selector is not a <select> element');
    return;
  }
  for (const locale of EXPECTED_LOCALES) {
    const re = new RegExp(`<option[^>]*value="${locale}"`, 'i');
    if (!re.test(src)) {
      fail(`Missing <option value="${locale}">`);
    } else {
      ok(`Has <option value="${locale}">`);
    }
  }
}

// ── Run all checks ─────────────────────────────────────────────────────

export function runChecks() {
  failures = 0;
  console.log('═══ Avorythm i18n Consistency Check ═══');
  console.log(`Expected locales: ${EXPECTED_LOCALES.join(', ')}\n`);

  console.log('── JS Dictionary Key Alignment ──');
  checkJsDictionary('src/avorythm/static/app.js', 'messages');
  checkJsDictionary('extension/options.js', 'copy');
  checkJsDictionary('extension/popup.js', 'copy');
  checkJsDictionary('extension/player.js', 'copy');

  console.log('\n── HTML data-* Attribute Completeness ──');
  checkHtmlDataAttrs('src/avorythm/static/help.html');
  checkHtmlDataAttrs('src/avorythm/static/audio-guide.html');

  console.log('\n── <select> localeToggle Options ──');
  checkSelectOptions('src/avorythm/static/index.html');
  checkSelectOptions('src/avorythm/static/help.html');
  checkSelectOptions('src/avorythm/static/audio-guide.html');
  checkSelectOptions('extension/options.html');
  checkSelectOptions('extension/popup.html');
  checkSelectOptions('extension/player.html');

  console.log('\n── Chrome Extension _locales ──');
  checkExtensionLocales();

  console.log('\n════════════════════════════════════════');
  if (failures === 0) console.log('✅ All i18n checks passed.');
  else console.error(`❌ ${failures} i18n check(s) failed.`);
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runChecks() ? 1 : 0);
}
