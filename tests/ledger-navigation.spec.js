import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { KEY, seed } from "../src/model.js";
const entry = process.env.ACCESSROUTE_ENTRY_PATH || "/";
async function draft(page) {
  await page.goto(entry);
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make the unknowns visible." }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Update record", exact: true })
    .first()
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
  await page.getByLabel("Source of the record").fill("SYNTHETIC DRAFT SOURCE");
  await page.getByLabel("Visit or area covered").fill("Fictional visit only");
}
for (const width of [1280, 375])
  test(`unsaved record survives row and navigation interruptions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await draft(page);
    const next = page
      .getByRole("button", { name: "Update record", exact: true })
      .nth(1);
    await next.click();
    const dialog = page.getByRole("dialog", {
      name: "Keep your unsaved record?",
    });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Keep editing", exact: true }),
    ).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `evidence/draft-guard-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(next).toBeFocused();
    await expect(page.getByLabel("Source of the record")).toHaveValue(
      "SYNTHETIC DRAFT SOURCE",
    );
    for (const name of ["Preferences", "Select & share", "Rehearse visit"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      await expect(page.getByLabel("Source of the record")).toHaveValue(
        "SYNTHETIC DRAFT SOURCE",
      );
    }
    expect(
      (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY))
        .requests[0],
    ).toEqual(seed().requests[0]);
    await next.click();
    await page
      .getByRole("button", { name: "Discard draft & continue", exact: true })
      .click();
    await expect(
      page.locator(".ledger-row").nth(1).getByLabel("Status", { exact: true }),
    ).toHaveValue("unconfirmed");
    await page
      .getByRole("button", { name: "Update record", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "requested",
    );
    await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
    await page
      .getByLabel("Source of the record")
      .fill("SYNTHETIC SAVED SOURCE");
    await page.getByLabel("Visit or area covered").fill("Fictional scope");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Select & share", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Share on your terms." }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("explicit navigation discard and reset never save draft evidence", async ({
  page,
}) => {
  await draft(page);
  await page
    .getByRole("button", { name: "Choose what to share", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard draft & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Share on your terms." }),
  ).toBeFocused();
  await page.locator(".share-choice input").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await expect(page.locator("#export-note")).not.toContainText(
    "SYNTHETIC DRAFT",
  );
  await draft(page);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved record draft");
  await page.getByRole("button", { name: "Keep my work" }).click();
  await expect(page.getByLabel("Source of the record")).toHaveValue(
    "SYNTHETIC DRAFT SOURCE",
  );
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Walk through your next visit." }),
  ).toBeFocused();
});

test("cancelled native reload retains dirty protection after cross-tab conflict", async ({
  page,
  context,
}) => {
  await draft(page);
  const other = await context.newPage();
  await other.goto(entry);
  await other.getByRole("button", { name: "Preferences", exact: true }).click();
  await other.locator("textarea").first().fill("SYNTHETIC OTHER TAB");
  await expect(other.locator(".local")).toHaveText("Saved on this browser");
  await expect(
    page.getByRole("region", { name: "Saved demo changed" }),
  ).toBeVisible();
  const reload = page.getByRole("button", {
    name: "Reload saved demo and discard this tab’s changes",
  });
  await reload.click();
  const dismissed = page.waitForEvent("dialog").then(async (d) => {
    expect(d.type()).toBe("beforeunload");
    await d.dismiss();
  });
  await page
    .getByRole("button", { name: "Discard draft & continue", exact: true })
    .click();
  await dismissed;
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Keep your unsaved record?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Source of the record")).toHaveValue(
    "SYNTHETIC DRAFT SOURCE",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await reload.click();
  await expect(
    page.getByRole("heading", { name: "Walk through your next visit." }),
  ).toBeVisible();
});

test("keyboard dialog traps focus and newly edited second row is protected", async ({
  page,
}) => {
  await draft(page);
  const next = page
    .getByRole("button", { name: "Update record", exact: true })
    .nth(1);
  await next.click();
  const keep = page.getByRole("button", { name: "Keep editing", exact: true });
  const discard = page.getByRole("button", {
    name: "Discard draft & continue",
    exact: true,
  });
  await expect(keep).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(discard).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keep).toBeFocused();
  await discard.click();
  await page.getByLabel("Status", { exact: true }).selectOption("unavailable");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await keep.click();
  await expect(
    page.getByRole("button", { name: "Preferences", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "unavailable",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
