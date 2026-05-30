import { test, expect } from "@playwright/test";

test("home page renders with sign-in link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Sign in")).toBeVisible();
  await expect(page.locator("text=DeepNotes")).toBeVisible();
});
