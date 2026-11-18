import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";

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

	it("removes the covered background once scrolled past the header", async () => {
		const { page, dispose } = await open();
		assert.ok((await classes(page, ".js-header")).includes("covered"));

		await page.evaluate(() => window.scrollTo(0, 1500));
		assert.equal(await waitFor(async () => !(await classes(page, ".js-header")).includes("covered")), true);

		await page.evaluate(() => window.scrollTo(0, 0));
		assert.equal(await waitFor(async () => (await classes(page, ".js-header")).includes("covered")), true);

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
