import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, settle } from "./support/harness.js";

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

const tooltip = (page, selector) =>
	page.evaluate(sel => {
		const el = document.querySelector(sel);
		const style = getComputedStyle(el, "::after");
		const box = el.getBoundingClientRect();
		return {
			text: style.content.replace(/ \/ ""$/, ""),
			shown: style.visibility === "visible" && Number(style.opacity) > 0.9,
			below: parseFloat(style.top) >= box.height,
		};
	}, selector);

const menuBox = page =>
	page.evaluate(() => {
		const menu = document.querySelector(".js-secondary-menu");
		const button = document.querySelector(".js-open-secondary-menu").getBoundingClientRect();
		const box = menu.getBoundingClientRect();
		const link = document.elementFromPoint(box.left + box.width / 2, box.top + 12);
		return {
			visible: box.height > 0 && getComputedStyle(menu).visibility === "visible",
			gap: box.top - button.bottom,
			offCentre: Math.abs(box.left + box.width / 2 - (button.left + button.width / 2)),
			linkOnTop: link?.closest(".js-secondary-menu") === menu,
		};
	});

describe("tooltips", () => {
	before(launch);
	after(close);

	it("show the theme switcher label below it on hover and on keyboard focus", async () => {
		const { page, dispose } = await open();
		const switcher = ".m-nav__right .m-switch-theme";
		assert.deepEqual(await tooltip(page, switcher), { text: '"Switch theme"', shown: false, below: true });

		await settle(page);
		await page.locator(switcher).hover();
		assert.equal(await waitFor(async () => (await tooltip(page, switcher)).shown), true, "shown on hover");
		const clipped = await page.evaluate(() => {
			const el = document.querySelector(".m-nav__right .m-switch-theme");
			const style = getComputedStyle(el, "::after");
			const top = el.getBoundingClientRect().top + parseFloat(style.top);
			const bottom = top + parseFloat(style.height);
			for (let parent = el.parentElement; parent !== document.body; parent = parent.parentElement) {
				const box = parent.getBoundingClientRect();
				if (getComputedStyle(parent).overflowY !== "visible" && (top < box.top || bottom > box.bottom)) return true;
			}
			return false;
		});
		assert.equal(clipped, false, "the tooltip is not clipped by the menu bar");

		await page.mouse.move(5, 790);
		assert.equal(await waitFor(async () => !(await tooltip(page, switcher)).shown), true, "hidden again");

		await page.locator(".m-nav__right .js-switch-theme").focus();
		assert.equal(await waitFor(async () => (await tooltip(page, switcher)).shown), true, "shown on focus");
		await dispose();
	});

	it("show the featured badge label on hover", async () => {
		const { page, dispose } = await open();
		await settle(page);
		await page.locator(".m-article-card__featured").hover();
		const state = await waitFor(async () => {
			const t = await tooltip(page, ".m-article-card__featured");
			return t.shown && t;
		});
		assert.equal(state.text, '"Featured"');
		await dispose();
	});
});

// Playwright reports the button's wrapping <span> as covering it (the page's own hit test does
// not), so the More button is clicked with force: a real mouse click at its centre.
// It waits for the menu bar's entrance animation first, as force skips Playwright's checks.
const clickMore = async page => {
	await settle(page);
	await page.locator(".js-open-secondary-menu").click({ force: true });
};

describe("secondary menu", () => {
	before(launch);
	after(close);

	it("opens below the More button and closes on Escape and on a click outside", async () => {
		const { page, dispose } = await open();
		assert.equal((await menuBox(page)).visible, false);

		await clickMore(page);
		let box = await menuBox(page);
		assert.equal(box.visible, true);
		assert.ok(box.gap >= 5 && box.gap <= 15, `menu is ${box.gap}px below the button`);
		assert.ok(box.offCentre < 2, `menu is ${box.offCentre}px off the button centre`);
		assert.equal(box.linkOnTop, true, "the menu is drawn above the page");
		assert.deepEqual(await page.locator(".js-secondary-menu a").allTextContents(), ["About", "Contact"]);

		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by Escape");
		assert.equal(await page.evaluate(() => document.activeElement.classList.contains("js-open-secondary-menu")), true);

		await clickMore(page);
		assert.equal((await menuBox(page)).visible, true);
		await page.mouse.click(5, 790);
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by a click outside");

		await clickMore(page);
		await page.locator(".js-secondary-menu a").first().focus();
		box = await menuBox(page);
		assert.equal(box.visible, true, "keyboard focus can enter the menu");

		await dispose();
	});

	it("closes when the header hides on scroll", async () => {
		const { page, dispose } = await open();
		await clickMore(page);
		assert.equal((await menuBox(page)).visible, true);
		await page.evaluate(() => window.scrollTo(0, 1500));
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true);
		await dispose();
	});

	it("is placed by the script where CSS anchor positioning is missing", async () => {
		const { page, dispose } = await open({ initScript: withoutAnchorPositioning });
		await clickMore(page);
		const box = await menuBox(page);
		assert.equal(box.visible, true);
		assert.ok(box.gap >= 5 && box.gap <= 15, `menu is ${box.gap}px below the button`);
		assert.ok(box.offCentre < 2, `menu is ${box.offCentre}px off the button centre`);
		await dispose();
	});

	it("still opens and closes where the Popover API is missing", async () => {
		const { page, dispose } = await open({ initScript: withoutPopover });
		const button = page.locator(".js-open-secondary-menu");
		await clickMore(page);
		let box = await menuBox(page);
		assert.equal(box.visible, true);
		assert.ok(box.gap >= 5 && box.gap <= 15, `menu is ${box.gap}px below the button`);
		assert.equal(await button.getAttribute("aria-expanded"), "true");

		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by Escape");
		await clickMore(page);
		await page.mouse.click(5, 790);
		assert.equal(await waitFor(async () => !(await menuBox(page)).visible), true, "closed by a click outside");
		assert.equal(await button.getAttribute("aria-expanded"), "false");
		await dispose();
	});
});
