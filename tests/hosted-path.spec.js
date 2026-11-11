import { test, expect } from "@playwright/test";

// Run alongside the complete suite. A root fallback must not hide a misplaced
// project-path build, and all production scripts/styles must come from that path.
test("configured entry and hosted assets stay inside the project path", async ({ page, request }) => {
  const entry = process.env.ACCESSROUTE_ENTRY_PATH || "/";
  const document = await page.goto(entry);
  expect(document.ok()).toBe(true);
  await expect(page.locator(".local")).toHaveText("Saved on this browser");
  expect(new URL(page.url()).pathname).toBe(entry);
  if (entry === "/") return;

  const root = await request.get("/");
  expect(await root.text()).not.toContain('<div id="root">');
  const assets = await page.locator('script[src], link[rel="stylesheet"][href]').evaluateAll(
    (nodes) => nodes.map((node) => node.src || node.href),
  );
  expect(assets.length).toBeGreaterThanOrEqual(2);
  for (const asset of assets) {
    const url = new URL(asset);
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.pathname.startsWith(`${entry}assets/`)).toBe(true);
    expect((await request.get(asset)).ok()).toBe(true);
  }
});
