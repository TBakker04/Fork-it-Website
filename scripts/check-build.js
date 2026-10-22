#!/usr/bin/env node
/**
 * "Build" step for a static site with no bundler: verifies every page
 * the site deploys actually exists and isn't empty. Run before the
 * link checker so a missing page shows up as a build failure, not a
 * flood of broken-link reports.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REQUIRED_PAGES = [
  'index.html',
  'home.html',
  'menu.html',
  'gallery.html',
  'wines.html',
  'privacy.html',
  '404.html',
];

let failed = false;

for (const page of REQUIRED_PAGES) {
  const fullPath = path.join(ROOT, page);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required page: ${page}`);
    failed = true;
    continue;
  }
  if (fs.statSync(fullPath).size === 0) {
    console.error(`Required page is empty: ${page}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log(`All ${REQUIRED_PAGES.length} required pages are present.`);
