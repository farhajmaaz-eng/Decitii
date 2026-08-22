#!/usr/bin/env node
/* Zero-dependency sanity check for deciti.
   - validates that every <script> block in index.html parses as JS
   - validates sw.js parses
   - validates manifest.webmanifest is valid JSON with required fields
   - validates the referenced local assets exist */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function fail(msg) { failures++; console.error('  FAIL ' + msg); }
function ok(msg) { console.log('  ok   ' + msg); }

/* ---- 1. inline scripts in index.html ---- */
const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
console.log('index.html: found ' + scripts.length + ' inline script block(s)');
for (let i = 0; i < scripts.length; i++) {
  const attrs = scripts[i][1];
  const body = scripts[i][2];
  if (!body.trim() || /\bsrc=/.test(attrs)) continue;
  if (/type=["']application\/ld\+json["']/.test(attrs)) {
    try {
      JSON.parse(body);
      ok('JSON-LD metadata parses');
    } catch (e) { fail('JSON-LD metadata: ' + e.message); }
    continue;
  }
  try {
    new vm.Script(body, { filename: 'index.html#script' + i });
    ok('inline script #' + i + ' parses (' + body.length + ' chars)');
  } catch (e) {
    fail('inline script #' + i + ': ' + e.message);
  }
}

/* ---- 2. balanced tags spot-check on a few critical ids ---- */
for (const id of ['id="main"', 'id="modal-root"', 'id="toasts"', 'id="auth-form"']) {
  if (html.includes(id)) ok(html.includes(id) ? id + ' present' : '');
  else fail(id + ' missing from index.html');
}

/* ---- 3. sw.js ---- */
try {
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), { filename: 'sw.js' });
  ok('sw.js parses');
} catch (e) { fail('sw.js: ' + e.message); }

/* ---- 4. manifest ---- */
try {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!(k in m)) fail('manifest missing "' + k + '"');
  }
  if (failures === 0 || Array.isArray(m.icons)) ok('manifest.webmanifest is valid JSON');
} catch (e) { fail('manifest.webmanifest: ' + e.message); }

/* ---- 5. referenced local assets exist ---- */
for (const ref of ['icon.svg', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml']) {
  if (fs.existsSync(path.join(__dirname, '..', ref))) ok(ref + ' exists');
  else fail(ref + ' referenced but missing');
}

if (failures) {
  console.error('\n' + failures + ' check(s) failed');
  process.exit(1);
}
console.log('\nAll checks passed.');
