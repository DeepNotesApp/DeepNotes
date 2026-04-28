import { expect, test } from "@playwright/test";

test.describe("Demo session cookies (httpOnly + bootstrap)", () => {
  test("demo login stays signed in after reload; tokens not in document.cookie", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try demo" }).click();

    await expect(page.getByRole("heading", { name: "Signed in" })).toBeVisible({
      timeout: 60_000,
    });

    const cookieReport = await page.evaluate(() => ({
      documentCookie: document.cookie,
      hasAccessInDoc: document.cookie.includes("accessToken"),
      hasRefreshInDoc: document.cookie.includes("refreshToken"),
      hasLoggedInHint: document.cookie.includes("loggedIn"),
    }));

    expect(cookieReport.hasAccessInDoc).toBe(false);
    expect(cookieReport.hasRefreshInDoc).toBe(false);
    expect(cookieReport.hasLoggedInHint).toBe(true);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Signed in" })).toBeVisible({
      timeout: 60_000,
    });
  });
});
