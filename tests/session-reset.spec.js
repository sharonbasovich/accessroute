import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { KEY, seed } from '../src/model.js';
const entry = process.env.ACCESSROUTE_ENTRY_PATH || '/';
for (const failure of ['quota', 'locks']) {
  test(`session-only reset preserves saved data after ${failure} recovers`, async ({ page }) => {
    await page.goto(entry);
    await expect(page.locator('.local')).toHaveText('Saved on this browser');
    await page.getByRole('button', {name:'Preferences',exact:true}).click();
    await page.locator('#communication').fill('SYNTHETIC SAVED REQUEST');
    await expect(page.locator('.local')).toHaveText('Saved on this browser');
    const before = await page.evaluate(key => localStorage.getItem(key), KEY);
    await page.evaluate(failure => {
      if(failure === 'quota') {
        const original = Storage.prototype.setItem;
        window.restoreStorage = () => {Storage.prototype.setItem = original;};
        Storage.prototype.setItem = function(){throw new DOMException('Full','QuotaExceededError');};
      } else {
        const original = navigator.locks.request.bind(navigator.locks);
        window.restoreStorage = () => {navigator.locks.request = original;};
        navigator.locks.request = () => Promise.reject(new Error('Unavailable'));
      }
    }, failure);
    await page.locator('#communication').fill('SYNTHETIC UNSAVED REQUEST');
    await expect(page.getByRole('alert')).toContainText('only for this session');
    await page.getByRole('button',{name:'Reset demo',exact:true}).click();
    await expect(page.getByRole('dialog')).toContainText('Saved browser data is unchanged.');
    await page.evaluate(() => window.restoreStorage());
    await page.getByRole('button',{name:'Reset demo data',exact:true}).click();
    await page.getByRole('button',{name:'Preferences',exact:true}).click();
    await expect(page.locator('#communication')).toHaveValue(seed().requests[0].text);
    await expect(page.locator('.local')).toHaveText('Session only');
    expect(await page.evaluate(key => localStorage.getItem(key),KEY)).toBe(before);
    await page.locator('#communication').fill('SYNTHETIC RESET SESSION EDIT');
    await expect(page.locator('.local')).toHaveText('Session only');
    expect(await page.evaluate(key => localStorage.getItem(key),KEY)).toBe(before);
    if(failure === 'quota') {
      await page.setViewportSize({width:375,height:812});
      await page.emulateMedia({reducedMotion:'reduce'});
      expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:'evidence/session-reset-mobile.png',fullPage:true});
      await page.setViewportSize({width:1280,height:900});
      await page.screenshot({path:'evidence/session-reset-desktop.png',fullPage:true});
    }
    await page.reload();
    await expect(page.locator('.local')).toHaveText('Saved on this browser');
    await page.getByRole('button',{name:'Preferences',exact:true}).click();
    await expect(page.locator('#communication')).toHaveValue('SYNTHETIC SAVED REQUEST');
  });
}
test('cancelling session-only reset does not prevent a recovered save', async ({page}) => {
  await page.goto(entry);
  await expect(page.locator('.local')).toHaveText('Saved on this browser');
  await page.getByRole('button',{name:'Preferences',exact:true}).click();
  await page.evaluate(() => {const original=Storage.prototype.setItem;window.restoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=()=>{throw Error('Unavailable');};});
  await page.locator('#communication').fill('SYNTHETIC UNSAVED');
  await expect(page.getByRole('alert')).toContainText('only for this session');
  await page.getByRole('button',{name:'Reset demo',exact:true}).click();
  await page.getByRole('button',{name:'Keep my work',exact:true}).click();
  await page.evaluate(()=>window.restoreStorage());
  await page.locator('#communication').fill('SYNTHETIC RECOVERED');
  await expect(page.locator('.local')).toHaveText('Saved on this browser');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).requests[0].text,KEY)).toBe('SYNTHETIC RECOVERED');
});
