#!/usr/bin/env node
/**
 * Walks every top-level .html page and flags internal href/src targets
 * that don't resolve to a real file in the repo. External links
 * (http(s)://, mailto:, tel:, javascript:) and same-page anchors (#...)
 * are skipped — those can't go "404" the way a local file path can.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ATTR_PATTERN = /(?:href|src)=["']([^"']+)["']/g;
const SKIP_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:', '//'];

function isInternal(link) {
  if (!link || link.startsWith('#')) return false;
  return !SKIP_PREFIXES.some((prefix) => link.startsWith(prefix));
}

function stripQueryAndFragment(link) {
  return link.split(/[?#]/)[0];
}

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const broken = [];

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let match;
  while ((match = ATTR_PATTERN.exec(content)) !== null) {
    const raw = match[1];
    if (!isInternal(raw)) continue;
    const cleanPath = stripQueryAndFragment(raw);
    if (!cleanPath) continue;
    const targetPath = path.join(ROOT, cleanPath);
    if (!fs.existsSync(targetPath)) {
      broken.push({ file, link: raw, resolved: cleanPath });
    }
  }
}

if (broken.length > 0) {
  console.error(`Found ${broken.length} broken internal link(s):\n`);
  for (const { file, link, resolved } of broken) {
    console.error(`  ${file}  ->  "${link}" (resolved path not found: ${resolved})`);
  }
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} page(s), no broken internal links found.`);
