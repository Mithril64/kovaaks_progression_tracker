import { expect, test } from "@playwright/test";

test("dashboard renders in frontend preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Kovaak's Progression Tracker")).toBeVisible();
  await expect(page.getByText("1wall6targets small")).toBeVisible();
});
