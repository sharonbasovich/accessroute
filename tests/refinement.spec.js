import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const key = "accessroute.demo.v1";
const nav = (p) => p.getByRole("navigation", { name: "Rehearsal stages" });
const waiting = (p) => nav(p).getByRole("button", { name: /Waiting/ });
const arrival = (p) => nav(p).getByRole("button", { name: /Arrival/ });
test("route preview is transient; hover, focus, interruption and activation stay separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("radio").first().check();
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.mouse.wheel(0, -1000);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await waiting(page).hover();
  await fs.writeFile(
    "evidence/preview-diagnostic.json",
    JSON.stringify(
      await page.evaluate(() => ({
        hover: matchMedia("(hover:hover)").matches,
        fine: matchMedia("(pointer:fine)").matches,
        scrollY,
        focused: document.activeElement?.outerHTML.slice(0, 180),
        scene: document.querySelector(".scene").className,
      })),
      null,
      2,
    ),
  );
  await expect(page.locator(".scene")).toHaveClass(/previewing/);
  await expect(page.locator(".scene-caption")).toContainText("Waiting");
  await expect(
    page.getByRole("heading", { name: "Find your way in." }),
  ).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  await page.screenshot({
    path: "evidence/v2-hover-preview.png",
    fullPage: true,
  });
  await page.mouse.move(10, 10);
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await waiting(page).focus();
  await expect(page.locator(".scene")).toHaveClass(/previewing/);
  await page.mouse.wheel(0, 100);
  await expect(page.locator(".scene")).toHaveClass(/previewing/);
  await expect(page.getByRole("status")).toContainText("Arrival is still open");
  await page.keyboard.press("Escape");
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await arrival(page).focus();
  await waiting(page).focus();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await arrival(page).hover();
  await waiting(page).hover();
  await page.evaluate(() => window.dispatchEvent(new Event("pointercancel")));
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await arrival(page).hover();
  await waiting(page).hover();
  await page.mouse.wheel(0, 260);
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await page.evaluate(() => scrollTo(0, 0));
  await arrival(page).focus();
  await waiting(page).focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await arrival(page).focus();
  await waiting(page).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Make room for a calmer wait." }),
  ).toBeFocused();
  await expect(page.locator(".scene")).not.toHaveClass(/previewing/);
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await arrival(page).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  expect(
    JSON.parse(await page.evaluate((k) => localStorage.getItem(k), key))
      .visited,
  ).toEqual([]);
});
test("preview cannot alter exported note or persist through workspace navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Select & share", exact: true })
    .click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  const initial = await page.locator("#export-note").innerText();
  await page
    .getByRole("button", { name: "Rehearse visit", exact: true })
    .click();
  for (let i = 0; i < 8; i++) {
    await waiting(page).hover();
    await arrival(page).hover();
  }
  await waiting(page).hover();
  await page
    .getByRole("button", { name: "Select & share", exact: true })
    .click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await expect(page.locator("#export-note")).toHaveCount(0);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  expect(await page.locator("#export-note").innerText()).toBe(initial);
});
test("coarse touch has explicit stop selection and nearby expandable question", async ({
  browser,
}) => {
  const c = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    const p = await c.newPage();
    await p.goto("/");
    await waiting(p).tap();
    await expect(
      p.getByRole("heading", { name: "Make room for a calmer wait." }),
    ).toBeVisible();
    await expect(p.locator(".scene")).not.toHaveClass(/previewing/);
    const detail = p.locator(".stage-check");
    await detail.locator("summary").tap();
    await expect(detail).toHaveAttribute("open", "");
    await expect(detail).toContainText("audible call harder to notice");
    await p.getByRole("radio").first().check();
    await p.screenshot({
      path: "evidence/v2-touch-question.png",
      fullPage: true,
    });
    await arrival(p).tap();
    await expect(detail).not.toHaveAttribute("open", "");
    await waiting(p).tap();
    await expect(p.getByRole("radio").first()).toBeChecked();
    await expect(p.locator(".local")).toHaveText("Saved on this browser");
    await p.reload();
    await expect(p.getByRole("radio").first()).toBeChecked();
  } finally {
    await c.close();
  }
});
test("responsive viewport, native scroll navigation, selected contrast and page errors", async ({
  page,
}) => {
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r
        .url()
        .startsWith(
          new URL(process.env.ACCESSROUTE_TEST_URL || "http://127.0.0.1:5173")
            .origin,
        )
    )
      requests.push(r.url());
  });
  const rows = [];
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const resetTarget = await page
      .getByRole("button", { name: "Reset demo", exact: true })
      .boundingBox();
    expect(resetTarget.width).toBeGreaterThanOrEqual(44);
    expect(resetTarget.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("radio").first().check();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `evidence/v2-${width}-viewport.png` });
    await page.mouse.wheel(0, 500);
    // Native wheel scrolling is asynchronous; observe settlement before measuring.
    await expect
      .poll(() =>
        page.locator(".workspace-nav").evaluate((e) => e.getBoundingClientRect().top),
      )
      .toBeLessThan(2);
    expect(
      await page
        .locator(".workspace-nav")
        .evaluate((e) => e.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(-1);
    expect(
      await page
        .locator(".workspace-nav")
        .evaluate((e) => e.getBoundingClientRect().top),
    ).toBeLessThan(2);
    await page
      .getByRole("button", { name: "Select & share", exact: true })
      .click();
    await page.getByRole("checkbox").first().check();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    rows.push({ width, axe_violations: result.violations.length });
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  await fs.writeFile(
    "evidence/v2-responsive.json",
    JSON.stringify(
      { rows, page_errors: errors, external_requests: requests },
      null,
      2,
    ),
  );
});
