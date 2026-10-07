import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The signed-out half of the account flow, which is the half a browser can
 * check without sending anyone an e-mail. Signing in for real is covered by
 * the database tests in tests/integration.
 */

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test("a signed-out visitor is sent from the app to the login page", async ({ page }) => {
  for (const path of ["/min-fryser", "/konto"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/logg-inn$/);
    await expect(page.getByRole("heading", { name: "Åpne fryseren din." })).toBeVisible();
  }
});

test("the demo stays open without an account", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
  await expect(page.getByText("DEMO", { exact: true })).toBeVisible();
  // The demo header keeps its own link; it must not show an account link.
  await expect(page.getByRole("link", { name: /Til forsiden/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Konto/ })).toHaveCount(0);
});

test("the login page rejects a malformed address without contacting anyone", async ({ page }) => {
  await page.goto("/logg-inn");
  // Accepted by the browser's own type=email check, refused by the server rule,
  // so this exercises the check that actually protects the endpoint.
  await page.getByLabel("E-postadresse").fill("a@b.c");
  await page.getByRole("button", { name: "Send innloggingslenke" }).click();
  // Scoped to the form's own message: Next.js keeps a route announcer with
  // role="alert" on every page.
  await expect(page.locator("form .inline-error")).toContainText("gyldig e-postadresse");
  await expect(page).toHaveURL(/\/logg-inn$/);
});

test("sign-in is reachable on desktop and on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "Logg inn" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // .nav-text is hidden below 760px, so the footer carries the link there.
  await expect(page.locator("footer").getByRole("link", { name: "Logg inn" })).toBeVisible();
  await noOverflow(page);
});

test("the new pages carry no contact address and do not overflow", async ({ page }) => {
  const address = ["kontakt", "swanecreative.no"].join("@");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/logg-inn", "/logg-inn/sjekk-e-post", "/auth/feil", "/min-fryser"]) {
      await page.goto(path);
      await noOverflow(page);
      expect(await page.locator("body").innerText()).not.toContain(address);
      expect(await page.locator("head").innerHTML()).not.toContain(address);
    }
  }
});

test("accessibility scan: login and the pages around it", async ({ page }) => {
  for (const path of ["/logg-inn", "/logg-inn/sjekk-e-post", "/auth/feil"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations, path).toEqual([]);
  }
});
