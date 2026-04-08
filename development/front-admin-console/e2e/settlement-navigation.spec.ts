import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('change-me');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '운영 관리 현황' })).toBeVisible();
}

test('settlement uses a single sidebar entry and local step tabs', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('link', { name: '정산' })).toBeVisible();
  await page.getByRole('link', { name: '정산' }).click();
  await expect(page).toHaveURL(/\/settlements\/overview$/);
  await expect(page.getByRole('link', { name: '정산 조회' })).toBeVisible();
  await expect(page.getByRole('link', { name: '정산 실행' })).toBeVisible();
  await expect(page.getByRole('link', { name: '정산 조회' })).toHaveCount(1);
  await expect(page.getByRole('link', { name: '정산 실행' })).toHaveCount(1);

  await page.getByRole('link', { name: '정산 실행' }).click();
  await expect(page).toHaveURL(/\/settlements\/runs$/);
  await expect(page.getByRole('heading', { name: '정산 실행 요약' })).toBeVisible();
});
