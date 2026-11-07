import { test, expect } from "@playwright/test";
import { KEY } from "../src/model.js";
const entry = process.env.ACCESSROUTE_ENTRY_PATH || "/";
const warns = (page) =>
  page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
async function preferences(page) {
  await page.goto(entry);
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
}
async function failSaving(page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
}
test("session-only edits keep an exit warning after failed save settles", async ({
  page,
}) => {
  await preferences(page);
  const initial = await page.locator("#communication").inputValue();
  await failSaving(page);
  await page.locator("#communication").fill("SYNTHETIC UNSAVED PREFERENCE");
  await expect(page.locator(".local")).toHaveText("Session only");
  expect(await warns(page)).toBe(true);
  const warned = page.waitForEvent("dialog").then(async (dialog) => {
    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
  });
  await page.evaluate(() => setTimeout(() => location.reload(), 0));
  await warned;
  await expect(page.locator("#communication")).toHaveValue(
    "SYNTHETIC UNSAVED PREFERENCE",
  );
  await page.locator("#communication").fill(initial);
  await expect(page.locator(".local")).toHaveText("Session only");
  expect(await warns(page)).toBe(false);
});

test("successful recovery clears warning, a selective export does not", async ({
  page,
}) => {
  await preferences(page);
  await failSaving(page);
  await page.locator("#communication").fill("SYNTHETIC SESSION WORK");
  await expect(page.locator(".local")).toHaveText("Session only");
  await page
    .getByRole("button", { name: "Select & share", exact: true })
    .click();
  await page.locator(".share-choice input").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download text", exact: true })
    .click();
  await download;
  expect(await warns(page)).toBe(true);
  await page.evaluate(() => window.restoreStorage());
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill("SYNTHETIC SAVED AFTER RECOVERY");
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  expect(await warns(page)).toBe(false);
});

test("cross-tab conflict guards edits without replacing the newer saved copy", async ({
  page,
  context,
}) => {
  await preferences(page);
  const other = await context.newPage();
  await preferences(other);
  await other.locator("#sensory").fill("SYNTHETIC OTHER TAB");
  await expect(other.locator(".local")).toHaveText("Saved on this browser");
  await expect(page.getByRole("alert")).toContainText("stopped saving");
  expect(await warns(page)).toBe(false);
  await page.locator("#communication").fill("SYNTHETIC THIS TAB");
  expect(await warns(page)).toBe(true);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).requests[1].text,
      KEY,
    ),
  ).toBe("SYNTHETIC OTHER TAB");
});

for (const failure of ["unsupported", "rejected"])
  test(`${failure} locks do not warn on navigation alone`, async ({ page }) => {
    await page.addInitScript((failure) => {
      Object.defineProperty(navigator, "locks", {
        value:
          failure === "unsupported"
            ? undefined
            : { request: () => Promise.reject(Error("Unavailable")) },
      });
    }, failure);
    await page.goto(entry);
    await expect(page.locator(".local")).toHaveText("Session only");
    await page
      .getByRole("button", { name: "2 Waiting. Explore this stop" })
      .click();
    expect(await warns(page)).toBe(false);
    await page.getByRole("radio").first().check();
    expect(await warns(page)).toBe(true);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await page
      .getByRole("button", { name: "Reset demo data", exact: true })
      .click();
    expect(await warns(page)).toBe(false);
  });
