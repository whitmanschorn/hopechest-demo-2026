import { expect, test } from "@playwright/test";

/**
 * Social-layer persistence E2E. Posting a comment and reacting used to be
 * optimistic-only; now they write to Postgres (see src/app/(app)/photos/
 * [photoId]/actions.ts). This drives the real flow against a seeded DB — no
 * stubbing — and proves the writes survive a full reload.
 *
 * Two rules keep it deterministic:
 *  - We react to the comment WE just posted rather than the photo: the seed
 *    sprinkles reactions across photos at random, but a fresh comment starts
 *    with exactly zero, so asserting a count of 1 is unambiguous.
 *  - Persistence is checked by reloading until the server reflects the write
 *    (`expect(...).toPass()`), not by trusting a one-shot `networkidle` — a
 *    transition-fired server action can still be committing when a single reload
 *    races ahead of it. We also let the post settle (and the optimistic `local-`
 *    id reconcile to the persisted one) before reacting, so the reaction targets
 *    a comment the server actually has.
 *
 * Uses a distinct demo number from login.spec so the suite stays fully parallel
 * (the dev OTP matches newest-per-phone, so sharing a number would race).
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

  // Let the write + refresh settle so the row is in the DB and the optimistic
  // node has been replaced by the persisted one (with its real id).
  const myComment = page.getByTestId("comment").filter({ hasText: body });
  await expect(myComment).toBeVisible();
  await page.waitForLoadState("networkidle");

  // React to our own (now persisted) comment: open its picker, pick a heart.
  await myComment.getByRole("button", { name: "Add reaction" }).first().click();
  await myComment.getByTestId("reaction-picker").getByRole("button", { name: "❤️" }).click();
  await expect(myComment.getByRole("button", { name: /❤️/ })).toContainText("1"); // optimistic

  // Reload from the DB and confirm both writes survived. Retry the reload until
  // the server reflects the reaction — the action may still be committing when
  // the first reload fires.
  await expect(async () => {
    await page.reload();
    await expect(page).toHaveURL(photoUrl);
    const persisted = page.getByTestId("comment").filter({ hasText: body });
    await expect(persisted).toBeVisible({ timeout: 3000 });
    await expect(persisted.getByRole("button", { name: /❤️/ })).toContainText("1", { timeout: 3000 });
  }).toPass({ timeout: 20000 });
});
