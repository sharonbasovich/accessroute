import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { KEY, seed } from '../src/model.js';
const entry = process.env.ACCESSROUTE_ENTRY_PATH || '/';
async function openLedger(page) {
  await page.goto(entry);
  await expect(page.locator('.local')).toHaveText('Saved on this browser');
  await page.getByRole('button', {name:'Confirmation ledger', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Make the unknowns visible.'})).toBeFocused();
}
for (const viewport of [{width:1280,height:900},{width:375,height:812}]) {
  test(`same-row activation preserves the unsaved record at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await openLedger(page);
    const row = page.locator('.ledger-row').first();
    const trigger = row.getByRole('button', {name:'Update record'});
    await trigger.click();
    await row.getByLabel('Status', {exact:true}).selectOption('confirmed');
    await row.getByLabel('Source of the record').fill('SYNTHETIC UNSAVED SOURCE');
    await row.getByLabel('Visit or area covered').fill('SYNTHETIC UNSAVED SCOPE');
    await trigger.click();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(row.getByLabel('Status', {exact:true})).toHaveValue('confirmed');
    await expect(row.getByLabel('Source of the record')).toHaveValue('SYNTHETIC UNSAVED SOURCE');
    await expect(row.getByLabel('Visit or area covered')).toHaveValue('SYNTHETIC UNSAVED SCOPE');
    expect((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)).requests[0]).toEqual(seed().requests[0]);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`evidence/ledger-draft-${viewport.width}.png`,fullPage:true});
    await row.getByRole('button',{name:'Save record',exact:true}).click();
    await expect(page.locator('.local')).toHaveText('Saved on this browser');
    await expect(trigger).toBeFocused();
    await expect(row.locator('.record')).toContainText('SYNTHETIC UNSAVED SOURCE');
    await trigger.click();
    await row.getByLabel('Source of the record').fill('SYNTHETIC CANCELLED CHANGE');
    await trigger.click();
    await row.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(row.getByLabel('Source of the record')).toHaveValue('SYNTHETIC UNSAVED SOURCE');
    await row.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.reload();
    await page.getByRole('button',{name:'Confirmation ledger',exact:true}).click();
    await expect(row.locator('.record')).toContainText('SYNTHETIC UNSAVED SOURCE');
  });
}
test('same-row activation preserves validation errors and switching rows initializes the chosen saved record', async ({page}) => {
  await openLedger(page);
  const rows=page.locator('.ledger-row');
  const row=rows.first();
  await row.getByRole('button',{name:'Update record'}).click();
  await row.getByLabel('Status',{exact:true}).selectOption('unavailable');
  await row.getByLabel('Source of the record').fill('SYNTHETIC PARTIAL SOURCE');
  await row.getByRole('button',{name:'Save record',exact:true}).click();
  await expect(row.getByRole('alert')).toContainText('both a source');
  await row.getByRole('button',{name:'Update record'}).click();
  await expect(row.getByRole('alert')).toContainText('both a source');
  await expect(row.getByLabel('Status',{exact:true})).toHaveValue('unavailable');
  await expect(row.getByLabel('Source of the record')).toHaveValue('SYNTHETIC PARTIAL SOURCE');
  await row.getByRole('button',{name:'Cancel',exact:true}).click();
  await rows.nth(1).getByRole('button',{name:'Update record'}).click();
  await expect(rows.nth(1).getByLabel('Status',{exact:true})).toHaveValue(seed().requests[1].status);
  await expect(page.locator('.record-form')).toHaveCount(1);
});
