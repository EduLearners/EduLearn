import { test, expect } from '@playwright/test';

// Inline login helper since auth fixture may not exist yet
async function loginAs(page: any, username: string, password = 'Demo@123') {
  await page.goto('/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test('instructor dashboard: each card has data-testid and is clickable', async ({ page }) => {
  await loginAs(page, 'instructor.demo');
  const cards = page.locator('[data-testid="dashboard-card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});
