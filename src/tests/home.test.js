import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";

describe("home page", () => {
	before(launch);
	after(close);

	// The featured post whose slide fills the slider, and the state of the two buttons.
	const sliderState = page =>
		page.evaluate(() => {
			const track = document.querySelector(".js-featured-slider .js-slider-track").getBoundingClientRect();
			const shown = [...document.querySelectorAll(".m-featured-slider__list__item")].filter(slide => {
				const box = slide.getBoundingClientRect();
				return Math.abs(box.left - track.left) < 2 && Math.abs(box.width - track.width) < 2;
			});
			return {
				shown: shown.map(slide => slide.querySelector(".m-featured-article__title").getAttribute("title")),
				prev: !document.querySelector(".js-featured-slider [aria-label=Previous]").disabled,
				next: !document.querySelector(".js-featured-slider [aria-label=Next]").disabled,
			};
		});
	const showing = (page, title, prev, next) =>
		waitFor(async () => {
			const state = await sliderState(page);
			return state.shown.length === 1 && state.shown[0] === title && state.prev === prev && state.next === next;
		});

	it("shows one featured post at a time and moves between them with the buttons", async () => {
		for (const width of [390, 1280]) {
			const { page, errors, dispose } = await open({ viewport: { width, height: 800 } });
			assert.equal(await showing(page, "Featured post 1", false, true), true, `starts on the first post at ${width}px`);

			const next = page.getByRole("button", { name: "Next" });
			const prev = page.getByRole("button", { name: "Previous" });
			await next.click();
			assert.equal(await showing(page, "Featured post 2", true, true), true, `next at ${width}px`);
			await next.click();
			assert.equal(await showing(page, "Featured post 3", true, false), true, `last post at ${width}px`);
			await prev.click();
			assert.equal(await showing(page, "Featured post 2", true, true), true, `previous at ${width}px`);
			assert.deepEqual(errors.map(String), []);
			await dispose();
		}
	});

	it("moves between featured posts from the keyboard", async () => {
		const { page, dispose } = await open();
		await page.getByRole("button", { name: "Next" }).focus();
		await page.keyboard.press("Enter");
		assert.equal(await showing(page, "Featured post 2", true, true), true);
		await page.keyboard.press("Enter");
		assert.equal(await showing(page, "Featured post 3", true, false), true);
		assert.equal(
			await page.evaluate(() => document.activeElement.getAttribute("aria-label")),
			"Previous",
			"focus moves to the other button when the focused one is disabled",
		);
		await dispose();
	});

	it("counts every press when the buttons are pressed in quick succession", async () => {
		const { page, dispose } = await open();
		const next = page.getByRole("button", { name: "Next" });
		await next.click();
		await next.click();
		assert.equal(await showing(page, "Featured post 3", true, false), true);
		await dispose();
	});

	it("moves between featured posts in a right-to-left page", async () => {
		const { page, dispose } = await open({ lang: "ar" });
		assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
		assert.equal(await showing(page, "Featured post 1", false, true), true);
		await page.getByRole("button", { name: "Next" }).click();
		assert.equal(await showing(page, "Featured post 2", true, true), true);
		await page.getByRole("button", { name: "Next" }).click();
		assert.equal(await showing(page, "Featured post 3", true, false), true);
		await dispose();
	});

	it("can swipe through the featured posts", async () => {
		const { page, dispose } = await open({ viewport: { width: 390, height: 800 } });
		await page.evaluate(() => {
			const track = document.querySelector(".js-featured-slider .js-slider-track");
			track.scrollTo({ left: track.clientWidth * 0.7, behavior: "instant" });
		});
		assert.equal(await showing(page, "Featured post 2", true, true), true, "snaps to a whole post");
		await dispose();
	});

	it("lays the recent articles out as a strip that scrolls sideways", async () => {
		const { page, dispose } = await open({ viewport: { width: 390, height: 800 } });
		await page.locator(".js-open-menu").click();
		const strip = await page.evaluate(() => {
			const list = document.querySelector(".m-recent-articles__list");
			const tops = [...list.children].map(item => Math.round(item.getBoundingClientRect().top));
			list.scrollLeft = 200;
			return { sameRow: new Set(tops).size === 1, scrolled: list.scrollLeft };
		});
		assert.deepEqual(strip, { sameRow: true, scrolled: 200 });
		await dispose();
	});

	it("clamps long titles to a few lines without altering their text", async () => {
		for (const viewport of [
			{ width: 390, height: 800 },
			{ width: 1280, height: 800 },
		]) {
			const { page, dispose } = await open({ viewport });
			// Show the recent articles too: in the mobile menu, or in the desktop submenu
			await page.locator(viewport.width < 768 ? ".js-open-menu" : ".js-toggle-submenu").click();
			await page.waitForTimeout(500);
			const titles = await page.$$eval(
				".m-article-card__title, .m-featured-article__title, .m-recent-article__title",
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
				"Featured post 1": [viewport.width >= 768 ? 4 : 5, 200],
				"Recent post 1": [2, 50],
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
