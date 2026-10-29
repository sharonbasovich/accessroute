import { test, expect } from "@playwright/test";

for (const action of ["Cancel", "Save record"]) {
  test(`${action} returns keyboard focus to the matching ledger request`, async ({
    page,
  }) => {
    await page.goto(process.env.ACCESSROUTE_ENTRY_PATH || "/");
    await page
      .getByRole("button", { name: "Confirmation ledger", exact: true })
      .click();
    // Workspace navigation deliberately moves focus to its heading. Wait for it
    // before sending a key to a different control.
    await expect(
      page.getByRole("heading", { name: "Make the unknowns visible." }),
    ).toBeFocused();
    for (const index of [0, 1, 2]) {
      const row = page.locator(".ledger-row").nth(index);
      const trigger = row.getByRole("button", { name: "Update record" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await page
        .getByLabel("Status", { exact: true })
        .selectOption("confirmed");
      await page
        .getByLabel("Source of the record")
        .fill(`Fictional source ${index}`);
      await page
        .getByLabel("Visit or area covered")
        .fill(`Demo scope ${index}`);
      await page.getByRole("button", { name: action, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".record-form")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      // Reopen directly from the restored focus, without searching the page again.
      await page.keyboard.press("Enter");
      if (action === "Save record") {
        await expect(page.getByLabel("Source of the record")).toHaveValue(
          `Fictional source ${index}`,
        );
        await expect(page.getByLabel("Visit or area covered")).toHaveValue(
          `Demo scope ${index}`,
        );
      } else {
        await expect(
          page.getByLabel("Status", { exact: true }),
        ).not.toHaveValue("confirmed");
      }
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(trigger).toBeFocused();
    }
  });
}

test("invalid evidence keeps the keyboard user in the open record", async ({
  page,
}) => {
  await page.goto(process.env.ACCESSROUTE_ENTRY_PATH || "/");
  await page
    .getByRole("button", { name: "Confirmation ledger", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make the unknowns visible." }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Update record" }).first().click();
  await page.getByLabel("Status", { exact: true }).selectOption("confirmed");
  const save = page.getByRole("button", { name: "Save record", exact: true });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("both a source");
  await expect(save).toBeFocused();
  await expect(page.locator(".record-form")).toBeVisible();
});
