import { expect, test } from "@playwright/test";

/**
 * Photo-upload + album-creation persistence E2E. Both flows used to be demo
 * theater; now they write to Postgres (src/app/(app)/upload/actions.ts and
 * albums/actions.ts). Drives the real flows against a seeded DB — no stubbing —
 * and proves the writes survive a reload. The dev storage provider inlines the
 * uploaded bytes as a data: URL, so no BLOB_READ_WRITE_TOKEN is needed in CI.
 *
 * One combined test on a single demo number: only five demo users are seeded
 * (+15550000001…5) and login.spec/social.spec already use the others, so we
 * reuse the last free number once rather than racing the dev OTP (newest code
 * per phone wins). Persistence is checked with reload-until-consistent
 * (`expect(...).toPass()`), like e2e/social.spec.ts.
 */

test("an uploaded photo and a new album both persist across a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-phone").fill("+15550000005"); // → distinct seeded user
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/home");

  // --- Upload a photo -------------------------------------------------------
  await page.goto("/upload");
  await page.getByTestId("upload-input").setInputFiles("e2e/fixtures/sample.png");
  const photoTitle = `E2E uploaded photo ${Date.now()}`;
  await page.getByTestId("upload-title").fill(photoTitle); // waits for the form (image dims read client-side)
  await page.getByTestId("upload-submit").click();
  await page.waitForURL(/\/photos\/.+/);
  const photoUrl = page.url();

  await expect(async () => {
    await page.reload();
    await expect(page).toHaveURL(photoUrl);
    await expect(page.getByText(photoTitle).first()).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });

  // --- Create a standard album ---------------------------------------------
  await page.goto("/albums");
  await page.getByRole("button", { name: "Create album" }).click();
  const tiles = page.getByTestId("album-photo");
  await tiles.nth(0).click();
  await tiles.nth(1).click();
  const albumTitle = `E2E album ${Date.now()}`;
  await page.getByPlaceholder("e.g. Grandpa's workshop").fill(albumTitle);
  await page.getByTestId("album-create").click();
  await page.waitForURL(/\/albums\/.+/);
  const albumUrl = page.url();

  await expect(async () => {
    await page.reload();
    await expect(page).toHaveURL(albumUrl);
    await expect(page.getByText(albumTitle).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/2 photos/).first()).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
});
