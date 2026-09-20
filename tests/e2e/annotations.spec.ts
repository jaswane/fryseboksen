import { expect, test, type Locator, type Page } from "@playwright/test";

const visual = (page: Page) => page.locator(".journey-stage .scroll-freezer");
async function scene(page: Page, index: number) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".journey-section")
    .nth(index)
    .evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await expect(visual(page)).toHaveAttribute("data-stage", String(index));
  await expect(visual(page)).toHaveAttribute("data-frame", index === 3 ? "73" : "49");
  await expect(visual(page)).toHaveAttribute("data-reveal", index === 1 ? "0" : "1");
}

// Check actual text bounds, not the intentionally empty part of the copy column.
async function annotationBounds(root: Locator, copy: Locator, checkPageOverflow = true) {
  const textRects = await copy.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects: { left: number; right: number; top: number; bottom: number }[] = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      rects.push(
        ...Array.from(range.getClientRects(), (r) => ({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        })),
      );
    }
    return rects;
  });
  const labels = await root.locator(".food-label, .oldest-label").evaluateAll((elements) =>
    elements
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute("data-annotation"),
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      }),
  );
  expect(labels.length).toBeGreaterThan(0);
  const width = await root.evaluate(() => innerWidth);
  for (const label of labels) {
    expect(label.left, `${label.name}: left edge`).toBeGreaterThanOrEqual(0);
    expect(label.right, `${label.name}: right edge`).toBeLessThanOrEqual(width);
    for (const copyRect of textRects) {
      const overlaps =
        label.left < copyRect.right &&
        label.right > copyRect.left &&
        label.top < copyRect.bottom &&
        label.bottom > copyRect.top;
      expect(overlaps, `${label.name} overlaps story copy`).toBe(false);
    }
  }
  if (checkPageOverflow) {
    expect(await root.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  return labels;
}

test("external annotations retain their positions through the colour reveal", async ({ page }) => {
  await page.goto("/");
  await scene(page, 1);
  const before = await annotationBounds(visual(page), page.locator(".journey-text").nth(1));
  const lines = await visual(page)
    .locator(".annotation-food-lines polyline")
    .evaluateAll((elements) => elements.map((el) => el.getAttribute("points")));
  await scene(page, 2);
  const after = await annotationBounds(visual(page), page.locator(".journey-text").nth(2));
  expect(after).toEqual(before);
  expect(
    await visual(page)
      .locator(".annotation-food-lines polyline")
      .evaluateAll((elements) => elements.map((el) => el.getAttribute("points"))),
  ).toEqual(lines);
  await scene(page, 3);
  await annotationBounds(visual(page), page.locator(".journey-text").nth(3));
  const oldest = visual(page).locator(".oldest-label");
  await expect(oldest).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(oldest).toHaveCSS("border-top-width", "0px");
});

for (const fontSize of [100, 200]) {
  test.describe(`${fontSize}% text sizing`, () => {
    // Pure text enlargement at a fixed layout viewport. Mobile pinch/pan from
    // existing page-wide overflow is recorded separately in docs/qa.md.
    if (fontSize === 200) test.use({ isMobile: false });
    test(`annotation bounds at 320, 390, 1024 and 1440px with ${fontSize}% text`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60000);
      for (const width of [320, 390, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 761 ? 844 : 1000 });
        await page.goto("/");
        await page.addStyleTag({ content: `html { font-size: ${fontSize}% !important }` });
        await page.waitForLoadState("networkidle");
        for (const index of [1, 2, 3]) {
          await scene(page, index);
          // At 200%, pre-existing header/product/footer overflow is outside this
          // annotation revision. Always verify the annotation edges and copy overlap.
          await annotationBounds(
            visual(page),
            page.locator(".journey-text").nth(index),
            fontSize === 100,
          );
          if (fontSize === 200 && index !== 1 && (width === 390 || width === 1440)) {
            await page.screenshot({
              path: testInfo.outputPath(`text-200-${width}-scene-${index + 1}.png`),
            });
          }
        }
      }
    });
  });
}

test("static annotations remain readable with reduced motion and without JavaScript", async ({
  browser,
}, testInfo) => {
  for (const width of [320, 390, 1440]) {
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        javaScriptEnabled,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3100/");
      await expect(page.locator(".journey-stage")).toBeHidden();
      for (const index of [1, 2, 3]) {
        const section = page.locator(".journey-section").nth(index);
        await section.scrollIntoViewIfNeeded();
        await annotationBounds(
          section.locator(".scroll-freezer"),
          section.locator(".journey-text"),
        );
        if (index === 3 && javaScriptEnabled) {
          await page.screenshot({ path: testInfo.outputPath(`static-${width}-scene-4.png`) });
        }
      }
      await context.close();
    }
  }
});
