import { expect, test } from "@playwright/test";

/**
 * Breakpoint × motion sweep (Phase 11): every public route at tablet width with normal and reduced motion. Desktop and
 * mobile widths are covered by the two Playwright projects; this adds 768 px. Checks: status 200, zero console errors,
 * no horizontal overflow, and no running CSS animations left on the page when reduced motion is requested.
 */
const ROUTES = [
  "/",
  "/dashboard?mission=lunar",
  "/experiments",
  "/experiments/bass-ii",
  "/insights?mission=lunar",
  "/lens?mission=lunar",
  "/ask?mission=lunar",
  "/compare?ids=flex,flex-2,cfi",
  "/methods",
  "/about",
];

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`tablet 768 px, motion: ${reducedMotion}`, () => {
    test.use({ viewport: { width: 768, height: 1024 }, reducedMotion });
    // One project is enough for a fixed-viewport sweep.
    test.beforeEach(() => {
      test.skip(test.info().project.name !== "desktop", "tablet sweep runs once");
    });

    for (const route of ROUTES) {
      test(`${route}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(e.message));
        // "load" + settle rather than networkidle: under 4 parallel workers idle can take long, and it is not what we test.
        const res = await page.goto(route, { waitUntil: "load" });
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        await page.mouse.wheel(0, 1600);
        await page.waitForTimeout(800);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
        expect(errors, "console errors").toEqual([]);

        if (reducedMotion === "reduce") {
          // Infinite CSS animations (marquee, pulses, shimmer) must be neutralised under reduced motion.
          const running = await page.evaluate(
            () =>
              document
                .getAnimations()
                .filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().iterations ?? 1) === Infinity).length,
          );
          expect(running, "infinite animations running under reduced motion").toBe(0);
        }
      });
    }
  });
}
