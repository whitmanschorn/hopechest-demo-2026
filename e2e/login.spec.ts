import { expect, test } from "@playwright/test";

/**
 * Login E2E. Exercises the real phone + one-time-code path end to end against a
 * seeded database — no stubbing. The dev phone provider surfaces the OTP, so the
 * one-click sign-in (LoginForm chains requestCode → verifyCode) lands a seeded
 * demo user straight on /home. Seeded demo numbers: +15550000001..5.
 *
 * Each test that signs in uses a DISTINCT demo number: verifyCode matches the
 * newest code issued for a phone, so two parallel logins on the same number
 * would race (the slower one's code is no longer the newest). Distinct numbers
 * keep the suite fully parallel.
 */

test("one-click demo sign-in lands a seeded user on /home", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("login-phone").fill("+15550000001"); // → Randal
  await page.getByTestId("login-submit").click();

  // One click runs the real OTP round-trip and redirects to the authenticated home.
  await page.waitForURL("**/home");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("the session persists across a reload (cookie was set)", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-phone").fill("+15550000002"); // → Paxton
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/home");

  // Reload: if the session cookie didn't stick, the proxy would bounce us to "/".
  await page.reload();
  await expect(page).toHaveURL(/\/home$/);
});

test("an unauthenticated protected page redirects to the login screen", async ({ page }) => {
  await page.goto("/home");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("login-phone")).toBeVisible();
});
