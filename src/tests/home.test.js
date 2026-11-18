import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";

describe("home page", () => {
	before(launch);
	after(close);

	it("initialises the featured slider without page errors", async () => {
		const { page, errors, dispose } = await open({ viewport: { width: 390, height: 800 } });
		assert.deepEqual(errors.map(String), []);
		assert.equal(
			await waitFor(() =>
				page.evaluate(() => document.querySelector(".js-featured-slider").classList.contains("swiper-initialized")),
			),
			true,
		);
		await dispose();
	});

	it("moves to the next featured post with the next button", async () => {
		const { page, dispose } = await open();
		const activeTitle = () =>
			page.evaluate(() =>
				document.querySelector(".swiper-slide-active .m-featured-article__title").getAttribute("title"),
			);

		assert.equal(await waitFor(async () => (await activeTitle()) === "Featured post 1"), true);
		await page.locator(".js-featured-slider .swiper-button-next").click();
		assert.equal(await waitFor(async () => (await activeTitle()) === "Featured post 2"), true);
		await dispose();
	});

	it("clamps long titles to a few lines without altering their text", async () => {
		for (const viewport of [
			{ width: 390, height: 800 },
			{ width: 1280, height: 800 },
		]) {
			const { page, dispose } = await open({ viewport });
			await page.waitForTimeout(100);
			const titles = await page.$$eval(
				".m-article-card__title, .m-featured-article__title",
				(nodes, width) =>
					nodes.map(node => ({
						title: node.getAttribute("title"),
						text: node.innerText.trim(),
						full: node.textContent.trim(),
						height: node.getBoundingClientRect().height,
						clipped: node.scrollHeight > node.clientHeight + 1,
						lines: Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)),
						width,
					})),
				viewport.width,
			);
			const byTitle = Object.fromEntries(titles.map(t => [t.title, t]));
			for (const t of titles) assert.equal(t.text, t.full, `${t.title} text was altered at ${t.width}px`);
			const expected = {
				"Card 1": [3, 100],
				"Card 2": [6, 250],
			};
			for (const [title, [lines, maxHeight]] of Object.entries(expected)) {
				const t = byTitle[title];
				assert.ok(t.clipped, `${title} is not clipped at ${t.width}px`);
				assert.equal(t.lines, lines, `${title} shows ${t.lines} lines at ${t.width}px`);
				assert.ok(t.height <= maxHeight, `${title} is ${t.height}px tall at ${t.width}px`);
			}
			await dispose();
		}
	});

	it("does not overflow horizontally on a phone", async () => {
		const { page, dispose } = await open({ viewport: { width: 390, height: 800 } });
		await page.waitForTimeout(100);
		const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		assert.ok(scrollWidth <= 390, `page is ${scrollWidth}px wide in a 390px viewport`);
		await dispose();
	});
});
