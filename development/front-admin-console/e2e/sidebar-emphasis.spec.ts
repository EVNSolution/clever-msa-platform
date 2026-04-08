import { expect, test } from '@playwright/test';

test('sidebar makes the active item dominant and keeps inactive items visually quieter', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('change-me');
  await page.getByRole('button', { name: '로그인' }).click();

  const activeLink = page.getByRole('link', { name: '대시보드' });
  const inactiveLink = page.getByRole('link', { name: '공지' });

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
    };
  });

  expect(activeStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(Number.parseInt(activeStyles.fontWeight, 10)).toBeGreaterThanOrEqual(700);
  expect(inactiveStyles.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(inactiveStyles.color).not.toBe(activeStyles.color);
  await expect(page.locator('.console-home-icon.is-secondary')).toHaveCount(0);
});
