import { expect, test } from "@playwright/test";

/**
 * Demo banner + mailing-list signup, end to end against a seeded database.
 *
 * The mailing_list_signups table is intentionally NOT wiped by the seed (real
 * signups should survive a redeploy), so each run uses a unique email (Date.now)
 * to stay independent — the same trick social.spec uses for comment bodies.
 */

test("the demo banner links to the mailing list, and signups persist + dedupe", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto("/");

  // The banner shows on the public landing page and points at the signup.
  const banner = page.getByTestId("demo-banner");
  await expect(banner).toBeVisible();
  await banner.click();
  await expect(page).toHaveURL(/\/mailing-list$/);

  // First signup for this address → the fresh-success variant.
  await page.getByTestId("mailing-list-email").fill(email);
  await page.getByTestId("mailing-list-submit").click();
  const success = page.getByTestId("mailing-list-success");
  await expect(success).toBeVisible();
  await expect(success).toHaveAttribute("data-already", "false");
  await expect(success).toContainText(/on the list/i);

  // Signing up the SAME address again → still a success, but the "already"
  // variant. That it's detected on a fresh page load proves it persisted.
  await page.goto("/mailing-list");
  await page.getByTestId("mailing-list-email").fill(email);
  await page.getByTestId("mailing-list-submit").click();
  const again = page.getByTestId("mailing-list-success");
  await expect(again).toBeVisible();
  await expect(again).toHaveAttribute("data-already", "true");
  await expect(again).toContainText(/already/i);
});

test("the demo banner also shows inside the authenticated app shell", async ({ page }) => {
  await page.goto("/");

  // One-click demo sign-in drops us on /home inside the app shell.
  await page.getByTestId("login-demo").click();
  await page.waitForURL("**/home");

  await expect(page.getByTestId("demo-banner")).toBeVisible();
});
