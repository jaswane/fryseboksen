import { expect, test, type Page } from "@playwright/test";

const visual = (page: Page) => page.locator(".journey-stage .scroll-freezer");
async function step(page: Page, index: number) {
  await page
    .locator(".journey-section")
    .nth(index)
    .evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
}
async function rendered(page: Page, frame: number) {
  await expect(visual(page)).toHaveAttribute("data-frame", String(frame));
  expect(
    await visual(page)
      .locator("img")
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
}

test("scroll opens only on movement, holds between 2 and 3, turns at 4 and reverses", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await rendered(page, 1);
  await expect(page.locator("video,canvas")).toHaveCount(0);
  await page.evaluate(() => {
    const root = document.querySelector(".freezer-journey")!;
    const second = document.querySelector('[data-story-stage="0"]')!;
    const top = root.getBoundingClientRect().top + scrollY;
    const stop = second.getBoundingClientRect().top + scrollY - top - innerHeight * 0.15;
    scrollTo(0, top + stop * 0.5);
  });
  await rendered(page, 25);
  await step(page, 1);
  await rendered(page, 49);
  await expect(visual(page).locator(".unknown").first()).toBeVisible();
  await step(page, 2);
  await rendered(page, 49);
  await expect(visual(page).locator(".known").first()).toContainText("Kjøttdeig");
  await expect(visual(page).locator(".known").first()).toBeVisible();
  await page.evaluate(() => {
    const third =
      document.querySelector('[data-story-stage="1"]')!.getBoundingClientRect().top + scrollY;
    const fourth =
      document.querySelector('[data-story-stage="2"]')!.getBoundingClientRect().top + scrollY;
    scrollTo(0, (third + innerHeight * 0.1 + fourth - innerHeight * 0.15) / 2);
  });
  await rendered(page, 61);
  await step(page, 3);
  await rendered(page, 73);
  await expect(visual(page).locator(".oldest-label")).toHaveCSS("opacity", "1");
  await step(page, 2);
  await rendered(page, 49);
  await step(page, 1);
  await rendered(page, 49);
  await page.evaluate(() => scrollTo(0, 0));
  await rendered(page, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("JavaScript disabled retains separate readable static scenes", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(page.locator(".journey-stage")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Hva har du egentlig i fryseboksen?" }),
  ).toBeVisible();
  await page.locator("#slik-fungerer-det").scrollIntoViewIfNeeded();
  await expect(page.locator(".journey-static").nth(1).locator("img")).toBeVisible();
  await context.close();
});

test("reduced motion uses only static views, with no moving sequence requests", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/freezer-scroll/")) requests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".journey-stage")).toBeHidden();
  for (let index = 0; index < 4; index++) {
    await step(page, index);
    await expect(page.locator(".journey-static").nth(index).locator("img")).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  expect(requests.every((url) => /\/(0001|0049|0073)(-mobile)?\.webp$/.test(url))).toBe(true);
  await expect(page.locator("video,canvas")).toHaveCount(0);
});

test("failed intermediate image retains a complete frame and later scroll recovers", async ({
  page,
}) => {
  await page.route("**/0025*.webp", (route) => route.abort());
  await page.goto("/");
  await rendered(page, 1);
  await page.evaluate(() => {
    const root = document.querySelector(".freezer-journey")!;
    const second = document.querySelector('[data-story-stage="0"]')!;
    const top = root.getBoundingClientRect().top + scrollY;
    scrollTo(
      0,
      top + (second.getBoundingClientRect().top + scrollY - top - innerHeight * 0.15) * 0.5,
    );
  });
  await expect(visual(page)).toHaveAttribute("data-target-frame", "25");
  await page.waitForLoadState("networkidle");
  await rendered(page, 1);
  await step(page, 1);
  await rendered(page, 49);
});
