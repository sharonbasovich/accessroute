import {test,expect} from '@playwright/test';
import {seed} from '../src/model.js';
test('baseline repeat activation discards source and scope',async({page})=>{
 await page.goto(process.env.ACCESSROUTE_ENTRY_PATH||'/');
 await page.getByRole('button',{name:'Confirmation ledger',exact:true}).click();
 const row=page.locator('.ledger-row').first();
 await row.getByRole('button',{name:'Update record'}).click();
 await row.getByLabel('Status',{exact:true}).selectOption('confirmed');
 await row.getByLabel('Source of the record').fill('SYNTHETIC DRAFT');
 await row.getByLabel('Visit or area covered').fill('SYNTHETIC SCOPE');
 await row.getByRole('button',{name:'Update record'}).click();
 await expect(row.getByLabel('Status',{exact:true})).toHaveValue(seed().requests[0].status);
 await expect(row.getByLabel('Source of the record')).toHaveCount(0);
 await expect(row.getByLabel('Visit or area covered')).toHaveCount(0);
 await page.screenshot({path:'evidence/ledger-draft-baseline.png',fullPage:true});
});
