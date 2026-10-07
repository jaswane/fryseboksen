import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00Z"));
});
async function app(page: Page) {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
}
const row = (page: Page, name = "Kjøttdeig") =>
  page
    .getByRole("list", { name: "Fryserinnhold" })
    .locator("li")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}

test("one row, several dates: minus and undo restore January", async ({ page }) => {
  await app(page);
  await expect(row(page)).toHaveCount(1);
  await expect(row(page).locator(".quantity strong")).toHaveText("3");
  await row(page)
    .getByRole("button", { name: /Ta ut én/ })
    .click();
  await expect(row(page).locator(".quantity strong")).toHaveText("2");
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await expect(
    page.getByLabel("Antall", { exact: true }).filter({ visible: true }).last(),
  ).toHaveValue("1");
  const fields = page.getByRole("dialog").getByRole("spinbutton");
  await expect(fields.nth(0)).toHaveValue("1");
  await expect(fields.nth(1)).toHaveValue("1");
  await expect(page.getByRole("dialog").getByLabel("Innfrysingsdato").first()).toHaveValue(
    "2026-01-12",
  );
  await page.getByRole("button", { name: "Lukk", exact: true }).click();
  await page.getByRole("button", { name: "Angre", exact: true }).click();
  await expect(row(page).locator(".quantity strong")).toHaveText("3");
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await expect(page.getByRole("dialog").getByRole("spinbutton").first()).toHaveValue("2");
  await expect(page.getByRole("dialog").getByLabel("Innfrysingsdato").first()).toHaveValue(
    "2026-01-12",
  );
});

test("plus creates today's entry; undo removes that entry only", async ({ page }) => {
  await app(page);
  await row(page)
    .getByRole("button", { name: /Legg inn én/ })
    .click();
  await expect(row(page).locator(".quantity strong")).toHaveText("4");
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await expect(page.getByRole("dialog").getByRole("group")).toHaveCount(3);
  await expect(page.getByRole("dialog").getByLabel("Innfrysingsdato").last()).toHaveValue(
    "2026-09-19",
  );
  await expect(page.getByRole("dialog").getByLabel("Innfrysingsdato").first()).toHaveValue(
    "2026-01-12",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Angre", exact: true }).click();
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await expect(page.getByRole("dialog").getByRole("group")).toHaveCount(2);
});

test("edit corrects dates and quantities, delete and undo restore them", async ({ page }) => {
  await app(page);
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await page.getByRole("dialog").getByRole("spinbutton").first().fill("4");
  await page.getByRole("dialog").getByLabel("Innfrysingsdato").first().fill("2026-02-02");
  await page.getByRole("button", { name: "Lagre endringer" }).click();
  await expect(row(page).locator(".quantity strong")).toHaveText("5");
  await expect(row(page)).toContainText("2. februar");
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  await page.getByRole("button", { name: "Slett vare" }).click();
  await expect(row(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Angre", exact: true }).click();
  await expect(row(page).locator(".quantity strong")).toHaveText("5");
  await expect(row(page)).toContainText("2. februar");
});

test("empty freezer: add with date, persist, take last unit and undo", async ({ page }) => {
  await app(page);
  await page.getByRole("button", { name: "Tom fryser", exact: true }).click();
  await expect(
    page.getByText(
      "Begynn med neste vare du legger i fryseren. Du trenger ikke registrere alt nå.",
    ),
  ).toBeVisible();
  await page.getByLabel("Varenavn", { exact: true }).fill("Ertesuppe");
  await page.getByLabel("Antall", { exact: true }).fill("1");
  await page.getByText("Enhet: stk", { exact: true }).click();
  await page.getByLabel("Enhet", { exact: true }).selectOption("porsjoner");
  await page.getByRole("button", { name: /Innfrysingsdato: i dag/ }).click();
  await page.getByLabel("Innfrysingsdato", { exact: true }).fill("2026-09-01");
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(row(page, "Ertesuppe")).toContainText("1. september");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
  await page.getByRole("button", { name: "Tom fryser", exact: true }).click();
  await expect(row(page, "Ertesuppe")).toBeVisible();
  await row(page, "Ertesuppe")
    .getByRole("button", { name: /Ta ut én/ })
    .click();
  await expect(page.getByRole("heading", { name: "Fryseren din. En ny oversikt." })).toBeVisible();
  await page.getByRole("button", { name: "Angre", exact: true }).click();
  await expect(row(page, "Ertesuppe")).toContainText("1. september");
  await expect(row(page, "Ertesuppe").locator(".quantity strong")).toHaveText("1");
});

test("search, both sort orders and cleared date field", async ({ page }) => {
  await app(page);
  await page.getByLabel("Søk i fryseren").fill("BLÅ");
  await expect(page.getByRole("list", { name: "Fryserinnhold" }).locator("li")).toHaveCount(1);
  await expect(row(page, "Blåbær")).toBeVisible();
  await page.getByLabel("Søk i fryseren").fill("ikke her");
  await expect(page.getByRole("heading", { name: "Ingen varer med dette navnet" })).toBeVisible();
  await page.getByRole("button", { name: "Vis alle varer" }).click();
  const list = page.getByRole("list", { name: "Fryserinnhold" });
  await expect(list.locator("li").first()).toContainText("Kjøttdeig");
  await page.getByLabel("Sorter varer").selectOption("newest");
  await expect(list.locator("li").nth(1)).toContainText("Brød");
  await page.getByRole("button", { name: /Innfrysingsdato: i dag/ }).click();
  await page.getByLabel("Innfrysingsdato", { exact: true }).fill("");
  await expect(page.getByRole("button", { name: /Velg innfrysingsdato/ })).toBeVisible();
  await page.getByLabel("Varenavn", { exact: true }).fill("Suppe");
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(row(page, "Suppe")).toHaveCount(0);
});

test("keyboard: skip link, dialog trap, Escape and focus return", async ({ page }) => {
  await app(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Hopp til innhold" })).toBeFocused();
  await page.keyboard.press("Enter");
  const edit = row(page).getByRole("button", { name: "Rediger Kjøttdeig" });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")))).toBe(
      true,
    );
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
});

test("rename persists; reset restores both demo states", async ({ page }) => {
  await app(page);
  await page.getByRole("button", { name: "Endre frysernavn" }).click();
  await page.getByLabel("Frysernavn", { exact: true }).fill("Fryseren i boden");
  await page.getByRole("button", { name: "Lagre navn" }).click();
  await expect(page.getByRole("heading", { name: "Fryseren i boden" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fryseren i boden" })).toBeVisible();
  await page.getByRole("button", { name: "Tilbakestill demo" }).click();
  await page.getByRole("button", { name: "Tilbakestill", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
});

test("routes, unique contact address, console and horizontal overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const address = ["kontakt", "swanecreative.no"].join("@");
  for (const path of [
    "/",
    "/app",
    "/guider",
    "/om",
    "/kontakt",
    "/personvern",
    "/vilkar",
    "/design/typografi",
    "/logg-inn",
    "/logg-inn/sjekk-e-post",
    "/auth/feil",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    // Let Next's link prefetch settle before a full document navigation.
    // WebKit otherwise reports cancelled, same-origin fetches as access-control errors.
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveCount(1);
    await noOverflow(page);
    const text = await page.locator("body").innerText();
    expect(text.split(address).length - 1).toBe(path === "/kontakt" ? 1 : 0);
    expect(await page.locator("head").innerHTML()).not.toContain(address);
    for (const selector of ["header", "footer"]) {
      if (await page.locator(selector).count())
        expect(await page.locator(selector).innerText()).not.toContain(address);
    }
  }
  expect(errors).toEqual([]);
});

test("320px and enlarged text retain usable layouts", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const path of ["/", "/app", "/kontakt"]) {
    await page.goto(path);
    if (path === "/app")
      await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 760, height: 1000 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Fryseren hjemme" })).toBeVisible();
  await page.addStyleTag({ content: "html {font-size: 200% !important}" });
  await noOverflow(page);
});

test("reduced motion keeps all scenes and static media", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of [
    "hero-title",
    "scene-02",
    "scene-03",
    "scene-04",
    "product-heading",
    "reminder-heading",
    "final-heading",
  ]) {
    const heading = page.locator("#" + id);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }
  expect(await page.locator("video").count()).toBe(0);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(
    await page
      .locator(".oldest-label")
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
  ).toBeLessThan(0.01);
});

test("story changes from questions to named food and oldest-first", async ({ page }) => {
  await page.goto("/");
  for (let stage = 0; stage < 3; stage++) {
    const section = page.locator(`[data-story-stage="${stage}"]`);
    await section.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    const visual = page.locator(".journey-stage .scroll-freezer");
    await expect(visual).toHaveAttribute("data-stage", String(stage + 1));
    if (stage === 0) await expect(visual.locator(".unknown").first()).toBeVisible();
    if (stage === 1) await expect(visual.locator(".known").first()).toContainText("Kjøttdeig");
    if (stage === 2) await expect(visual.locator(".oldest-label")).toHaveCSS("opacity", "1");
    await noOverflow(page);
  }
});

test("blocked storage keeps input and reports failure without fake success", async ({ page }) => {
  await app(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    };
  });
  await page.getByLabel("Varenavn", { exact: true }).fill("Ertesuppe");
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Endringen ble ikke lagret",
  );
  await expect(page.getByLabel("Varenavn", { exact: true })).toHaveValue("Ertesuppe");
  await expect(row(page, "Ertesuppe")).toHaveCount(0);
  await row(page)
    .getByRole("button", { name: /Legg inn én/ })
    .click();
  await expect(row(page).locator(".quantity strong")).toHaveText("3");
  await expect(page.getByRole("button", { name: "Angre", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tilbakestill demo" }).click();
  await page.getByRole("button", { name: "Tilbakestill", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Endringen ble ikke lagret",
  );
});

test("accessibility scan: landing, app, empty state and edit dialog", async ({ page }) => {
  await page.goto("/");
  let result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
  await app(page);
  result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
  await row(page).getByRole("button", { name: "Rediger Kjøttdeig" }).click();
  result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Tom fryser", exact: true }).click();
  result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});
