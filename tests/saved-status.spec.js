import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { KEY, seed, shareText } from "../src/model.js";

const entry = process.env.ACCESSROUTE_ENTRY_PATH || "/";
const saved = (page) => expect(page.locator(".local")).toHaveText("Saved on this browser");
const rawStored = (page) => page.evaluate((key) => localStorage.getItem(key), KEY);

function malformed(status) {
  const state = seed();
  Object.assign(state.requests[0], {
    text: "SYNTHETIC MALFORMED REQUEST", status,
    source: "SYNTHETIC MALFORMED SOURCE", scope: "SYNTHETIC MALFORMED SCOPE",
  });
  return JSON.stringify(state, null, 2);
}

async function initialize(page, raw, failWrites = false) {
  // A per-tab session marker prevents re-injecting corrupt data on reload.
  // This fixture changes synthetic storage, not production application code.
  await page.addInitScript(({ key, raw, failWrites }) => {
    const marker = `${key}.status-fixture`;
    if (!sessionStorage.getItem(marker)) {
      localStorage.setItem(key, raw);
      sessionStorage.setItem(marker, "initialized");
    }
    if (failWrites) {
      const write = Storage.prototype.setItem;
      window.statusFixtureWriteFailures = 0;
      window.restoreStatusFixtureWrites = () => { Storage.prototype.setItem = write; };
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key) {
          window.statusFixtureWriteFailures++;
          throw new DOMException("Synthetic full storage", "QuotaExceededError");
        }
        return write.call(this, name, value);
      };
    }
  }, { key: KEY, raw, failWrites });
  await page.goto(entry);
}

async function assertSelectedDownload(page, expected) {
  await page.getByRole("button", { name: "Select & share", exact: true }).click();
  await page.locator(".share-choice input").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await expect(page.locator("#export-note")).toHaveText(expected);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download text", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("accessroute-selected-note.txt");
  const actual = await fs.readFile(await download.path());
  expect(actual.equals(Buffer.from(expected, "utf8"))).toBe(true);
}

for (const [name, status] of [
  ["array confirmation", ["confirmed"]],
  ["nested unavailable", [["unavailable"]]],
]) {
  test(`${name} is repaired before reload and selected-file export`, async ({ page }) => {
    await initialize(page, malformed(status));
    await saved(page);
    await expect.poll(() => rawStored(page)).toBe(JSON.stringify(seed()));
    await page.getByRole("button", { name: "Confirmation ledger", exact: true }).click();
    await expect(page.locator(".ledger-row").first()).toContainText("My request");
    await expect(page.locator(".ledger-row").first()).not.toContainText("SYNTHETIC MALFORMED");
    await assertSelectedDownload(page, shareText(seed(), ["communication"]));
    await page.reload();
    await saved(page);
    expect(await rawStored(page)).toBe(JSON.stringify(seed()));
    await page.getByRole("button", { name: "Preferences", exact: true }).click();
    await expect(page.locator("#communication")).toHaveValue(seed().requests[0].text);
  });
}

test("failed malformed-state rewrite preserves raw bytes and recovery saves only legitimate work", async ({ page }) => {
  const raw = malformed([["confirmed"]]);
  await initialize(page, raw, true);
  await expect(page.locator(".local")).toHaveText("Session only");
  expect(await page.evaluate(() => window.statusFixtureWriteFailures)).toBeGreaterThan(0);
  expect(await rawStored(page)).toBe(raw);
  await assertSelectedDownload(page, shareText(seed(), ["communication"]));
  expect(await rawStored(page)).toBe(raw);
  await page.evaluate(() => window.restoreStatusFixtureWrites());
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill("SYNTHETIC LEGITIMATE EDIT");
  await saved(page);
  const expected = seed();
  expected.requests[0].text = "SYNTHETIC LEGITIMATE EDIT";
  expect(await rawStored(page)).toBe(JSON.stringify(expected));
  // Reload re-enables the injected write failure, but must still restore the
  // valid saved record. A failed rewrite must not be described as a successful save.
  await page.reload();
  await expect(page.locator(".local")).toHaveText("Session only");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(page.locator("#communication")).toHaveValue(expected.requests[0].text);
  expect(await rawStored(page)).toBe(JSON.stringify(expected));
});

test("valid evidence survives restore, save, reload and exact selected-file export", async ({ page }) => {
  const state = seed();
  Object.assign(state.requests[0], {
    text: "SYNTHETIC VALID REQUEST", status: "confirmed",
    source: "SYNTHETIC VALID SOURCE", scope: "SYNTHETIC VALID SCOPE",
  });
  await initialize(page, JSON.stringify(state));
  await saved(page);
  expect(await rawStored(page)).toBe(JSON.stringify(state));
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Confirmation ledger", exact: true }).click();
  await expect(page.locator(".ledger-row").first()).toContainText(state.requests[0].source);
  await expect(page.locator(".ledger-row").first()).toContainText(state.requests[0].scope);
  await assertSelectedDownload(page, shareText(state, ["communication"]));
  expect(await rawStored(page)).toBe(JSON.stringify(state));
});
