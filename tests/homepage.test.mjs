import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../careerpilot-home.css', import.meta.url), 'utf8');
const jsPath = new URL('../careerpilot-home.js', import.meta.url);

test('premium homepage positions CareerPilot as a professional service', () => {
  assert.match(html, /career optimisation service/i);
  assert.match(html, /proprietary AI-powered platform is used internally/i);
  assert.match(html, /not software you need to learn/i);
  assert.match(html, /never guarantee interviews/i);
  assert.doesNotMatch(html, /buy software|start free trial|fake testimonial/i);
});

test('homepage navigation targets existing sections and routes', () => {
  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const target = href[1];
    if (target.startsWith('#')) {
      assert.match(html, new RegExp('id="' + target.slice(1) + '"'), 'Missing anchor ' + target);
    } else if (target.startsWith('/') && !target.startsWith('//')) {
      const pathname = target.split(/[?#]/)[0];
      const file = pathname === '/' ? 'index.html' : pathname.slice(1) + (pathname.includes('.') ? '' : '.html');
      assert.ok(existsSync(new URL('../' + file, import.meta.url)), 'Broken local link ' + target);
    }
  }
});

test('landing has accessible responsive navigation and FAQ', () => {
  assert.match(html, /<main id="main">/);
  assert.match(html, /aria-controls="mobile-nav"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden>/);
  assert.ok((html.match(/<details>/g) || []).length >= 4);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /max-width:610px/);
});

test('homepage assets exist and its JavaScript parses', () => {
  for (const asset of ['careerpilot-home.css','careerpilot-home.js','analytics.css','analytics.js']) {
    assert.ok(existsSync(new URL('../' + asset, import.meta.url)), 'Missing asset ' + asset);
  }
  const parsed = spawnSync(process.execPath, ['--check', jsPath.pathname], {encoding:'utf8'});
  assert.equal(parsed.status, 0, parsed.stderr);
});

test('brand palette remains consistent', () => {
  for (const colour of ['#14243A', '#101C2B', '#F8F7F3', '#FFFFFF', '#F07845', '#8291A3', '#E5E7EB']) {
    assert.ok(css.includes(colour), 'Brand colour absent: ' + colour);
  }
});
