import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('baseline: a stale tab resurrects data after reset in another tab', async ({ context }) => {
  const a = await context.newPage();
  await a.goto('/');
  await a.getByRole('button', {name: 'Preferences', exact: true}).click();
  await a.locator('#communication').fill('SYNTHETIC OLD REQUEST TO RESET');
  const b = await context.newPage();
  await b.goto('/');
  await b.getByRole('button', {name: 'Preferences', exact: true}).click();
  await expect(b.locator('#communication')).toHaveValue('SYNTHETIC OLD REQUEST TO RESET');
  await a.getByRole('button', {name: 'Reset demo', exact: true}).click();
  await a.getByRole('button', {name: 'Reset demo data', exact: true}).click();
  await expect.poll(() => a.evaluate(() => JSON.parse(localStorage.getItem('accessroute.demo.v1')).requests[0].text)).not.toBe('SYNTHETIC OLD REQUEST TO RESET');
  await b.locator('#sensory').fill('SYNTHETIC SECOND TAB EDIT');
  await expect.poll(() => a.evaluate(() => JSON.parse(localStorage.getItem('accessroute.demo.v1')).requests[0].text)).toBe('SYNTHETIC OLD REQUEST TO RESET');
  await fs.writeFile('evidence/storage-baseline.json', JSON.stringify({defect:'stale tab resurrected reset request', baseline:'dff3a03', reproduced:true}));
  await b.screenshot({path:'evidence/storage-baseline.png',fullPage:true});
});
