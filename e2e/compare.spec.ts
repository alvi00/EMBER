import { expect, test } from "@playwright/test";

test.describe("Compare", () => {
  test("empty state offers ready-made comparisons", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByText("Pick up to three experiments")).toBeVisible();
    await page.getByRole("link", { name: /Flame spread at three scales/ }).click();
    await expect(page).toHaveURL(/ids=bass-ii,saffire-ii,saffire-iv-vi/);
    await expect(page.getByRole("heading", { level: 2, name: "BASS-II" })).toBeVisible();
  });

  test("three experiments side by side: conditions, table, findings; remove one", async ({ page }) => {
    await page.goto("/compare?ids=bass-ii,saffire-ii,saffire-iv-vi");
    await expect(page.getByRole("heading", { name: "Conditions tested" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Test points");
    await expect(page.getByText("strongest evidence first").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add experiment" })).toHaveCount(0);

    await page.getByRole("button", { name: "Remove Saffire-II from the comparison" }).click();
    await expect(page).toHaveURL(/ids=bass-ii,saffire-iv-vi/);
    await expect(page.getByRole("button", { name: /Add experiment/ })).toBeVisible();
  });

  test("add an experiment from the picker", async ({ page }) => {
    await page.goto("/compare?ids=flex");
    await page.getByRole("button", { name: /Add experiment/ }).click();
    await page.getByPlaceholder("Search experiments…").fill("CFI");
    await page.getByRole("option", { name: /^CFI\b/ }).first().click();
    await expect(page).toHaveURL(/ids=flex,cfi/);
  });

  test("detail page Compare button pre-selects the experiment", async ({ page }) => {
    await page.goto("/experiments/flex");
    await page.getByRole("link", { name: /Compare with/ }).click();
    await expect(page).toHaveURL(/compare\?ids=flex/);
    await expect(page.getByText("Add one or two more experiments")).toBeVisible();
  });
});
