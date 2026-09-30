import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** WCAG 2.1 A/AA scan of every public route and the main overlays. Fails on serious or critical violations. */

const ROUTES = [
  "/",
  "/dashboard?mission=lunar",
  "/experiments",
  "/experiments/flex",
  "/experiments/saffire-iv-vi?tab=data",
  "/insights?mission=lunar",
  "/lens?mission=lunar",
  "/ask?mission=lunar",
  "/ask?mission=lunar&q=Does%20lunar%20gravity%20make%20materials%20more%20flammable%3F",
  "/compare",
  "/compare?ids=bass-ii,saffire-ii,saffire-iv-vi",
  "/methods",
  "/about",
  "/this-does-not-exist",
];

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    if (route.includes("q=")) await expect(page.getByText(/Sources used/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("a11y: command palette open", async ({ page }) => {
  // networkidle: the ⌘K listener is attached on hydration; pressing earlier does nothing.
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  // Findings and glossary groups load with the full catalogue on first open.
  await page.getByPlaceholder(/Search experiments, findings/).fill("smoke");
  await expect(page.getByRole("option").first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("a11y: source drawer open", async ({ page }) => {
  await page.goto("/insights?mission=lunar");
  await page.getByRole("button", { name: /^Open source:/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open original/ })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("a11y: mini-ask sheet with an answer", async ({ page }) => {
  await page.goto("/methods");
  await page.getByRole("button", { name: "Ask the Flame" }).click();
  await page.getByRole("button", { name: /Does lunar gravity make materials more flammable\?/ }).click();
  await expect(page.getByText("Open in Ask the Flame")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});
