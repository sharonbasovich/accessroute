import { test, expect } from "@playwright/test";
test("keyboard rehearsal advances focus and native radio choice", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.getByRole("radio").first();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").last()).toBeChecked();
  await page.getByRole("button", { name: "Save & continue" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Make room for a calmer wait." }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio").first()).toBeChecked();
});
