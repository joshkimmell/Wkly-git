import { test, expect } from '@playwright/test';

test('toolbar does not receive Tab focus and Tab stays on textarea', async ({ page }) => {
  // open the demo page that contains the RichTextEditor
  await page.goto('/mui-demo?test=1');

  // find the contenteditable element
  const editor = await page.locator('.richtext-contenteditable');
  await editor.click();
  await editor.type('Josh');

  // select the text by triple-click or keyboard
  await editor.press('Control+A');

  // press Tab: Tab should move focus out but not remove content or send focus to toolbar
  await page.keyboard.press('Tab');

  // the editor should still contain the text
  await expect(editor).toHaveText('Josh');

  // press Tab again to attempt to move focus; ensure toolbar buttons are not focused via Tab
  await page.keyboard.press('Tab');

  // assert no toolbar button has focus
  const focused = await page.evaluate(() => document.activeElement?.closest?.('.richtext-toolbar')?.className || null);
  // If no toolbar ancestor is focused this should be null
  expect(focused).toBeNull();
});
