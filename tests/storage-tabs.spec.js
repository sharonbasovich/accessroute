import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { KEY, seed, stages } from "../src/model.js";
const entry = process.env.ACCESSROUTE_ENTRY_PATH || "/";
const saved = (p) =>
  expect(p.locator(".local")).toHaveText("Saved on this browser");
const stored = (p) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
async function preferences(p) {
  await p.goto(entry);
  await saved(p);
  await p.getByRole("button", { name: "Preferences", exact: true }).click();
}
async function reset(p) {
  await p.getByRole("button", { name: "Reset demo", exact: true }).click();
  await p.getByRole("button", { name: "Reset demo data", exact: true }).click();
}

test("reset in another tab cannot be resurrected; explicit reload discards only this session", async ({
  context,
}) => {
  const a = await context.newPage();
  await preferences(a);
  await a.locator("#communication").fill("SYNTHETIC OLD REQUEST");
  await saved(a);
  await a.evaluate(({ key, choice }) => {
    const data = JSON.parse(localStorage.getItem(key));
    data.visited = ["arrival"];
    data.choices = { arrival: choice };
    data.requests[0].status = "confirmed";
    data.requests[0].source = "SYNTHETIC OLD SOURCE";
    data.requests[0].scope = "SYNTHETIC OLD SCOPE";
    localStorage.setItem(key, JSON.stringify(data));
  }, { key: KEY, choice: stages[0].options[0] });
  await preferences(a);
  const b = await context.newPage();
  await preferences(b);
  await a.getByRole("button", { name: "Reset demo", exact: true }).click();
  await a.getByRole("button", { name: "Keep my work", exact: true }).click();
  await expect(b.locator(".storage-conflict")).toHaveCount(0);
  await reset(a);
  await saved(a);
  await expect(b.getByRole("alert")).toContainText("stopped saving");
  await b.locator("#sensory").fill("SYNTHETIC SESSION DRAFT");
  await expect.poll(async () => stored(a)).toEqual(seed());
  await expect(b.locator("#communication")).toHaveValue(
    "SYNTHETIC OLD REQUEST",
  );
  await b.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => b.evaluate(() => scrollY)).toBe(0);
  await b.screenshot({
    path: "evidence/storage-conflict-desktop.png",
    fullPage: true,
  });
  await b.setViewportSize({ width: 375, height: 812 });
  await b.emulateMedia({ reducedMotion: "reduce" });
  expect((await new AxeBuilder({ page: b }).analyze()).violations).toEqual([]);
  expect(
    await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await b.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => b.evaluate(() => scrollY)).toBe(0);
  await b.screenshot({
    path: "evidence/storage-conflict-mobile.png",
    fullPage: true,
  });
  await b
    .getByRole("button", {
      name: "Reload saved demo and discard this tab’s changes",
    })
    .focus();
  await b.keyboard.press("Enter");
  await saved(b);
  await expect(b.locator(".storage-conflict")).toHaveCount(0);
  await b.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(b.locator("#sensory")).toHaveValue(seed().requests[1].text);
  await b.locator("#sensory").fill("SYNTHETIC NEW SAVED EDIT");
  await saved(b);
  await expect
    .poll(async () => (await stored(b)).requests[1].text)
    .toBe("SYNTHETIC NEW SAVED EDIT");
});

test("simultaneous edits serialize; one tab warns without silently overwriting the winner", async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await preferences(a);
  await preferences(b);
  await Promise.all([
    a.locator("#communication").fill("SYNTHETIC A"),
    b.locator("#sensory").fill("SYNTHETIC B"),
  ]);
  await expect
    .poll(
      async () =>
        (await a.locator(".storage-conflict").count()) +
        (await b.locator(".storage-conflict").count()),
    )
    .toBe(1);
  const data = await stored(a);
  expect(
    Number(data.requests[0].text === "SYNTHETIC A") +
      Number(data.requests[1].text === "SYNTHETIC B"),
  ).toBe(1);
  await expect(a.locator("#communication")).toHaveValue("SYNTHETIC A");
  await expect(b.locator("#sensory")).toHaveValue("SYNTHETIC B");
});

test("clearing saved data pauses stale writes and a local reset cannot unpause them", async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await preferences(a);
  await preferences(b);
  await a.evaluate(() => localStorage.clear());
  await expect(b.getByRole("alert")).toContainText("stopped saving");
  await reset(b);
  await b.getByRole("button", { name: "Preferences", exact: true }).click();
  await b.locator("#communication").fill("SYNTHETIC MUST NOT PERSIST");
  await expect(b.getByRole("alert")).toContainText("stopped saving");
  expect(await b.evaluate((key) => localStorage.getItem(key), KEY)).toBe(null);
});

test("unrelated storage keys do not block edits; failed writes preserve saved data", async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await preferences(a);
  await preferences(b);
  await a.evaluate(() => {
    localStorage.setItem("unrelated-demo", "value");
    sessionStorage.setItem("accessroute.demo.v1", "unrelated");
  });
  await b.locator("#sensory").fill("SYNTHETIC VALID EDIT");
  await saved(b);
  await expect(b.locator(".storage-conflict")).toHaveCount(0);
  const before = await stored(b);
  await b.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await b.locator("#sensory").fill("SYNTHETIC UNSAVED EDIT");
  await expect(b.getByRole("alert")).toContainText("only for this session");
  expect(await stored(b)).toEqual(before);
});

for (const failure of ["unsupported", "rejected"])
  test(`existing data loads but no unsafe write when locks are ${failure}`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addInitScript(
      ({ key, initial, failure }) => {
        localStorage.setItem(key, JSON.stringify(initial));
        Object.defineProperty(navigator, "locks", {
          value:
            failure === "unsupported"
              ? undefined
              : { request: () => Promise.reject(new Error("Unavailable")) },
        });
      },
      {
        key: KEY,
        initial: {
          ...seed(),
          requests: seed().requests.map((r, i) =>
            i ? r : { ...r, text: "SYNTHETIC SAVED DATA" },
          ),
        },
        failure,
      },
    );
    const p = await context.newPage();
    await p.goto(entry);
    await expect(p.getByRole("alert")).toContainText("only for this session");
    await p.getByRole("button", { name: "Preferences", exact: true }).click();
    await expect(p.locator("#communication")).toHaveValue(
      "SYNTHETIC SAVED DATA",
    );
    await p.locator("#communication").fill("SYNTHETIC UNSAVED");
    await expect
      .poll(async () => (await stored(p)).requests[0].text)
      .toBe("SYNTHETIC SAVED DATA");
    await context.close();
  });

test("a held lock times out without a late write after release", async ({
  page,
}) => {
  await preferences(page);
  await page.evaluate(async () => {
    await new Promise((ready) =>
      navigator.locks.request("accessroute.demo.v1.write", () => {
        ready();
        return new Promise((resolve) => {
          window.releaseTestLock = resolve;
        });
      }),
    );
  });
  const before = await stored(page);
  await page.locator("#communication").fill("SYNTHETIC QUEUED EDIT");
  await expect(page.locator(".local")).toHaveText("Saving on this browser…");
  const dialog = page.waitForEvent("dialog");
  const reload = page.reload().catch(() => null);
  const warning = await dialog;
  expect(warning.type()).toBe("beforeunload");
  await warning.dismiss();
  await reload;
  await expect(page.locator("#communication")).toHaveValue("SYNTHETIC QUEUED EDIT");
  await expect(page.getByRole("alert")).toContainText("only for this session");
  await page.evaluate(() => window.releaseTestLock());
  await page.waitForTimeout(100);
  expect(await stored(page)).toEqual(before);
  await page.locator("#communication").fill("SYNTHETIC RETRIED EDIT");
  await saved(page);
  expect((await stored(page)).requests[0].text).toBe("SYNTHETIC RETRIED EDIT");
});
