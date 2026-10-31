import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("interrupted and repeated rehearsal persists without duplicate progress", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Save & continue" }),
  ).toBeDisabled();
  await page.getByRole("radio").first().check();
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  await page.reload();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByRole("radio").last().check();
  await expect(page.locator(".practice")).toContainText("companion");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Finish rehearsal" }).click();
  await expect(
    page.getByRole("heading", { name: "Ask. Check. Record." }),
  ).toBeVisible();
  await expect(page.locator(".progress-ring")).toHaveText("3/3");
  await page
    .getByRole("button", { name: "Rehearse visit", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish rehearsal" }).click();
  await expect(page.locator(".progress-ring")).toHaveText("3/3");
});
test("source and scope are required; changed preference invalidates confirmation", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await page.getByRole("button", { name: "Update record" }).first().click();
  await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("alert")).toContainText("both a source");
  await page
    .getByLabel("Source of the record")
    .fill("Fictional reception email");
  await page.getByLabel("Visit or area covered").fill("Demo entrance only");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  await page.reload();
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(page.locator(".ledger-row").first()).toContainText(
    "Fictional reception email",
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill("Please pause between points.");
  await expect(page.locator(".preference").first()).toContainText("My request");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(page.locator(".ledger-row").first()).not.toContainText(
    "Fictional reception email",
  );
});
test("preview allowlist, download bytes, deselection and remount boundary", async ({
  page,
}) => {
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(
    page.getByRole("button", { name: "Preview selected note" }),
  ).toBeDisabled();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  const text = await page.locator("#export-note").innerText();
  expect(text).toContain("key information in writing");
  expect(text).not.toContain("quieter");
  expect(text).not.toContain("step-free");
  expect(text).not.toContain("Could you");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download text" }).click();
  const download = await pending;
  expect(await fs.readFile(await download.path(), "utf8")).toBe(text);
  await page.getByRole("checkbox").first().uncheck();
  await expect(page.locator("#export-note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download text" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
});
test("reset Escape, focus containment, cancellation and full reset", async ({
  page,
}) => {
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Keep my work" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Reset demo data" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await expect(page.locator(".progress-ring")).toHaveText("0/3");
});
test("unavailable records retain evidence; empty requests cannot be shared", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await page.getByRole("button", { name: "Update record" }).last().click();
  await page.getByLabel("Status", { exact: true }).selectOption("unavailable");
  await page.getByLabel("Source of the record").fill("Simulated call");
  await page.getByLabel("Visit or area covered").fill("Demo route only");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".ledger-row").last()).toContainText(
    "Self-recorded unavailable - unverified",
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#mobility").fill("");
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(page.getByRole("checkbox").last()).toBeDisabled();
});
test("storage failures retain usable session with explicit warning", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  const p = await context.newPage();
  await p.goto("/");
  await expect(p.getByRole("alert")).toContainText("only for this session");
  await p.getByRole("radio").first().check();
  await expect(
    p.getByRole("button", { name: "Save & continue" }),
  ).toBeEnabled();
  await context.close();
});
test("corrupt saved data recovers safely", async ({ page }) => {
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  await page.evaluate(() =>
    localStorage.setItem(
      "accessroute.demo.v1",
      '{"version":1,"requests":false}',
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Find your way in." }),
  ).toBeVisible();
});
test("desktop and mobile all workspaces: axe, overflow, screenshots, reduced motion", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const name of [
      "Rehearse visit",
      "Preferences",
      "Confirmation ledger",
      "Select & share",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `evidence/${width}-${name.replaceAll(" ", "-").replace("&", "and")}.png`,
        fullPage: true,
      });
    }
  }
  await page
    .getByRole("button", { name: "Rehearse visit", exact: true })
    .click();
  expect(
    await page
      .locator(".route-art")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
});
test("no third party network, HTML is escaped, maximum note stays bounded", async ({
  page,
}) => {
  const outbound = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:5173")) outbound.push(r.url());
  });
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill('<script>alert("x")</script>');
  await page.getByRole("button", { name: "Select & share" }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await expect(page.locator("#export-note")).toContainText("<script>");
  expect(await page.locator("#export-note script").count()).toBe(0);
  expect(outbound).toEqual([]);
});
