import { expect, test } from "@playwright/test";

/**
 * Social-layer persistence E2E. Posting a comment and reacting used to be
 * optimistic-only; now they write to Postgres (see src/app/(app)/photos/
 * [photoId]/actions.ts). This drives the real flow against a seeded DB — no
 * stubbing — and proves the writes survive a full reload.
 *
 * Reacting to the comment WE just posted (rather than the photo) keeps the test
 * deterministic: the seed sprinkles reactions across photos at random, but a
 * brand-new comment starts with exactly zero. Uses a distinct demo number from
 * login.spec so the suite stays fully parallel (the dev OTP matches newest-per-
 * phone, so sharing a number would race).
 */

test("a comment and a reaction persist across a reload", async ({ page }) => {
  // Sign in (one-click demo path) and land on /home.
  await page.goto("/");
  await page.getByTestId("login-phone").fill("+15550000004"); // → distinct seeded user
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/home");

  // Walk into a photo via the first album → its first photo.
  await page.goto("/albums");
  await page.locator('a[href^="/albums/"]').first().click();
  await page.waitForURL(/\/albums\/.+/);
  await page.locator('a[href^="/photos/"]').first().click();
  await page.waitForURL(/\/photos\/.+/);
  const photoUrl = page.url();

  // Post a comment with a body unique to this run.
  const body = `E2E persisted comment ${Date.now()}`;
  await page.getByPlaceholder("Add a comment…").fill(body);
  await page.getByRole("button", { name: "Post comment" }).click();

  // It shows immediately (optimistic), and the row is now ours to react to.
  const myComment = page.getByTestId("comment").filter({ hasText: body });
  await expect(myComment).toBeVisible();

  // React to our own comment: open its picker, pick a heart, see the count.
  await myComment.getByRole("button", { name: "Add reaction" }).first().click();
  await myComment.getByTestId("reaction-picker").getByRole("button", { name: "❤️" }).click();
  await expect(myComment.getByRole("button", { name: /❤️/ })).toContainText("1");

  // Reload straight from the DB — both writes are still here.
  await page.reload();
  await expect(page).toHaveURL(photoUrl);
  const persisted = page.getByTestId("comment").filter({ hasText: body });
  await expect(persisted).toBeVisible();
  await expect(persisted.getByRole("button", { name: /❤️/ })).toContainText("1");
});
