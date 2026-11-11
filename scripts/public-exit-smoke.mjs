// Hosted acceptance only. No local server or application code substitution.
import { chromium, request, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected = JSON.parse(await readFile(new URL('./public-smoke-expected.json', import.meta.url)));
const base = 'https://sharonbasovich.github.io/accessroute/';
const dir = 'evidence/public-exit-smoke', key = 'accessroute.demo.v1';
const report = { started: new Date().toISOString(), expected, http: [], loaded: [], dialogs: [], passed: [], pageErrors: [], blockedRequests: [], limitations: ['Fresh synthetic Chromium desktop contexts only; no existing-user-cache or physical-device claim.', 'Navigation uses a test-only same-URL anchor and a trusted click, not an application link or synthetic beforeunload event.', 'Quota failure is injected only into the isolated browser Storage.setItem; app runtime bytes are unchanged.'] };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let browser, context, api, page, stage = 'Validate manifest';
const loads = [];
function verify(file, bytes, mime) {
  const pin = expected.files[file];
  assert.ok(pin, `Unpinned file: ${file}`);
  assert.equal(bytes.length, pin.size, `${file}: size`);
  assert.equal(digest(bytes), pin.sha256, `${file}: SHA256`);
  assert.ok(pin.mime.includes((mime || '').split(';')[0].trim().toLowerCase()), `${file}: MIME ${mime}`);
}
const stored = p => p.evaluate(key => localStorage.getItem(key), key);
const saved = p => expect(p.locator('.local')).toHaveText('Saved on this browser');
async function preferences(p) {
  await p.goto(base, { waitUntil: 'networkidle' }); await saved(p);
  await p.getByRole('button', { name: 'Preferences', exact: true }).click();
}
async function failSaving(p) {
  await p.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreSmokeStorage = () => { Storage.prototype.setItem = original; };
    window.smokeFailedAttempts = 0;
    Storage.prototype.setItem = function () {
      window.smokeFailedAttempts++;
      throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
    };
  });
}
async function navigate(p, action, label) {
  // Test-only anchor triggers genuine browser navigation from trusted user input.
  await p.evaluate(base => {
    document.getElementById('public-smoke-navigation')?.remove();
    const link = document.createElement('a'); link.id = 'public-smoke-navigation';
    link.href = base; link.textContent = 'Synthetic QA navigation';
    link.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;background:white;color:black;padding:12px';
    document.body.append(link);
  }, base);
  const seen = []; let handlerFailure, handled = Promise.resolve();
  const handler = dialog => {
    handled = (async () => {
    const entry = { label, action, type: dialog.type() }; seen.push(entry); report.dialogs.push(entry);
    try { assert.equal(dialog.type(), 'beforeunload'); await dialog[action === 'dismiss' ? 'dismiss' : 'accept'](); }
    catch (error) { handlerFailure = error; await dialog.dismiss().catch(() => {}); }
    })();
  };
  p.on('dialog', handler);
  try {
    const navigation = action !== 'dismiss'
      ? p.waitForEvent('domcontentloaded', { timeout: 15000 }).then(() => null, error => error) : null;
    await p.locator('#public-smoke-navigation').click({ noWaitAfter: true });
    if (action === 'dismiss') {
      await expect.poll(() => seen.length, { timeout: 10000 }).toBe(1);
      await expect(p.locator('#public-smoke-navigation')).toBeVisible();
      assert.equal(await p.evaluate(() => navigator.userActivation.hasBeenActive), true);
    } else {
      const error = await navigation; if (error) throw error;
      await saved(p);
      await p.getByRole('button', { name: 'Preferences', exact: true }).click();
    }
    await handled;
    if (handlerFailure) throw handlerFailure;
    assert.equal(seen.length, action === 'clean' ? 0 : 1, `${label}: native prompt count`);
    assert.equal(p.url(), base);
  } finally { p.off('dialog', handler); }
}
async function freshContext() {
  assert.deepEqual((await Promise.all(loads)).filter(Boolean), []);
  await context?.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  context.setDefaultTimeout(15000);
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'GET' && url.origin === new URL(base).origin && url.pathname.startsWith(new URL(base).pathname)) return route.continue();
    report.blockedRequests.push({ method: req.method(), url: req.url() }); return route.abort();
  });
  context.on('page', p => {
    p.on('pageerror', error => report.pageErrors.push(String(error)));
    p.on('response', response => {
      loads.push((async () => {
        const url = new URL(response.url());
        const file = url.pathname.slice(new URL(base).pathname.length) || 'index.html';
        if (!expected.files[file]) {
          assert.ok(!['document', 'script', 'stylesheet'].includes(response.request().resourceType()), `Unpinned runtime: ${response.url()}`);
          return;
        }
        const bytes = await response.body();
        report.loaded.push({ file, url: response.url(), status: response.status(), mime: response.headers()['content-type'], size: bytes.length, sha256: digest(bytes) });
        assert.equal(response.status(), 200); assert.equal(response.fromServiceWorker(), false);
        verify(file, bytes, response.headers()['content-type']);
      })().then(() => null, error => String(error.stack || error)));
    });
  });
  page = await context.newPage(); await preferences(page);
}
await mkdir(dir, { recursive: true });
try {
  assert.equal(expected.baseURL, base);
  assert.equal(expected.ready, true, 'Deployment pins must be reviewed before running');
  assert.match(expected.deploymentCommit, /^[a-f0-9]{40}$/);
  for (const [file, pin] of Object.entries(expected.files)) {
    assert.ok(!file.includes('..') && !file.startsWith('/'));
    assert.match(pin.sha256, /^[a-f0-9]{64}$/); assert.ok(pin.size > 0); assert.ok(pin.mime.length);
  }
  assert.ok(expected.files['index.html']);
  assert.ok(Object.keys(expected.files).some(file => file.endsWith('.js')));
  assert.ok(Object.keys(expected.files).some(file => file.endsWith('.css')));
  assert.ok(expected.files[expected.provenanceFile]);
  stage = 'Public HTTP identity'; api = await request.newContext();
  for (const file of Object.keys(expected.files)) {
    const url = new URL(file, base).href;
    const response = await api.get(url, { headers: { 'Cache-Control': 'no-cache' }, maxRedirects: 0 });
    const bytes = await response.body();
    report.http.push({ file, status: response.status(), finalURL: response.url(), mime: response.headers()['content-type'], size: bytes.length, sha256: digest(bytes) });
    assert.equal(response.status(), 200); assert.equal(response.url(), url); verify(file, bytes, response.headers()['content-type']);
    if (file === expected.provenanceFile) {
      const provenance = JSON.parse(bytes);
      assert.equal(provenance.source_commit, expected.sourceCommit);
      assert.equal(provenance.source_tree, expected.sourceTree);
      assert.equal(provenance.deployment_base, '/accessroute/');
    }
  }
  report.passed.push('Public document, JS, CSS and provenance match pinned deployed bytes and MIME.');
  browser = await chromium.launch();
  stage = 'Failed-save repeated Cancel and accept'; await freshContext();
  const initial = await page.locator('#communication').inputValue(), original = await stored(page);
  await failSaving(page);
  await page.locator('#communication').fill('SYNTHETIC NATIVE UNSAVED WORK');
  await expect(page.locator('.local')).toHaveText('Session only');
  for (let i = 1; i <= 2; i++) {
    await navigate(page, 'dismiss', `Failed save Cancel ${i}`);
    await expect(page.locator('#communication')).toHaveValue('SYNTHETIC NATIVE UNSAVED WORK');
    assert.equal(await stored(page), original);
  }
  await page.screenshot({ path: `${dir}/failed-save-after-repeated-cancel.png`, fullPage: true });
  await navigate(page, 'accept', 'Failed save Leave');
  await expect(page.locator('#communication')).toHaveValue(initial); assert.equal(await stored(page), original);
  report.passed.push('Failed-save work survives two native Cancels; Leave restores persisted work.');
  for (const resolution of ['recovery', 'exact revert']) {
    stage = `Warning-free ${resolution}`; await freshContext();
    let value = await page.locator('#communication').inputValue(); await failSaving(page);
    await page.locator('#communication').fill('SYNTHETIC TEMPORARY WORK');
    await expect(page.locator('.local')).toHaveText('Session only');
    if (resolution === 'recovery') {
      await page.evaluate(() => window.restoreSmokeStorage()); value = 'SYNTHETIC RECOVERED WORK';
    }
    const attempts = await page.evaluate(() => window.smokeFailedAttempts);
    await page.locator('#communication').fill(value);
    if (resolution === 'recovery') await saved(page);
    else await expect.poll(() => page.evaluate(() => window.smokeFailedAttempts)).toBeGreaterThan(attempts);
    await navigate(page, 'clean', resolution);
    await expect(page.locator('#communication')).toHaveValue(value);
    await page.screenshot({ path: `${dir}/${resolution.replaceAll(' ', '-')}.png`, fullPage: true });
    report.passed.push(`${resolution}: real navigation is warning-free and preserves expected work.`);
  }
  stage = 'Cross-tab stale-write protection'; await freshContext();
  const peer = await context.newPage(); await preferences(peer);
  await peer.locator('#sensory').fill('SYNTHETIC PEER SAVED WORK'); await saved(peer);
  await expect(page.getByRole('alert')).toContainText('stopped saving');
  const winner = await stored(peer);
  await page.locator('#communication').fill('SYNTHETIC STALE TAB WORK');
  for (let i = 1; i <= 2; i++) {
    await navigate(page, 'dismiss', `Stale tab Cancel ${i}`);
    await expect(page.locator('#communication')).toHaveValue('SYNTHETIC STALE TAB WORK');
    assert.equal(await stored(peer), winner);
  }
  await page.screenshot({ path: `${dir}/stale-tab-after-repeated-cancel.png`, fullPage: true });
  await navigate(page, 'accept', 'Stale tab Leave');
  await expect(page.locator('#sensory')).toHaveValue('SYNTHETIC PEER SAVED WORK');
  await expect(page.locator('.storage-conflict')).toHaveCount(0); assert.equal(await stored(peer), winner);
  await page.screenshot({ path: `${dir}/stale-tab-after-leave.png`, fullPage: true });
  report.passed.push('Stale-tab edits survive repeated Cancel without overwriting peer bytes; Leave restores peer work.');
  stage = 'Loaded runtime identity';
  assert.deepEqual((await Promise.all(loads)).filter(Boolean), []);
  for (const file of Object.keys(expected.files).filter(f => f === 'index.html' || /\.(js|css)$/.test(f))) assert.ok(report.loaded.some(item => item.file === file), `Observed loaded ${file}`);
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.blockedRequests, []);
  report.success = true;
} catch (error) {
  report.success = false; report.failedStage = stage; report.error = String(error.stack || error); process.exitCode = 1;
  await page?.screenshot({ path: `${dir}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await context?.close(); await browser?.close(); await api?.dispose();
  report.finished = new Date().toISOString(); await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
