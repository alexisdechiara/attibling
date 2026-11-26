import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home } from "./support/pages.js";

// Browsers without the Popover API or CSS anchor positioning, simulated in Chromium by hiding
// the feature from the theme's scripts (the stylesheet cannot be fooled, so the anchor test only
// checks that the script places the menu itself).
const withoutPopover = () => {
	for (const name of ["popover", "showPopover", "hidePopover", "togglePopover"]) delete HTMLElement.prototype[name];
	for (const name of ["popoverTargetElement", "popoverTargetAction"]) delete HTMLButtonElement.prototype[name];
};
const withoutAnchorPositioning = () => {
	const supports = CSS.supports.bind(CSS);
	CSS.supports = (...args) => !/anchor|position-area/.test(args.join(":")) && supports(...args);
};

const DESKTOP = { width: 1280, height: 800 };

const menuBox = page =>
	page.evaluate(() => {
		const menu = document.querySelector("[data-more-menu]");
		const button = document.querySelector("[data-more-button]").getBoundingClientRect();
		const box = menu.getBoundingClientRect();
		const link = document.elementFromPoint(box.left + box.width / 2, box.bottom - 12);
		return {
			visible: box.height > 0 && getComputedStyle(menu).display !== "none",
			gap: box.top - button.bottom,
			linkOnTop: link?.closest("[data-more-menu]") === menu,
		};
	});

describe("« More » menu", () => {
	before(launch);
	after(close);

	it("opens below its button with the secondary navigation, closes on Escape and on a click outside", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		assert.equal((await menuBox(page)).visible, false);

		await page.locator("[data-more-button]").click();
		let box = await menuBox(page);
		assert.equal(box.visible, true);
		assert.ok(box.gap >= 5 && box.gap <= 15, `menu is ${box.gap}px below the button`);
		assert.equal(box.linkOnTop, true, "the menu is drawn above the page");
		assert.deepEqual(await page.locator("[data-more-menu] a").allTextContents(), ["About", "Contact"]);

		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by Escape");
		assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-more-button")), true);

		await page.locator("[data-more-button]").click();
		await page.mouse.click(5, 790);
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by a click outside");

		await page.locator("[data-more-button]").click();
		await page.locator("[data-more-menu] a").first().focus();
		box = await menuBox(page);
		assert.equal(box.visible, true, "keyboard focus can enter the menu");
		await dispose();
	});

	it("takes the main items that do not fit in the bar", async () => {
		const navigation = [
			"Home",
			"Actualité",
			"Dossier",
			"Jeux vidéo",
			"Anime",
			"Informatique",
			"Intelligence artificielle",
			"Programmation",
			"Tests",
		].map((label, i) => ({ label, url: i ? `/tag/${i}/` : "/" }));
		const { page, dispose } = await open({
			render: home({ site: { settings: { navigation } } }),
			viewport: { width: 900, height: 800 },
		});
		const state = await page.evaluate(() => ({
			shown: [...document.querySelectorAll(".site-nav [data-nav-item]:not([hidden]) a")].map(a => a.textContent),
			moved: [...document.querySelectorAll("[data-nav-overflow] a")].map(a => a.textContent),
			fits:
				document.querySelector("[data-nav-list]").scrollWidth <= document.querySelector(".site-nav").clientWidth + 1,
		}));
		assert.ok(state.moved.length > 0, "some items moved");
		assert.deepEqual(
			[...state.shown, ...state.moved],
			navigation.map(n => n.label),
			"in their order",
		);
		assert.equal(state.fits, true);

		await page.setViewportSize({ width: 1600, height: 800 });
		assert.equal(
			await waitFor(() =>
				page.evaluate(moved => document.querySelectorAll("[data-nav-overflow] a").length < moved, state.moved.length),
			),
			true,
			"they come back when there is room",
		);
		await dispose();
	});

	it("is hidden without a secondary navigation or items that do not fit", async () => {
		const { page, dispose } = await open({
			render: home({ site: { settings: { secondary_navigation: [] } } }),
			viewport: DESKTOP,
		});
		assert.equal(await page.locator("[data-nav-more]").isVisible(), false);
		await dispose();
	});

	it("is placed by the script where CSS anchor positioning is missing", async () => {
		const { page, dispose } = await open({ initScript: withoutAnchorPositioning, viewport: DESKTOP });
		await page.locator("[data-more-button]").click();
		const box = await menuBox(page);
		assert.equal(box.visible, true);
		assert.ok(box.gap >= 5 && box.gap <= 15, `menu is ${box.gap}px below the button`);
		await dispose();
	});

	it("still opens and closes where the Popover API is missing", async () => {
		const { page, dispose } = await open({ initScript: withoutPopover, viewport: DESKTOP });
		const button = page.locator("[data-more-button]");
		await button.click();
		assert.equal((await menuBox(page)).visible, true);
		assert.equal(await button.getAttribute("aria-expanded"), "true");
		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by Escape");
		await button.click();
		await page.mouse.click(5, 790);
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by a click outside");
		assert.equal(await button.getAttribute("aria-expanded"), "false");
		await dispose();
	});
});
