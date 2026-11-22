// Visual consistency (design audit): the h1 of the pages share one scale, and the end of an article (dates,
// series line, share, call to action, author box, comments, recommendations) shares the widths of the
// article's column. Measured on the built assets, in a real browser.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { template, paged } from "./support/pages.js";
import { article } from "./support/article.js";

const TITLE_WIDTHS = [390, 768, 1024, 1440, 1920];

// Listing pages: tag, author, all tags, all authors, archives, « À lire plus tard », « All posts » page 2+
const LISTINGS = {
	tag: () => template("tag"),
	author: () => template("author"),
	tags: () => template("custom-tags"),
	authors: () => template("custom-authors"),
	archives: () => template("custom-archives"),
	"saved (visitor)": () => template("custom-saved-posts"),
	"saved (member)": () => template("custom-saved-posts", { member: true }),
	"all posts (page 2)": () => paged(2),
};

// Reading pages: generic page, legal pages, privacy, about; the subscription page is a page title too
const READINGS = {
	page: () => template("page"),
	legal: () => template("custom-document"),
	privacy: () => template("custom-privacy"),
	about: () => template("custom-about"),
	subscription: () => template("custom-subscribe"),
};

const h1 = async (render, width) => {
	const { page, dispose } = await open({ render, viewport: { width, height: 900 } });
	const view = await page.evaluate(() => {
		const el = document.querySelector("main h1");
		const style = getComputedStyle(el);
		const size = parseFloat(style.fontSize);
		return {
			size,
			weight: style.fontWeight,
			tracking: Math.round((parseFloat(style.letterSpacing) / size) * 1000) / 1000,
			leading: Math.round((parseFloat(style.lineHeight) / size) * 1000) / 1000,
		};
	});
	await dispose();
	return view;
};

describe("consistency: page titles", () => {
	before(launch);
	after(close);

	for (const [group, pages] of [
		["listing pages", LISTINGS],
		["reading pages", READINGS],
	]) {
		for (const width of TITLE_WIDTHS) {
			it(`gives the ${group} one h1 size, weight, tracking and leading at ${width}px`, async () => {
				const views = {};
				for (const [name, render] of Object.entries(pages)) views[name] = await h1(render(), width);
				const [first, ...rest] = Object.entries(views);
				for (const [name, view] of rest) {
					assert.deepEqual(view, first[1], `${name} differs from ${first[0]}: ${JSON.stringify(views)}`);
				}
			});
		}
	}

	for (const width of TITLE_WIDTHS) {
		it(`gives listing and reading pages the same h1 at ${width}px`, async () => {
			const listing = await h1(LISTINGS.tag(), width);
			const reading = await h1(READINGS.page(), width);
			assert.deepEqual(reading, listing);
		});
	}

	it("scales the h1 from 36px on phones to 56px on large screens", async () => {
		assert.equal((await h1(LISTINGS.archives(), 390)).size, 36);
		assert.equal((await h1(LISTINGS.archives(), 1440)).size, 56);
	});
});

const END_WIDTHS = [390, 768, 1024, 1440, 1920];
const BLOCKS = [".article-dates", ".series-line", ".article-share", ".author-box__inner", ".article-comments__inner"];

const columns = (page, selectors) =>
	page.evaluate(sel => {
		const box = selector => {
			const el = document.querySelector(selector);
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			return { start: rect.left, end: rect.right, width: rect.width };
		};
		const gutter = Math.min(56, Math.max(16, innerWidth * 0.04));
		return {
			text: box(".article-content > p"),
			blocks: Object.fromEntries(sel.map(s => [s, box(s)])),
			related: box(".article-related .post-grid"),
			card: box(".article-header__card"),
			page: { width: Math.min(innerWidth - 2 * gutter, 1328) },
			viewport: innerWidth,
		};
	}, selectors);

const near = (actual, expected, message) =>
	assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual} vs ${expected}`);

describe("consistency: the end of an article", () => {
	before(launch);
	after(close);

	for (const style of ["Card", "Immersive"]) {
		for (const width of END_WIDTHS) {
			it(`${style}: reads in the text column at ${width}px (dates, series, share, author box, comments)`, async () => {
				const render = article({
					custom: { article_style: style },
					series: { parts: 6, published: 4, current: 2, description: "Une série" },
					internal: ["#mis-a-jour"],
				});
				const { page, dispose } = await open({ render, viewport: { width, height: 900 } });
				const view = await columns(page, BLOCKS);
				await dispose();
				assert.ok(view.text, "the text");
				for (const selector of BLOCKS) {
					const block = view.blocks[selector];
					assert.ok(block, `${selector} is present`);
					near(block.start, view.text.start, `${selector} inline start`);
					near(block.width, view.text.width, `${selector} width`);
				}
			});

			it(`${style}: the recommendations keep the page width at ${width}px`, async () => {
				const { page, dispose } = await open({
					render: article({ custom: { article_style: style } }),
					viewport: { width, height: 900 },
				});
				const view = await columns(page, []);
				await dispose();
				assert.ok(view.related, "the recommendations");
				near(view.related.width, view.page.width, "width");
				near(view.related.start, (view.viewport - view.page.width) / 2, "centered");
				if (style === "Card") {
					near(view.related.start, view.card.start, "same start as the header card");
					near(view.related.width, view.card.width, "same width as the header card");
				}
			});

			it(`${style}: the call to action of a members-only post is in the text column at ${width}px`, async () => {
				const render = article({ custom: { article_style: style } });
				render.context.post.access = false;
				const { page, dispose } = await open({ render, viewport: { width, height: 900 } });
				const view = await columns(page, [".members-cta"]);
				await dispose();
				const cta = view.blocks[".members-cta"];
				assert.ok(cta, "the call to action");
				near(cta.start, view.text.start, "inline start");
				near(cta.width, view.text.width, "width");
			});
		}
	}

	it("follows the reader's « Largeur » setting: the author box and comments narrow with the text", async () => {
		const render = article({ custom: { article_style: "Card" } });
		const { page, dispose } = await open({ render, viewport: { width: 1440, height: 900 } });
		await page.evaluate(() => document.documentElement.setAttribute("data-reading-width", "s"));
		const view = await columns(page, BLOCKS);
		await dispose();
		assert.ok(view.text.width < 600, `the setting narrows the text: ${view.text.width}`);
		for (const selector of [".author-box__inner", ".article-comments__inner"]) {
			near(view.blocks[selector].start, view.text.start, `${selector} inline start`);
			near(view.blocks[selector].width, view.text.width, `${selector} width`);
		}
	});

	it("keeps the columns in right-to-left", async () => {
		const render = article({ custom: { article_style: "Card" } });
		const { page, dispose } = await open({ render, viewport: { width: 1440, height: 900 }, lang: "ar" });
		await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
		const view = await columns(page, BLOCKS);
		await dispose();
		for (const selector of [".author-box__inner", ".article-comments__inner"]) {
			near(view.blocks[selector].end, view.text.end, `${selector} inline end`);
			near(view.blocks[selector].width, view.text.width, `${selector} width`);
		}
	});
});
