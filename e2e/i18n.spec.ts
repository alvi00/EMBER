import { expect, test } from "@playwright/test";

// Bengali toggle (project.md Phase 11 stretch): key UI copy switches, marked lang="bn"; evidence stays in English.
test("the বাংলা toggle translates key copy, persists across pages and switches back", async ({ page, isMobile }) => {
  await page.goto("/insights?mission=lunar", { waitUntil: "networkidle" });
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Ranked insights");

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Show key text in Bengali" }).click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: "Show key text in Bengali" }).click();
  }
  await expect(heading).toHaveText("র‍্যাঙ্ক করা অন্তর্দৃষ্টি");
  await expect(heading.locator('[lang="bn"]')).toHaveCount(1);
  // Findings are quoted evidence and stay in English.
  await expect(page.getByText(/AI draft/).first()).toBeVisible();

  await page.goto("/dashboard?mission=lunar", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("মিশন কন্ট্রোল");

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Show key text in English" }).click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: "Show key text in English" }).click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission Control");
});
