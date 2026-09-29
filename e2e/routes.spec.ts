import { expect, test } from "@playwright/test";

/** Every public route must render with status 200 and zero console errors. */
export const publicRoutes = [
  "/",
  "/dashboard",
  "/experiments",
  "/insights",
  "/lens",
  "/ask",
  "/compare",
  "/methods",
  "/about",
];

/** Dev-only routes must 404 on the production server. */
const devOnlyRoutes = ["/review", "/styleguide"];

for (const route of publicRoutes) {
  test(`route ${route} renders without console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), `status for ${route}`).toBe(200);
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors, `console errors on ${route}`).toEqual([]);
  });
}

for (const route of devOnlyRoutes) {
  test(`dev-only route ${route} is 404 in production`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
  });
}

test("unknown route shows the custom 404", async ({ page }) => {
  const response = await page.goto("/this-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("No evidence found")).toBeVisible();
});
