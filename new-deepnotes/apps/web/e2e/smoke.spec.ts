import { test, expect } from "@playwright/test";

test("home page renders with sign-in link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Sign in")).toBeVisible();
  await expect(page.locator("text=DeepNotes")).toBeVisible();
});

test("demo login → home → page → groups → logout", async ({ page }) => {
  // 1. Start at login and enter demo mode
  await page.goto("/login");
  await expect(page.locator("text=Sign in")).toBeVisible();
  await page.click("text=Try demo");

  // 2. Home should load with user summary
  await expect(page.locator("text=Signed in")).toBeVisible();
  await expect(page.locator("text=Demo")).toBeVisible();

  // 3. Navigate to the starting page
  const startPageLink = page.locator('a[href^="/pages/"]');
  await expect(startPageLink.first()).toBeVisible();
  await startPageLink.first().click();

  // 4. Page editor should load
  await expect(page.locator("text=Loading page…")).not.toBeVisible({ timeout: 10000 });

  // 5. Navigate to Groups
  await page.goto("/groups");
  await expect(page.locator("text=Groups")).toBeVisible();
  await expect(page.locator("text=Personal")).toBeVisible();

  // 6. Logout
  await page.click("text=Sign out");
  await expect(page.locator("text=Sign in")).toBeVisible();
});
