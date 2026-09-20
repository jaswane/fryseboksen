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
      .first()
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
  await expect(visual(page)).toHaveAttribute("data-reveal", "0");
  const marker = visual(page).locator(".food-label").first();
  await expect(marker).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(marker).toHaveCSS("border-top-width", "0px");
  await expect(marker).toHaveCSS("box-shadow", "none");
  await expect(marker.locator(".unknown")).toHaveCSS("color", "rgb(23, 33, 37)");
  await page.evaluate(() => {
    const second =
      document.querySelector('[data-story-stage="0"]')!.getBoundingClientRect().top + scrollY;
    const third =
      document.querySelector('[data-story-stage="1"]')!.getBoundingClientRect().top + scrollY;
    scrollTo(0, (second + innerHeight * 0.35 + third - innerHeight * 0.2) / 2);
  });
  await rendered(page, 49);
  await expect
    .poll(async () => Number(await visual(page).getAttribute("data-reveal")))
    .toBeGreaterThan(0.49);
  expect(Number(await visual(page).getAttribute("data-reveal"))).toBeLessThan(0.51);
  await step(page, 2);
  await rendered(page, 49);
  await expect(visual(page)).toHaveAttribute("data-reveal", "1");
  await expect(visual(page).locator(".scroll-reveal img")).toHaveAttribute(
    "src",
    /0049-known\.webp$/,
  );
  expect(
    await visual(page)
      .locator(".scroll-reveal img")
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
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
  await expect(visual(page)).toHaveAttribute("data-reveal", "0");
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
    if (request.url().includes("/freezer-scroll-v3/")) requests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".journey-stage")).toBeHidden();
  for (let index = 0; index < 4; index++) {
    await step(page, index);
    await expect(page.locator(".journey-static").nth(index).locator("img")).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => /\/(0001|0049|0049-known|0073)(-mobile)?\.webp$/.test(url))).toBe(
    true,
  );
  await expect(page.locator(".journey-static").nth(1).locator("img")).toHaveAttribute(
    "src",
    /0049\.webp$/,
  );
  await expect(page.locator(".journey-static").nth(2).locator("img")).toHaveAttribute(
    "src",
    /0049-known\.webp$/,
  );
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

test("an unavailable colour still retains the anonymous food and question marks", async ({
  page,
}) => {
  await page.route("**/0049-known*.webp", (route) => route.abort());
  await page.goto("/");
  await step(page, 2);
  await rendered(page, 49);
  await page.waitForLoadState("networkidle");
  await expect(visual(page)).toHaveAttribute("data-reveal", "0");
  await expect(visual(page).locator(".unknown").first()).toHaveCSS("opacity", "1");
  await expect(visual(page).locator(".known").first()).toHaveCSS("opacity", "0");
  await expect(visual(page).locator(".scroll-reveal")).toHaveCount(0);
});
