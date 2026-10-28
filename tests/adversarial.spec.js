import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { seed, stages, KEY } from "../src/model.js";
async function install(page, state) {
  await page.goto("/");
  await page.evaluate(
    ({ state, key }) => localStorage.setItem(key, JSON.stringify(state)),
    { state, key: KEY },
  );
  await page.reload();
}
test("excluded markers absent from download, PDF content and non-share browser print", async ({
  page,
}) => {
  const s = seed();
  s.requests[0].text = "SELECTED_REQUEST_TOKEN";
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "SELECTED_SOURCE_TOKEN",
    scope: "SELECTED_SCOPE_TOKEN",
  });
  s.requests[1].text = "EXCLUDED_SENSORY_TOKEN";
  Object.assign(s.requests[1], {
    status: "confirmed",
    source: "EXCLUDED_SOURCE_TOKEN",
    scope: "EXCLUDED_SCOPE_TOKEN",
  });
  s.requests[2].text = "EXCLUDED_MOBILITY_TOKEN";
  s.choices = { waiting: stages[1].options[0] };
  s.visited = ["waiting"];
  await install(page, s);
  for (const name of ["Preferences", "Confirmation ledger"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.pdf({
      path: `evidence/adversarial-print-${name.replaceAll(" ", "-")}.pdf`,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  }
  await page.getByRole("button", { name: "Select & share" }).click();
  await page.pdf({
    path: "evidence/adversarial-print-no-preview.pdf",
    format: "A4",
  });
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  const note = await page.locator("#export-note").innerText();
  expect(note).toContain("SELECTED_SOURCE_TOKEN");
  expect(note).not.toContain("EXCLUDED_");
  expect(note).not.toContain(stages[1].options[0]);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download text" }).click();
  const download = await pending;
  expect(await fs.readFile(await download.path(), "utf8")).toBe(note);
  await page.pdf({
    path: "evidence/adversarial-selected.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.pdf({
    path: "evidence/adversarial-print-modal.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.getByRole("button", { name: "Keep my work" }).click();
  await expect(page.locator("#export-note")).toHaveText(note);
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
});
test("unrelated preference and cancelled record edits preserve evidence and only relevant stages reset", async ({
  page,
}) => {
  const s = seed();
  s.visited = stages.map((st) => st.id);
  s.choices = Object.fromEntries(stages.map((st) => [st.id, st.options[0]]));
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "KEEP_SOURCE_TOKEN",
    scope: "KEEP_SCOPE_TOKEN",
  });
  await install(page, s);
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await page.getByRole("button", { name: "Update record" }).first().click();
  await page.getByLabel("Source of the record").fill("UNSAVED_SOURCE_TOKEN");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".ledger-row").first()).toContainText(
    "KEEP_SOURCE_TOKEN",
  );
  await expect(page.locator(".ledger-row").first()).not.toContainText(
    "UNSAVED_SOURCE_TOKEN",
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#sensory").fill("A different synthetic sensory request.");
  await expect(page.locator(".progress-ring")).toHaveText("2/3");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(page.locator(".ledger-row").first()).toContainText(
    "KEEP_SOURCE_TOKEN",
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill("A changed communication request.");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(page.locator(".ledger-row").first()).not.toContainText(
    "KEEP_SOURCE_TOKEN",
  );
  await expect(page.locator(".progress-ring")).toHaveText("1/3");
});
test("maximum unicode fields remain one page; empty selection stays disabled", async ({
  page,
}) => {
  const s = seed();
  for (const r of s.requests)
    Object.assign(r, {
      text: "例".repeat(180),
      status: "confirmed",
      source: "例".repeat(100),
      scope: "例".repeat(140),
    });
  await install(page, s);
  await page.getByRole("button", { name: "Select & share" }).click();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await page.pdf({
    path: "evidence/adversarial-unicode-maximum.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.screenshot({
    path: "evidence/adversarial-unicode-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.locator("#communication").fill(" \n\t");
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Preview selected note" }),
  ).toBeDisabled();
});
test("rapid stage navigation and repeated finish never manufacture completed stops", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /3 Consultation/ }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Finish rehearsal" }).click();
  await expect(page.locator(".progress-ring")).toHaveText("1/3");
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Rehearse visit", exact: true })
      .click();
    await page.getByRole("button", { name: "Finish rehearsal" }).click();
  }
  await expect(page.locator(".progress-ring")).toHaveText("1/3");
  await page.reload();
  await expect(page.locator(".progress-ring")).toHaveText("1/3");
});
test("canonical control-only request cannot be selected or previewed", async ({
  page,
}) => {
  const s = seed();
  s.requests[0].text = "\u202e\u202c\u0000";
  await install(page, s);
  await page.getByRole("button", { name: "Select & share" }).click();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Preview selected note" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Update record" }).first(),
  ).toBeDisabled();
});

test("control-only evidence cannot be saved; corrected multilingual evidence survives export and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  for (const status of ["confirmed", "unavailable"]) {
    await page.getByRole("button", { name: "Update record" }).first().click();
    await page.getByLabel("Status", { exact: true }).selectOption(status);
    await page.getByLabel("Source of the record").fill("\u202e\u202c");
    await page.getByLabel("Visit or area covered").fill("Synthetic visit");
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByRole("alert")).toContainText("Add both a source");
    await expect(page.locator(".record-form")).toBeVisible();
    await page
      .getByLabel("Source of the record")
      .fill("\u202e中文 café email\u202c");
    await page.getByLabel("Visit or area covered").fill("\u2066\u2069");
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByRole("alert")).toContainText("Add both a source");
    await page
      .getByLabel("Visit or area covered")
      .fill("\u2066Demo 👋 visit\u2069");
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.locator(".record-form")).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "Select & share" }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Preview selected note" }).click();
    const note = await page.locator("#export-note").innerText();
    expect(note).toContain("Recorded source: 中文 café email");
    expect(note).toContain("Scope: Demo 👋 visit");
    expect(note).not.toMatch(/[\u202a-\u202e\u2066-\u2069]/);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download text" }).click();
    const download = await pending;
    expect(await fs.readFile(await download.path(), "utf8")).toBe(note);
    await page
      .getByRole("button", { name: "Confirmation ledger", exact: true })
      .click();
  }
});
