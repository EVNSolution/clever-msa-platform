import { expect, test } from '@playwright/test';

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'seed-admin@example.com';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'ChangeMe123!';

test('logged-in console pages keep outer content padding', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('아이디').fill(adminEmail);
  await page.getByLabel('비밀번호').fill(adminPassword);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 계정' })).toBeVisible();

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
