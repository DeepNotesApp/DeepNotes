import { test, expect } from "@playwright/test";

test("home page renders with sign-in link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Sign in")).toBeVisible();
  await expect(page.locator("text=DeepNotes")).toBeVisible();
});

test("login → home → page → groups → logout", async ({ page }) => {
  // 1. Start at login
  await page.goto("/login");
  await expect(page.locator("text=Sign in")).toBeVisible();

  // 2. Fill in login credentials (requires test user to exist)
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "testpassword123");
  await page.click('button[type="submit"]');

  // 3. Home should load with user summary
  await expect(page.locator("text=Signed in")).toBeVisible();

  // 4. Navigate to the starting page
  const startPageLink = page.locator('a[href^="/pages/"]');
  await expect(startPageLink.first()).toBeVisible();
  await startPageLink.first().click();

  // 5. Page editor should load
  await expect(page.locator("text=Loading page…")).not.toBeVisible({ timeout: 10000 });

  // 6. Navigate to Groups
  await page.goto("/groups");
  await expect(page.locator("text=Groups")).toBeVisible();
  await expect(page.locator("text=Personal")).toBeVisible();

  // 7. Logout
  await page.click("text=Sign out");
  await expect(page.locator("text=Sign in")).toBeVisible();
});
