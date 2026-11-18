import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, settle } from "./support/harness.js";

const classes = (page, selector) => page.evaluate(sel => [...document.querySelector(sel).classList], selector);

describe("header", () => {
	before(launch);
	after(close);

	it("opens and closes the mobile menu", async () => {
		const { page, dispose } = await open({ viewport: { width: 375, height: 700 } });

		await page.locator(".js-open-menu").click();
		assert.ok((await classes(page, ".js-header")).includes("mobile-menu-opened"));
		assert.ok((await classes(page, ".js-menu")).includes("opened"));
		assert.ok((await classes(page, "body")).includes("no-scroll-y"));

		await page.locator(".js-close-menu").click();
		assert.ok(!(await classes(page, ".js-header")).includes("mobile-menu-opened"));
		assert.ok(!(await classes(page, ".js-menu")).includes("opened"));
		assert.ok(!(await classes(page, "body")).includes("no-scroll-y"));

		await dispose();
	});

	it("moves focus into the mobile menu, closes it on Escape and gives focus back", async () => {
		const { page, dispose } = await open({ viewport: { width: 375, height: 700 } });
		const focused = () => page.evaluate(() => document.activeElement.className);

		await page.locator(".js-open-menu").focus();
		await page.keyboard.press("Enter");
		assert.ok((await classes(page, ".js-menu")).includes("opened"));
		assert.match(await focused(), /js-close-menu/);

		await page.keyboard.press("Escape");
		assert.ok(!(await classes(page, ".js-menu")).includes("opened"));
		assert.ok(!(await classes(page, "body")).includes("no-scroll-y"));
		assert.match(await focused(), /js-open-menu/);

		await dispose();
	});

	it("toggles the submenu and closes it on a click outside", async () => {
		const { page, dispose } = await open();
		const toggle = page.locator(".js-toggle-submenu");

		await toggle.click();
		assert.ok((await classes(page, ".js-header")).includes("submenu-is-active"));
		assert.ok((await classes(page, ".js-toggle-submenu")).includes("active"));
		assert.ok((await classes(page, ".js-submenu")).includes("opened"));

		await toggle.click();
		assert.ok(!(await classes(page, ".js-header")).includes("submenu-is-active"));
		assert.ok((await classes(page, ".js-submenu")).includes("closed"));

		await toggle.click();
		assert.ok((await classes(page, ".js-submenu")).includes("opened"));
		await page.locator(".js-submenu .m-submenu-title").first().click();
		assert.ok((await classes(page, ".js-submenu")).includes("opened"), "click inside keeps it open");

		await page.mouse.click(5, 790);
		assert.ok(!(await classes(page, ".js-header")).includes("submenu-is-active"));
		assert.ok(!(await classes(page, ".js-toggle-submenu")).includes("active"));
		assert.ok((await classes(page, ".js-submenu")).includes("closed"));

		await dispose();
	});

	it("closes the submenu on Escape and gives focus back to its button", async () => {
		const { page, dispose } = await open();
		await page.locator(".js-toggle-submenu").focus();
		await page.keyboard.press("Enter");
		assert.ok((await classes(page, ".js-submenu")).includes("opened"));
		await page.waitForTimeout(400);
		const shown = await page.evaluate(() => {
			const box = document.querySelector(".js-submenu").getBoundingClientRect();
			const hit = document.elementFromPoint(box.left + 10, box.bottom - 10);
			return { below: Math.round(box.top) === 60, onTop: Boolean(hit?.closest(".js-submenu")), width: box.width };
		});
		assert.deepEqual(shown, { below: true, onTop: true, width: 1280 });

		await page.keyboard.press("Escape");
		assert.ok((await classes(page, ".js-submenu")).includes("closed"));
		assert.ok(!(await classes(page, ".js-header")).includes("submenu-is-active"));
		assert.equal(await page.evaluate(() => document.activeElement.classList.contains("js-toggle-submenu")), true);
		await dispose();
	});

	it("closes the submenu when the header hides on scroll", async () => {
		const { page, dispose } = await open();
		await settle(page);
		await page.locator(".js-toggle-submenu").click();
		assert.ok((await classes(page, ".js-submenu")).includes("opened"));
		await page.evaluate(() => window.scrollTo(0, 1500));
		assert.equal(await waitFor(async () => (await classes(page, ".js-submenu")).includes("closed")), true);
		await dispose();
	});

	it("still opens and closes the submenu without the Popover API", async () => {
		const { page, dispose } = await open({
			initScript: () => {
				for (const name of ["popover", "showPopover", "hidePopover", "togglePopover"])
					delete HTMLElement.prototype[name];
			},
		});
		const toggle = page.locator(".js-toggle-submenu");
		await toggle.click();
		assert.ok((await classes(page, ".js-submenu")).includes("opened"));
		await page.keyboard.press("Escape");
		assert.ok((await classes(page, ".js-submenu")).includes("closed"));
		await toggle.click();
		await page.mouse.click(5, 790);
		assert.ok((await classes(page, ".js-submenu")).includes("closed"));
		await dispose();
	});

	it("removes the covered background once scrolled past the header", async () => {
		const { page, dispose } = await open();
		assert.ok((await classes(page, ".js-header")).includes("covered"));

		await page.evaluate(() => window.scrollTo(0, 1500));
		assert.equal(await waitFor(async () => !(await classes(page, ".js-header")).includes("covered")), true);

		await page.evaluate(() => window.scrollTo(0, 0));
		assert.equal(await waitFor(async () => (await classes(page, ".js-header")).includes("covered")), true);

		await dispose();
	});

	it("hides the header when scrolling down and shows it again when scrolling up", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const scrollTo = y =>
			page.evaluate(
				y =>
					new Promise(resolve => {
						window.scrollTo(0, y);
						requestAnimationFrame(() => requestAnimationFrame(resolve));
					}),
				y,
			);
		const shown = async () => {
			await page.waitForTimeout(450);
			return page.evaluate(() => document.querySelector(".js-header").getBoundingClientRect().bottom > 0);
		};

		assert.equal(await shown(), true, "shown at the top");
		await scrollTo(600);
		assert.equal(await shown(), false, "hidden after scrolling down");
		await scrollTo(590);
		assert.equal(await shown(), false, "still hidden after a small scroll up");
		await scrollTo(500);
		assert.equal(await shown(), true, "shown after scrolling up");
		await scrollTo(530);
		assert.equal(await shown(), true, "still shown after a small scroll down");
		await scrollTo(1000);
		assert.equal(await shown(), false, "hidden again");
		await scrollTo(10);
		assert.equal(await shown(), true, "shown near the top");

		await dispose();
	});

	it("moves the hero picture on scroll (parallax)", async () => {
		const { page, dispose } = await open();
		const transform = () => page.evaluate(() => getComputedStyle(document.querySelector(".m-hero__picture")).transform);

		await page.evaluate(() => window.scrollTo(0, 200));
		assert.equal(await waitFor(async () => (await transform()) === "matrix(1, 0, 0, 1, 0, 100)"), true);

		await dispose();
	});

	it("does not move the hero picture when reduced motion is preferred", async () => {
		const { page, dispose } = await open({ reducedMotion: "reduce" });
		await page.evaluate(() => window.scrollTo(0, 200));
		await page.waitForTimeout(150);
		const transform = await page.evaluate(() => getComputedStyle(document.querySelector(".m-hero__picture")).transform);
		assert.equal(transform, "none");
		await dispose();
	});
});
