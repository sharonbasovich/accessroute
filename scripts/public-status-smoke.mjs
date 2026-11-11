// Public-host acceptance only: no application source import, local server or code substitution.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const expected = JSON.parse(await readFile(new URL('./public-status-expected.json', import.meta.url)));
const fixtures = JSON.parse(await readFile(new URL('./public-status-fixtures.json', import.meta.url)));
const base = 'https://sharonbasovich.github.io/accessroute/';
const key = 'accessroute.demo.v1';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { started: new Date().toISOString(), expected, http: [], loaded: [], downloads: [], passed: [], pageErrors: [], blockedRequests: [], routeErrors: [], limitations: [
  'Fresh isolated Chromium desktop contexts; synthetic storage only. No persistent profile, user account, held/native browser, existing local origin, or local server.',
  'Responses are fetched from the actual public host and verified before unmodified fulfillment. This disables browser cache and does not establish ordinary cached-client behavior.',
  'Quota failure is injected into Storage.setItem for the synthetic key only. No production JavaScript is replaced.',
  'Downloaded text bytes are read from browser-saved temporary files. No physical print, platform acceptance, exploit-impact, or real clinical-evidence claim.'
] };
let browser, context, page, api, expect, stage = 'Validate inactive deployment manifest', dir;
const pending = new Set();
function verify(file, bytes, mime) {
  const pin = expected.files[file];
  assert.ok(pin, `Unpinned public file: ${file}`);
  assert.equal(bytes.length, pin.size, `${file}: size`);
  assert.equal(digest(bytes), pin.sha256, `${file}: SHA256`);
  assert.ok(pin.mime.includes((mime || '').split(';')[0].trim().toLowerCase()), `${file}: MIME ${mime}`);
}
const stored = p => p.evaluate(key => localStorage.getItem(key), key);
const saved = p => expect(p.locator('.local')).toHaveText('Saved on this browser');
async function settled() {
  await Promise.all([...pending]);
  assert.deepEqual(report.routeErrors, []);
  assert.deepEqual(report.blockedRequests, []);
  assert.deepEqual(report.pageErrors, []);
}
async function fresh(raw, failWrites = false) {
  await settled();
  await context?.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true });
  context.setDefaultTimeout(15000);
  await context.route('**/*', route => {
    const work = (async () => {
      const req = route.request(), url = new URL(req.url());
      const file = url.pathname.slice(new URL(base).pathname.length) || 'index.html';
      if (req.method() !== 'GET' || url.origin !== new URL(base).origin || !url.pathname.startsWith(new URL(base).pathname) || url.search || !Object.hasOwn(expected.files, file)) {
        report.blockedRequests.push({ method: req.method(), url: req.url() });
        await route.abort(); return;
      }
      // Fetch only the allowed public URL, refuse redirects, verify bytes before execution.
      const response = await route.fetch({ maxRedirects: 0 });
      try {
        assert.equal(response.status(), 200); assert.equal(response.url(), req.url());
        const bytes = await response.body();
        verify(file, bytes, response.headers()['content-type']);
        report.loaded.push({ file, url: response.url(), status: response.status(), size: bytes.length, sha256: digest(bytes), mime: response.headers()['content-type'] });
        await route.fulfill({ response, body: bytes });
      } finally { await response.dispose(); }
    })().catch(async error => { report.routeErrors.push(String(error.stack || error)); await route.abort().catch(() => {}); });
    pending.add(work); work.finally(() => pending.delete(work)); return work;
  });
  context.on('page', p => {
    p.on('pageerror', error => report.pageErrors.push(String(error)));
    p.on('dialog', dialog => { report.pageErrors.push(`Unexpected dialog: ${dialog.type()}`); void dialog.dismiss(); });
  });
  await context.addInitScript(({ base, key, raw, failWrites }) => {
    if (location.href !== base) return;
    const marker = `${key}.status-fixture`;
    if (!sessionStorage.getItem(marker)) {
      localStorage.setItem(key, raw); sessionStorage.setItem(marker, 'initialized');
    }
    if (failWrites) {
      const write = Storage.prototype.setItem;
      window.statusFixtureWriteFailures = 0;
      window.restoreStatusFixtureWrites = () => { Storage.prototype.setItem = write; };
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key) {
          window.statusFixtureWriteFailures++;
          throw new DOMException('Synthetic full storage', 'QuotaExceededError');
        }
        return write.call(this, name, value);
      };
    }
  }, { base, key, raw, failWrites });
  page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' }); assert.equal(page.url(), base);
  await settled();
}
function malformed(status) {
  const state = structuredClone(fixtures.seed);
  Object.assign(state.requests[0], { text: 'SYNTHETIC MALFORMED REQUEST', status, source: 'SYNTHETIC MALFORMED SOURCE', scope: 'SYNTHETIC MALFORMED SCOPE' });
  return JSON.stringify(state, null, 2);
}
async function downloadNote(expectedText, label) {
  await page.getByRole('button', { name: 'Select & share', exact: true }).click();
  await page.locator('.share-choice input').first().check();
  await page.getByRole('button', { name: 'Preview selected note', exact: true }).click();
  assert.equal(await page.locator('#export-note').textContent(), expectedText);
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download text', exact: true }).click();
  const download = await pendingDownload;
  assert.equal(download.suggestedFilename(), 'accessroute-selected-note.txt');
  assert.equal(await download.failure(), null);
  const destination = join(dir, `${label}-selected-note.txt`);
  await download.saveAs(destination); // Fixed artifact path, never an untrusted filename.
  const bytes = await readFile(destination);
  assert.deepEqual(bytes, Buffer.from(expectedText, 'utf8'));
  report.downloads.push({ label, filename: download.suggestedFilename(), bytes: bytes.length, sha256: digest(bytes) });
}
try {
  // Fail closed before importing Playwright, opening a browser, or making any request.
  assert.equal(expected.ready, true, 'Inactive template: review and activate exact final deployment pins first');
  assert.equal(expected.baseURL, base);
  for (const field of ['sourceCommit', 'sourceTree', 'deploymentCommit']) assert.match(expected[field], /^[a-f0-9]{40}$/);
  assert.notEqual(expected.sourceCommit, 'd80c8c7d0444c8ae9bf103e9f05878a09ce8a285', 'Old pre-fix source');
  assert.notEqual(expected.deploymentCommit, '61a0dcabcc833ae6a785c8d3ee521293d42c5dde', 'Old pre-fix deployment');
  for (const [file, pin] of Object.entries(expected.files)) {
    assert.match(file, /^[a-zA-Z0-9_./-]+$/); assert.ok(!file.includes('..') && !file.startsWith('/'));
    assert.match(pin.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isInteger(pin.size) && pin.size > 0);
    assert.ok(Array.isArray(pin.mime) && pin.mime.length && pin.mime.every(mime => typeof mime === 'string' && mime.length));
  }
  assert.equal(expected.provenanceFile, 'provenance.json');
  for (const file of ['index.html', 'provenance.json', 'artifact-manifest.json']) assert.ok(expected.files[file]);
  assert.ok(Object.keys(expected.files).some(f => f.endsWith('.js')));
  assert.ok(Object.keys(expected.files).some(f => f.endsWith('.css')));
  const playwright = await import('@playwright/test'); expect = playwright.expect;
  const temporaryRoot = process.env.RUNNER_TEMP || tmpdir();
  dir = await mkdtemp(join(temporaryRoot, 'accessroute-public-status-'));
  report.artifactDirectory = dir;
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_OUTPUT, `artifact-directory=${dir}\n`);
  }
  stage = 'Exact public HTTP identity'; api = await playwright.request.newContext({ timeout: 15000 });
  for (const file of Object.keys(expected.files)) {
    const url = new URL(file, base).href;
    const response = await api.get(url, { headers: { 'Cache-Control': 'no-cache' }, maxRedirects: 0 });
    const bytes = await response.body();
    report.http.push({ file, status: response.status(), finalURL: response.url(), size: bytes.length, sha256: digest(bytes), mime: response.headers()['content-type'] });
    assert.equal(response.status(), 200); assert.equal(response.url(), url); verify(file, bytes, response.headers()['content-type']);
    if (file === expected.provenanceFile) {
      const provenance = JSON.parse(bytes);
      assert.equal(provenance.source_commit, expected.sourceCommit);
      assert.equal(provenance.source_tree, expected.sourceTree);
      assert.equal(provenance.deployment_base, '/accessroute/');
    }
    await response.dispose();
  }
  report.passed.push('Public document, runtime, artifact manifest and provenance match reviewed pins.');
  browser = await playwright.chromium.launch({ downloadsPath: join(dir, 'browser-downloads') });
  for (const [label, status] of [['array-confirmed', ['confirmed']], ['nested-unavailable', [['unavailable']]]]) {
    stage = `${label}: fallback, exact repair, file and reload`;
    await fresh(malformed(status)); await saved(page);
    await expect.poll(() => stored(page)).toBe(JSON.stringify(fixtures.seed));
    await page.getByRole('button', { name: 'Confirmation ledger', exact: true }).click();
    await expect(page.locator('.ledger-row').first()).toContainText('My request');
    await expect(page.locator('.ledger-row').first()).not.toContainText('SYNTHETIC MALFORMED');
    await downloadNote(fixtures.seedNote, label);
    await page.reload({ waitUntil: 'networkidle' }); await saved(page);
    assert.equal(await stored(page), JSON.stringify(fixtures.seed));
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await expect(page.locator('#communication')).toHaveValue(fixtures.seed.requests[0].text);
    await page.screenshot({ path: join(dir, `${label}.png`), fullPage: true }); await settled();
    report.passed.push(stage);
  }
  stage = 'Failed rewrite raw-byte preservation and legitimate recovery';
  const raw = malformed([['confirmed']]); await fresh(raw, true);
  await expect(page.locator('.local')).toHaveText('Session only');
  assert.ok(await page.evaluate(() => window.statusFixtureWriteFailures > 0));
  assert.equal(await stored(page), raw);
  await downloadNote(fixtures.seedNote, 'failed-rewrite'); assert.equal(await stored(page), raw);
  await page.evaluate(() => window.restoreStatusFixtureWrites());
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await page.locator('#communication').fill('SYNTHETIC LEGITIMATE EDIT'); await saved(page);
  const recovered = structuredClone(fixtures.seed); recovered.requests[0].text = 'SYNTHETIC LEGITIMATE EDIT';
  assert.equal(await stored(page), JSON.stringify(recovered));
  // Reload deliberately re-enables injected failure; no false successful-save claim.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.local')).toHaveText('Session only');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await expect(page.locator('#communication')).toHaveValue(recovered.requests[0].text);
  assert.equal(await stored(page), JSON.stringify(recovered));
  await page.screenshot({ path: join(dir, 'recovered-valid-work.png'), fullPage: true }); await settled();
  report.passed.push(stage);
  stage = 'Valid recorded evidence preserved through save, reload and exact selected file';
  await fresh(JSON.stringify(fixtures.valid)); await saved(page);
  assert.equal(await stored(page), JSON.stringify(fixtures.valid));
  await page.reload({ waitUntil: 'networkidle' }); await saved(page);
  await page.getByRole('button', { name: 'Confirmation ledger', exact: true }).click();
  await expect(page.locator('.ledger-row').first()).toContainText(fixtures.valid.requests[0].source);
  await expect(page.locator('.ledger-row').first()).toContainText(fixtures.valid.requests[0].scope);
  await downloadNote(fixtures.validNote, 'valid-evidence');
  assert.equal(await stored(page), JSON.stringify(fixtures.valid));
  await page.screenshot({ path: join(dir, 'valid-evidence.png'), fullPage: true }); await settled();
  report.passed.push(stage);
  for (const file of Object.keys(expected.files).filter(f => f === 'index.html' || /\.(js|css)$/.test(f))) assert.ok(report.loaded.some(item => item.file === file), `Runtime was loaded: ${file}`);
  report.success = true;
} catch (error) {
  report.success = false; report.failedStage = stage; report.error = String(error.stack || error); process.exitCode = 1;
  if (dir) await page?.screenshot({ path: join(dir, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await context?.close(); await browser?.close(); await api?.dispose();
  report.finished = new Date().toISOString();
  if (dir) await writeFile(join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
