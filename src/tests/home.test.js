const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch, close, open, waitFor } = require("./support/harness");

describe("home page", () => {
	before(launch);
	after(close);

	it("initialises the featured slider without page errors", async () => {
		const { page, errors, dispose } = await open({ viewport: { width: 390, height: 800 } });
		assert.deepEqual(errors.map(String), []);
		assert.equal(
			await waitFor(() =>
				page.evaluate(() => document.querySelector(".js-featured-slider").classList.contains("swiper-initialized"))
			),
			true
		);
		await dispose();
	});

	it("moves to the next featured post with the next button", async () => {
		const { page, dispose } = await open();
		const activeTitle = () =>
			page.evaluate(() => document.querySelector(".swiper-slide-active .m-featured-article__title").getAttribute("title"));

		assert.equal(await waitFor(async () => (await activeTitle()) === "Featured post 1"), true);
		await page.locator(".js-featured-slider .swiper-button-next").click();
		assert.equal(await waitFor(async () => (await activeTitle()) === "Featured post 2"), true);
		await dispose();
	});

	it("does not overflow horizontally on a phone", async () => {
		const { page, dispose } = await open({ viewport: { width: 390, height: 800 } });
		await page.waitForTimeout(100);
		const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		assert.ok(scrollWidth <= 390, `page is ${scrollWidth}px wide in a 390px viewport`);
		await dispose();
	});
});
