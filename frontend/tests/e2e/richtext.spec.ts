import { test, expect } from '@playwright/test';

test('toolbar bold preserves selection and applies <strong>', async ({ page }) => {
  // navigate directly to the demo page containing the editor
  await page.goto('/mui-demo?test=1');

  // Wait for the editor container to be present
  await page.waitForSelector('.richtext-container');

  // Focus the contentEditable area
  const editor = await page.locator('.richtext-contenteditable').first();
  await editor.click();

  // Type a short sentence
  await editor.type('Playwright test selection');

  // Select the word 'selection' by using keyboard to move to end, then shift+arrow to select
  // Move caret to end
  await page.keyboard.press('End');
  // Move left to the start of 'selection' (approx 9 chars)
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft');
  // Select to end
  await page.keyboard.down('Shift');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');

  // Click the bold button in the toolbar
  const boldButton = page.locator('button[aria-label="Bold"]').first();
  await boldButton.click();

  // Assert that the editor's HTML contains a <strong> wrapping the word 'selection'
  const html = await editor.evaluate((el) => (el as HTMLElement).innerHTML);
  expect(html).toMatch(/<strong>\s*selection\s*<\/strong>|<b>\s*selection\s*<\/b>/i);
});
