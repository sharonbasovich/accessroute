import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("nested selected, hover, focus, question and error text retain measured contrast", async ({
  page,
}) => {
  const rows = [];
  async function measure(selector, label) {
    const row = await page
      .locator(selector)
      .first()
      .evaluate((e) => {
        const parse = (c) => {
          const n = c.match(/[\d.]+/g).map(Number);
          return [...n.slice(0, 3), n.length > 3 ? n[3] : 1];
        };
        const blend = (a, b) => [
          ...a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3])),
          1,
        ];
        let bg = [255, 255, 255, 1],
          chain = [];
        for (let n = e; n; n = n.parentElement) chain.push(n);
        for (const n of chain.reverse())
          bg = blend(parse(getComputedStyle(n).backgroundColor), bg);
        const fg = blend(parse(getComputedStyle(e).color), bg);
        const lum = (c) =>
          c
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const a = lum(fg),
          b = lum(bg);
        return {
          foreground: fg.slice(0, 3),
          background: bg.slice(0, 3),
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
    rows.push({ label, ...row });
    expect(row.ratio, label).toBeGreaterThanOrEqual(4.5);
  }
  await page.goto("/");
  await page.getByRole("radio").first().check();
  await measure(".choice.selected span", "selected response");
  await page.locator(".choice").last().hover();
  await measure(".choice:last-child span", "hover response");
  const stage = page
    .getByRole("navigation", { name: "Rehearsal stages" })
    .getByRole("button", { name: /Waiting/ });
  await stage.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(stage).toBeFocused();
  await measure(".stage-nav button:focus-visible > div", "focused stage label");
  await measure(".related-label", "nested related-request label");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator(".stage-check summary").click();
  await measure(".stage-check summary", "mobile question summary");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await page.getByRole("button", { name: "Update record" }).first().click();
  await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
  await page.getByRole("button", { name: "Save record" }).click();
  await measure(".error", "record validation error");
  await page.getByLabel("Source of the record").fill("Synthetic source only");
  await page.getByLabel("Visit or area covered").fill("Example only");
  await page.getByRole("button", { name: "Save record" }).click();
  await measure(".status.confirmed", "self-recorded unverified confirmation");
  await measure(".status.unconfirmed", "unchecked request");
  await page
    .getByRole("button", { name: "Select & share", exact: true })
    .click();
  await page.getByRole("checkbox").first().check();
  await measure(
    ".share-choice:has(input:checked) strong",
    "selected disclosure category",
  );
  await measure(
    ".share-choice:has(input:checked) .status",
    "selected disclosure nested status",
  );
  await page.screenshot({
    path: "evidence/v2-selected-disclosure.png",
    fullPage: true,
  });
  await fs.writeFile(
    "evidence/v2-contrast.json",
    JSON.stringify(
      {
        rows,
        minimum: Math.min(...rows.map((x) => x.ratio)),
        scope:
          "Computed effective colors of actual nested text in Chrome; not complete WCAG certification",
      },
      null,
      2,
    ),
  );
});
