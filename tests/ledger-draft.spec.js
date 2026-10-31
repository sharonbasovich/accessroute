import { test, expect } from '@playwright/test';
const entry = process.env.ACCESSROUTE_ENTRY_PATH || '/';
test('same-row Update record currently replaces the unsaved draft (baseline)', async ({page}) => {
  await page.goto(entry);
  await page.getByRole('button', {name:'Confirmation ledger', exact:true}).click();
  const row = page.locator('.ledger-row').first();
  await row.getByRole('button', {name:'Update record'}).click();
  await row.getByLabel('Status', {exact:true}).selectOption('confirmed');
  await row.getByLabel('Source of the record').fill('SYNTHETIC UNSAVED SOURCE');
  await row.getByLabel('Visit or area covered').fill('SYNTHETIC UNSAVED SCOPE');
  await row.getByRole('button', {name:'Update record'}).click();
  await expect(row.getByLabel('Status', {exact:true})).toHaveValue('unconfirmed');
  await expect(row.getByLabel('Source of the record')).toHaveCount(0);
  await page.screenshot({path:'evidence/ledger-draft-baseline.png',fullPage:true});
});
