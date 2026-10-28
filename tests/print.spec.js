import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("one-page print maximum supported fields and selected-only content", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  for (const id of ["communication", "sensory", "mobility"])
    await page
      .locator("#" + id)
      .fill(("Synthetic " + id + " request. ").repeat(12).slice(0, 180));
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Update record" }).nth(i).click();
    await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
    await page
      .getByLabel("Source of the record")
      .fill("Fictional source. ".repeat(8).slice(0, 100));
    await page
      .getByLabel("Visit or area covered")
      .fill("Demo scope only. ".repeat(10).slice(0, 140));
    await page.getByRole("button", { name: "Save record" }).click();
  }
  await page.getByRole("button", { name: "Select & share" }).click();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await page.screenshot({
    path: "evidence/maximum-note-preview.png",
    fullPage: true,
  });
  await page.pdf({
    path: "output/pdf/maximum-note.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.getByRole("checkbox").nth(1).uncheck();
  await page.getByRole("checkbox").nth(2).uncheck();
  await page.getByRole("button", { name: "Preview selected note" }).click();
  await fs.writeFile(
    "evidence/selected-note.txt",
    await page.locator("#export-note").innerText(),
  );
  await page.pdf({
    path: "output/pdf/selected-note.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.screenshot({
    path: "evidence/selected-note-preview.png",
    fullPage: true,
  });
});
