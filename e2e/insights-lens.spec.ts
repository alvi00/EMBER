import { expect, test } from "@playwright/test";

test.describe("Insights re-rank", () => {
  test("Lunar mission: moving the weights changes the order and is kept in the URL", async ({ page }) => {
    await page.goto("/insights?mission=lunar");
    const cards = page.locator("ol > li article");
    await expect(cards.first()).toBeVisible();
    const before = await cards.evaluateAll((els) => els.slice(0, 8).map((e) => e.id));

    // Severity → 0, Actionability → max (keyboard on the Radix sliders).
    const sev = page.getByRole("slider").nth(0);
    await sev.focus();
    await page.keyboard.press("Home");
    const act = page.getByRole("slider").nth(3);
    await act.focus();
    await page.keyboard.press("End");

    await expect(page).toHaveURL(/w=0-30-20-100/);
    await expect
      .poll(async () => (await cards.evaluateAll((els) => els.slice(0, 8).map((e) => e.id))).join(","))
      .not.toBe(before.join(","));

    // Mission switch re-ranks too.
    await page.goto("/insights?mission=iss");
    const iss = await cards.evaluateAll((els) => els.slice(0, 8).map((e) => e.id));
    expect(iss.join(",")).not.toBe(before.join(","));
  });

  test("score breakdown popover shows the formula", async ({ page }) => {
    await page.goto("/insights?mission=lunar");
    await page.getByRole("button", { name: "How is this scored?" }).first().click();
    await expect(page.getByText("Score breakdown")).toBeVisible();
    await expect(page.getByText(/AI-draft factor/)).toBeVisible();
  });
});

test.describe("Habitat Risk Lens verdicts", () => {
  const fabric = encodeURIComponent("Thin fabric (cotton/fiberglass)");
  const cases = [
    { name: "ISS fabric cabin is directly tested", q: `g=0&o2=22&p=101.3&flow=20&fuel=${fabric}`, verdict: "Directly tested" },
    { name: "Lunar fabric cabin is near tested conditions", q: `g=0.166&o2=34&p=56.5&flow=20&fuel=${fabric}`, verdict: "Near tested conditions" },
    { name: "Mars low-pressure fabric cabin is an extrapolation", q: `g=0.38&o2=34&p=30&flow=50&fuel=${fabric}`, verdict: "Extrapolation, no direct evidence" },
  ];
  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await page.goto(`/lens?mission=lunar&${c.q}`);
      await expect(page.getByRole("heading", { level: 2, name: c.verdict })).toBeVisible();
      await expect(page.getByText("Research exploration tool. Not for operational safety decisions.")).toBeVisible();
    });
  }

  test("lunar cabin shows the partial-gravity warning and evidence gaps", async ({ page }) => {
    await page.goto("/lens?mission=lunar");
    await expect(page.getByText(/Partial-gravity behaviour cannot be read off/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence gaps" })).toBeVisible();
  });
});

test.describe("Shareable insight images", () => {
  test("each insight links to a PNG card; unknown ids are 404", async ({ page, request }) => {
    await page.goto("/insights?mission=lunar");
    const link = page.getByRole("link", { name: "Share image of insight 1 (PNG download)", exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    const img = await request.get(href!);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toContain("image/png");
    expect((await request.get("/api/share/not-a-finding")).status()).toBe(404);
  });
});
