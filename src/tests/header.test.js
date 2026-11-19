import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home, template } from "./support/pages.js";

const PHONE = { width: 390, height: 800 };

const withoutPopover = () => {
	for (const name of ["popover", "showPopover", "hidePopover", "togglePopover"]) delete HTMLElement.prototype[name];
	for (const name of ["popoverTargetElement", "popoverTargetAction"]) delete HTMLButtonElement.prototype[name];
};

const sheetOpen = page =>
	page.evaluate(() => {
		const sheet = document.querySelector("[data-mobile-menu]");
		return getComputedStyle(sheet).display !== "none" && sheet.getBoundingClientRect().width > 0;
	});

describe("header", () => {
	before(launch);
	after(close);

	it("shows search, theme and « Subscribe » to visitors, « Account » to members", async () => {
		const visitor = await open({ viewport: { width: 1440, height: 900 } });
		const actions = page =>
			page.$$eval(".site-header__actions > :is(a, button)", els =>
				els
					.filter(el => getComputedStyle(el).display !== "none")
					.map(el => el.getAttribute("aria-label") || el.innerText.trim().replace(/\s+/g, " ")),
			);
		assert.deepEqual(await actions(visitor.page), ["Open search", "Switch theme Automatic theme", "Subscribe"]);
		await visitor.dispose();

		const member = await open({ render: home({ member: true }), viewport: { width: 1440, height: 900 } });
		assert.deepEqual(await actions(member.page), ["Open search", "Switch theme Automatic theme", "Account"]);
		await member.dispose();
	});

	it("marks the current page in the navigation", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		assert.equal(await page.locator(".site-nav [aria-current=page]").textContent(), "Home");
		await dispose();
	});

	it("sticks to the top and changes its look once the page has scrolled", async () => {
		const { page, dispose } = await open({ render: template("tag") });
		const state = () =>
			page.evaluate(() => {
				const header = document.getElementById("site-header");
				return { top: Math.round(header.getBoundingClientRect().top), scrolled: header.hasAttribute("data-scrolled") };
			});
		assert.deepEqual(await state(), { top: 0, scrolled: false });
		// A slow scroll (a fast one hides the header: feedback.test.js)
		await page.evaluate(async () => {
			for (let y = 30; y <= 1200; y += 30) {
				window.scrollTo(0, y);
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
			}
		});
		assert.equal(await waitFor(async () => (await state()).scrolled), true);
		assert.equal((await state()).top, 0, "still at the top of the viewport");
		await dispose();
	});

	it("shows the navigation as pills that scroll sideways on a phone", async () => {
		const { page, dispose } = await open({ viewport: PHONE });
		const pills = await page.evaluate(() => {
			const nav = document.querySelector(".nav-pills");
			return {
				visible: getComputedStyle(nav).display !== "none",
				desktopNav: getComputedStyle(document.querySelector(".site-nav")).display,
				links: [...nav.querySelectorAll("a")].map(a => a.textContent),
			};
		});
		assert.deepEqual(pills, { visible: true, desktopNav: "none", links: ["Home", "Newsletter", "Dossier", "News"] });
		await dispose();
	});

	it("opens the phone menu, moves focus into it, closes it on Escape and gives focus back", async () => {
		const { page, dispose } = await open({ viewport: PHONE });
		const button = page.locator("[data-menu-button]");
		await button.focus();
		await page.keyboard.press("Enter");
		assert.equal(await waitFor(() => sheetOpen(page)), true);
		assert.equal(await button.getAttribute("aria-expanded"), "true");
		assert.equal(
			await waitFor(() => page.evaluate(() => document.activeElement.hasAttribute("data-menu-close"))),
			true,
		);
		assert.deepEqual(await page.locator("[data-mobile-menu] .nav-link").allTextContents(), [
			"Home",
			"Newsletter",
			"Dossier",
			"News",
			"About",
			"Contact",
		]);

		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await sheetOpen(page))), true);
		assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-menu-button")), true);
		await dispose();
	});

	it("closes the phone menu with its close button, also without the Popover API", async () => {
		for (const initScript of [null, withoutPopover]) {
			const { page, dispose } = await open({ viewport: PHONE, initScript });
			await page.locator("[data-menu-button]").click();
			assert.equal(await waitFor(() => sheetOpen(page)), true);
			await page.locator("[data-menu-close]").click();
			assert.equal(await waitFor(async () => !(await sheetOpen(page))), true);
			await dispose();
		}
	});

	it("leaves the page's own scroll alone while the menu is closed", async () => {
		const { page, dispose } = await open({ viewport: PHONE });
		assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "visible");
		await dispose();
	});
});
