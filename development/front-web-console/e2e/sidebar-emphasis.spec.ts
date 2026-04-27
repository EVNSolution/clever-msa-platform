import { expect, test } from '@playwright/test';

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'seed-admin@example.com';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'ChangeMe123!';

test('sidebar makes the active item dominant and keeps inactive items visually quieter', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('아이디').fill(adminEmail);
  await page.getByLabel('비밀번호').fill(adminPassword);
  await page.getByRole('button', { name: '로그인' }).click();

  const mainNavigation = page.getByLabel('주 메뉴');
  const activeLink = mainNavigation.getByRole('link', { name: '내 계정' });
  const inactiveLink = mainNavigation.getByRole('link', { name: '대시보드' });

  await expect(activeLink).toBeVisible();
  await expect(inactiveLink).toBeVisible();

  const activeStyles = await activeLink.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      fontWeight: styles.fontWeight,
    };
  });

  const inactiveStyles = await inactiveLink.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      fontWeight: styles.fontWeight,
    };
  });

  expect(activeStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(Number.parseInt(activeStyles.fontWeight, 10)).toBeGreaterThanOrEqual(700);
  expect(inactiveStyles.backgroundColor).not.toBe(activeStyles.backgroundColor);
  expect(inactiveStyles.color).not.toBe(activeStyles.color);
  expect(Number.parseInt(inactiveStyles.fontWeight, 10)).toBeLessThan(Number.parseInt(activeStyles.fontWeight, 10));
  await expect(page.locator('.console-home-icon.is-secondary')).toHaveCount(0);
});
