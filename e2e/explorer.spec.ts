import { expect, test } from "@playwright/test";

test.describe("Explorer → detail → source drawer", () => {
  test("filter, open a detail page, open a source, and restore views from the URL", async ({ page }) => {
    await page.goto("/experiments");
    await page.getByRole("searchbox").waitFor();
    const filters = page.getByRole("complementary", { name: "Filters" });
    const isDesktop = await filters.isVisible();
    if (!isDesktop) await page.getByRole("button", { name: /Filters/ }).click();
    await page.getByRole("checkbox", { name: /Solid materials/ }).first().check();
    await expect(page).toHaveURL(/cat=solid/);
    if (!isDesktop) await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Table" }).click();
    await expect(page).toHaveURL(/view=table/);
    await expect(page.getByRole("table")).toBeVisible();

    // Reload restores filter + view.
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("link", { name: /^BASS-II/ })).toBeVisible();

    await page.getByRole("link", { name: /^BASS-II/ }).click();
    await expect(page).toHaveURL(/\/experiments\/bass-ii/);
    await expect(page.getByRole("heading", { level: 1, name: "BASS-II" })).toBeVisible();

    await page.getByRole("tab", { name: "Findings" }).click();
    await expect(page).toHaveURL(/tab=findings/);
    const chip = page.getByRole("button", { name: /^Open source:/ }).first();
    await chip.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Cited passage")).toBeVisible();
    await expect(drawer.locator("mark")).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Open original/ })).toHaveAttribute("href", /nasa\.gov/);
    await page.keyboard.press("Escape");

    // Reload restores the tab.
    await page.reload();
    await expect(page.getByRole("tab", { name: "Findings", selected: true })).toBeVisible();
  });

  test("search shows highlighted matches and is kept in the URL", async ({ page }) => {
    await page.goto("/experiments?q=smoke%20detector");
    await expect(page.getByRole("searchbox")).toHaveValue("smoke detector");
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("unknown experiment ids return 404", async ({ page }) => {
    const res = await page.goto("/experiments/not-a-real-experiment");
    expect(res?.status()).toBe(404);
  });
});
