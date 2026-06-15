import { expect, test } from "@playwright/test";

/**
 * Photo-upload, album-creation, and manual people-tagging persistence E2E. These
 * flows used to be demo theater; now they write to Postgres (upload/actions.ts,
 * albums/actions.ts, photos/[photoId]/actions.ts, people/actions.ts). Driven
 * against a seeded DB — no stubbing — proving the writes survive a reload. The
 * dev storage provider inlines uploaded bytes as a data: URL, so no
 * BLOB_READ_WRITE_TOKEN is needed in CI.
 *
 * Only five demo users are seeded (+15550000001…5) and login/social already use
 * 001–004, so both tests here reuse 005. The file runs SERIAL so the two sign-ins
 * don't race the dev OTP (newest code per phone wins). Persistence is checked
 * with reload-until-consistent (`expect(...).toPass()`), like social.spec.ts.
 */
test.describe.configure({ mode: "serial" });

async function signInAs005(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("login-phone").fill("+15550000005");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/home");
}

test("an uploaded photo (with a person tag) and a new album persist across a reload", async ({ page }) => {
  await signInAs005(page);

  // --- Upload a photo, tagging one person on the preview --------------------
  await page.goto("/upload");
  await page.getByTestId("upload-input").setInputFiles("e2e/fixtures/sample.png");
  await page.getByTestId("tagger-image").click({ position: { x: 30, y: 30 } }); // waits for the form
  await page.getByTestId("tagger-person").first().click();
  const photoTitle = `E2E uploaded photo ${Date.now()}`;
  await page.getByTestId("upload-title").fill(photoTitle);
  await page.getByTestId("upload-submit").click();
  await page.waitForURL(/\/photos\/.+/);
  const photoUrl = page.url();

  await expect(async () => {
    await page.reload();
    await expect(page).toHaveURL(photoUrl);
    await expect(page.getByText(photoTitle).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/1 face/i).first()).toBeVisible({ timeout: 3000 }); // the tag persisted
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

test("tagging a person via the photo modal — add and remove both persist", async ({ page }) => {
  await signInAs005(page);

  // Open a seeded photo via the first album.
  await page.goto("/albums");
  await page.locator('a[href^="/albums/"]').first().click();
  await page.waitForURL(/\/albums\/.+/);
  await page.locator('a[href^="/photos/"]').first().click();
  await page.waitForURL(/\/photos\/.+/);

  // Add a tag through the modal.
  await page.getByTestId("tag-people-button").click();
  const before = await page.getByTestId("tagger-remove").count();
  await page.getByTestId("tagger-image").click({ position: { x: 120, y: 90 } });
  await page.getByTestId("tagger-person").first().click();
  await expect(page.getByTestId("tagger-remove")).toHaveCount(before + 1); // optimistic

  // It survives a reload.
  await expect(async () => {
    await page.reload();
    await page.getByTestId("tag-people-button").click();
    await expect(page.getByTestId("tagger-remove")).toHaveCount(before + 1, { timeout: 3000 });
  }).toPass({ timeout: 20000 });

  // Removing a tag also persists.
  await page.getByTestId("tagger-remove").last().click();
  await expect(async () => {
    await page.reload();
    await page.getByTestId("tag-people-button").click();
    await expect(page.getByTestId("tagger-remove")).toHaveCount(before, { timeout: 3000 });
  }).toPass({ timeout: 20000 });

  // Tag someone NOT yet in the chest: add them inline, then they're tagged.
  // Single-token name so the chip's shortName equals the full (unique) name.
  const newName = `Newcomer${Date.now()}`;
  await page.getByTestId("tagger-image").click({ position: { x: 60, y: 140 } });
  await page.getByTestId("tagger-add-new").click();
  await page.getByTestId("tagger-search").fill(newName); // the search box doubles as the name
  await page.getByTestId("tagger-gender-f").click();
  await page.getByTestId("tagger-create").click();
  await expect(page.getByText(newName, { exact: false }).first()).toBeVisible(); // chip for the new person
  await expect(async () => {
    await page.reload();
    await page.getByTestId("tag-people-button").click();
    await expect(page.getByText(newName, { exact: false }).first()).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
});
