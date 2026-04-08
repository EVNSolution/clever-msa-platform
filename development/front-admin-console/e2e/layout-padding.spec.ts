import { expect, test } from '@playwright/test';

test('logged-in console pages keep outer content padding', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('change-me');
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page.getByRole('heading', { name: '운영 관리 현황' })).toBeVisible();

  const shellPadding = await page.locator('.console-content').evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      top: parseFloat(styles.paddingTop),
      right: parseFloat(styles.paddingRight),
      bottom: parseFloat(styles.paddingBottom),
      left: parseFloat(styles.paddingLeft),
    };
  });

  expect(shellPadding.top).toBeGreaterThanOrEqual(24);
  expect(shellPadding.right).toBeGreaterThanOrEqual(24);
  expect(shellPadding.bottom).toBeGreaterThanOrEqual(24);
  expect(shellPadding.left).toBeGreaterThanOrEqual(24);
});
