import { expect, test } from "@playwright/test";

// Demo path step 1 (project.md §12): the gravity slider moves Earth → Mars → Moon → Space and the flame follows.
test("landing gravity slider steps through Earth, Mars, Moon and Space", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const slider = page.locator('input[type="range"]').first();
  await expect(slider).toHaveAttribute("aria-valuetext", /Earth/);
  for (const [label, g] of [
    ["Mars", "0.38 g"],
    ["Moon", "0.17 g"],
    ["Space", "0 g"],
  ] as const) {
    await page.getByRole("button", { name: `Set gravity to ${label}, ${label === "Moon" ? "0.17 g" : g}` }).click();
    await expect(slider).toHaveAttribute("aria-valuetext", new RegExp(label));
  }
  // The stage is either the live flame (after first interaction) or its poster frames; both must be present in the hero.
  await expect(page.locator("canvas, img[src*='/flame/poster-']").first()).toBeAttached();
});

test("landing CTAs lead to Mission Control and Ask", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Open Mission Control/ }).first()).toHaveAttribute("href", /\/dashboard/);
  await expect(page.getByRole("link", { name: /Ask the Flame/ }).first()).toHaveAttribute("href", /\/ask/);
});
