import { expect, test } from '@playwright/test';

test('login page fits within short desktop viewport without vertical scrolling', async ({ page }) => {
  await page.route('**/api/org/companies/public/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          company_id: '30000000-0000-0000-0000-000000000001',
          route_no: 31,
          name: 'Seed Company',
        },
      ]),
    });
  });

  await page.setViewportSize({ width: 1366, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const mediaFrame = document.querySelector('.login-media-frame') as HTMLElement | null;
    const authPanel = document.querySelector('.login-auth-panel') as HTMLElement | null;
    const mediaImage = document.querySelector('.login-media-frame img') as HTMLElement | null;
    const placeholder = mediaFrame ? window.getComputedStyle(mediaFrame, '::before') : null;

    return {
      innerHeight: window.innerHeight,
      scrollHeight: root.scrollHeight,
      mediaHeight: mediaFrame?.getBoundingClientRect().height ?? 0,
      authHeight: authPanel?.getBoundingClientRect().height ?? 0,
      imageObjectPosition: mediaImage ? window.getComputedStyle(mediaImage).objectPosition : '',
      placeholderPosition: placeholder?.backgroundPosition ?? '',
    };
  });

  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight + 1);
  expect(layout.mediaHeight).toBeLessThan(layout.innerHeight);
  expect(layout.authHeight).toBeLessThanOrEqual(layout.innerHeight);
  expect(layout.imageObjectPosition).toBe('50% 100%');
  expect(layout.placeholderPosition).toBe('50% 100%');
});

test('login page turns the image into a top strip before hiding it', async ({ page }) => {
  await page.route('**/api/org/companies/public/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          company_id: '30000000-0000-0000-0000-000000000001',
          route_no: 31,
          name: 'Seed Company',
        },
      ]),
    });
  });

  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const content = document.querySelector('.login-landing-content') as HTMLElement | null;
    const mediaPanel = document.querySelector('.login-media-panel') as HTMLElement | null;
    const mediaFrame = document.querySelector('.login-media-frame') as HTMLElement | null;
    const authPanel = document.querySelector('.login-auth-panel') as HTMLElement | null;

    return {
      contentColumns: content ? window.getComputedStyle(content).gridTemplateColumns : '',
      mediaDisplay: mediaPanel ? window.getComputedStyle(mediaPanel).display : '',
      mediaTop: mediaPanel?.getBoundingClientRect().top ?? 0,
      authTop: authPanel?.getBoundingClientRect().top ?? 0,
      mediaHeight: mediaFrame?.getBoundingClientRect().height ?? 0,
      authHeight: authPanel?.getBoundingClientRect().height ?? 0,
      mediaRadius: mediaFrame ? window.getComputedStyle(mediaFrame).borderRadius : '',
      mediaBackground: mediaFrame ? window.getComputedStyle(mediaFrame).backgroundColor : '',
    };
  });

  expect(layout.contentColumns.split(' ').length).toBe(1);
  expect(layout.mediaDisplay).not.toBe('none');
  expect(layout.mediaTop).toBeLessThan(layout.authTop);
  expect(layout.mediaHeight).toBeGreaterThan(80);
  expect(layout.mediaHeight).toBeLessThan(128);
  expect(layout.authHeight).toBeGreaterThan(280);
  expect(layout.mediaRadius).toBe('0px');
  expect(layout.mediaBackground).toBe('rgb(3, 8, 7)');
});

test('login page removes the image panel before the form starts to overlap', async ({ page }) => {
  await page.route('**/api/org/companies/public/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          company_id: '30000000-0000-0000-0000-000000000001',
          route_no: 31,
          name: 'Seed Company',
        },
      ]),
    });
  });

  await page.setViewportSize({ width: 680, height: 820 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const mediaPanel = document.querySelector('.login-media-panel') as HTMLElement | null;
    const authPanel = document.querySelector('.login-auth-panel') as HTMLElement | null;
    const formShell = document.querySelector('.login-form-shell') as HTMLElement | null;

    return {
      mediaDisplay: mediaPanel ? window.getComputedStyle(mediaPanel).display : '',
      authMinHeight: authPanel ? window.getComputedStyle(authPanel).minHeight : '',
      authTop: authPanel?.getBoundingClientRect().top ?? 0,
      authBottom: authPanel?.getBoundingClientRect().bottom ?? 0,
      formTop: formShell?.getBoundingClientRect().top ?? 0,
      formBottom: formShell?.getBoundingClientRect().bottom ?? 0,
      innerHeight: window.innerHeight,
    };
  });

  expect(layout.mediaDisplay).toBe('none');
  expect(layout.formTop).toBeGreaterThan(layout.authTop);
  expect(layout.formBottom).toBeLessThan(layout.authBottom);
  expect(layout.authBottom).toBeLessThanOrEqual(layout.innerHeight);
});
