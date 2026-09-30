import { expect, test } from "@playwright/test";

// The e2e server runs with AI_PROVIDER=offline (playwright.config.ts), so these tests cover the no-key demo path.

test.describe("Ask the Flame (offline)", () => {
  test("a suggested question streams a saved, cited answer; a citation opens the source drawer", async ({ page }) => {
    await page.goto("/ask?mission=lunar");
    await expect(page.getByText("Offline mode", { exact: true })).toBeVisible();
    await page
      .getByRole("complementary", { name: /Suggestions/ })
      .getByRole("button", { name: /Does lunar gravity make materials more flammable\?/ })
      .click();

    await expect(page).toHaveURL(/q=Does\+lunar\+gravity|q=Does%20lunar%20gravity/);
    await expect(page.getByText(/Offline mode · saved answer/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /What the evidence shows/i })).toBeVisible();
    await expect(page.getByText(/Sources used \(\d+\)/)).toBeVisible();

    const chip = page.getByRole("article").getByRole("button", { name: /^Open source:/ }).first();
    await chip.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Open original/ })).toBeVisible();
  });

  test("an out-of-scope question is declined without citations", async ({ page }) => {
    await page.goto("/ask?mission=iss");
    const input = page.getByLabel("Your question");
    await input.fill("Who won the 2022 FIFA World Cup?");
    await input.press("Enter");
    await expect(page.getByText("Outside the evidence", { exact: true })).toBeVisible();
    await expect(page.getByText(/The dataset does not cover this/)).toBeVisible();
    await expect(page.getByRole("article").getByRole("button", { name: /^Open source:/ })).toHaveCount(0);
  });

  test("deep link from the dashboard asks immediately", async ({ page }) => {
    await page.goto(`/ask?mission=gateway&q=${encodeURIComponent("What happens to smoke detection in a small spacecraft?")}`);
    await expect(page.getByText(/Offline mode · saved answer/)).toBeVisible();
    await expect(page.getByText(/Sources used \(\d+\)/)).toBeVisible();
  });

  test("the API rejects empty questions and never exposes the provider key", async ({ request }) => {
    const bad = await request.post("/api/ask", { data: { question: "", mission: "lunar" } });
    expect(bad.status()).toBe(400);
    const ok = await request.post("/api/ask", { data: { question: "Are cool flames a hazard in spacecraft?", mission: "marsTransit" } });
    const body = await ok.text();
    expect(body).toContain('"type":"meta"');
    expect(body).not.toMatch(/gsk_|sk-|AIza/);
  });
});

test.describe("Mission Control digest", () => {
  test("shows the saved AI digest with citations for the mission", async ({ page }) => {
    await page.goto("/dashboard?mission=lunar");
    await expect(page.getByText(/AI summary of the six top-ranked findings/)).toBeVisible();
  });
});
