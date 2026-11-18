import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";

describe("post page", () => {
	before(launch);
	after(close);

	it("makes content images zoomable, except linked images and cards", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const zoomable = await page.$$eval(".js-post-content img", imgs =>
			Object.fromEntries(imgs.map(img => [img.alt, img.classList.contains("js-zoomable")])),
		);
		assert.deepEqual(zoomable, { plain: true, linked: false, bookmark: false });
		await dispose();
	});

	it("keeps each video embed's own ratio and fits it to the column", async () => {
		for (const width of [390, 1440]) {
			const { page, dispose } = await open({ fixture: "post.html", viewport: { width, height: 800 } });
			const boxes = await page.$$eval(".js-post-content iframe", frames =>
				Object.fromEntries(
					frames.map(frame => {
						const box = frame.getBoundingClientRect();
						const parent = frame.parentElement.getBoundingClientRect();
						return [
							frame.className,
							{ width: box.width, ratio: box.width / box.height, left: box.left - parent.left, parent: parent.width },
						];
					}),
				),
			);
			const card = boxes["embed-4-3"];
			assert.ok(Math.abs(card.ratio - 4 / 3) < 0.02, `embed card ratio is ${card.ratio} at ${width}px`);
			assert.ok(Math.abs(card.width - card.parent * 0.66) < 2, `embed card is ${card.width}px wide at ${width}px`);
			assert.ok(Math.abs(card.left - (card.parent - card.width) / 2) < 2, `embed card is not centred at ${width}px`);
			const bare = boxes["bare-16-9"];
			assert.ok(Math.abs(bare.ratio - 16 / 9) < 0.02, `bare embed ratio is ${bare.ratio} at ${width}px`);
			assert.ok(Math.abs(bare.width - bare.parent) < 2, `bare embed is ${bare.width}px wide at ${width}px`);
			assert.equal(await page.locator(".fluid-width-video-wrapper").count(), 0);
			await dispose();
		}
	});

	it("zooms a zoomable image on click", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		await page.locator(".js-post-content img.plain-image").click();
		assert.equal(await waitFor(() => page.locator(".medium-zoom-image--opened").first().isVisible()), true);
		await dispose();
	});

	it("scrolls back to the top with the scroll-to-top button", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		await page.evaluate(() => window.scrollTo(0, 2000));
		await waitFor(() => page.evaluate(() => window.scrollY === 2000));

		await page.locator(".js-scrolltop").click();
		assert.equal(await waitFor(() => page.evaluate(() => window.scrollY === 0), { timeout: 3000 }), true);

		await dispose();
	});

	it("jumps to the top instantly when reduced motion is preferred", async () => {
		const { page, dispose } = await open({ fixture: "post.html", reducedMotion: "reduce" });
		await page.evaluate(() => window.scrollTo(0, 2000));
		await waitFor(() => page.evaluate(() => window.scrollY === 2000));

		await page.locator(".js-scrolltop").click();
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => window.scrollY), 0);

		await dispose();
	});

	// The share of the ring that is drawn, 0 to 1, once the page has had time to update it.
	const ringAt = async (page, y) => {
		await page.evaluate(y => window.scrollTo(0, y), y);
		await page.waitForTimeout(350);
		return page.evaluate(() => {
			const circle = document.querySelector(".js-progress");
			const shown = getComputedStyle(circle.ownerSVGElement).opacity === "1";
			const offset = parseFloat(getComputedStyle(circle).strokeDashoffset);
			return shown ? Math.round((1 - offset / 100) * 100) / 100 : null;
		});
	};
	const readingProgress = async page => {
		await page.waitForTimeout(400);
		const end = await page.evaluate(() => {
			const box = document.querySelector(".js-post-content").getBoundingClientRect();
			return box.bottom + window.scrollY - window.innerHeight;
		});
		return [await ringAt(page, 0), await ringAt(page, end / 2), await ringAt(page, end), await ringAt(page, 0)];
	};

	it("fills the reading progress ring as the post is read", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const [top, middle, end, back] = await readingProgress(page);
		assert.ok(top < 0.2, `ring at ${top} at the top`);
		assert.ok(middle > 0.4 && middle < 0.6, `ring at ${middle} half way`);
		assert.equal(end, 1, "full at the end of the post");
		assert.equal(back, top, "empties again when scrolling back up");
		await dispose();
	});

	it("fills the reading progress ring by script where scroll-driven animations are missing", async () => {
		const { page, dispose } = await open({
			fixture: "post.html",
			initScript: () => {
				const supports = CSS.supports.bind(CSS);
				CSS.supports = (...args) => !/timeline/.test(args.join(":")) && supports(...args);
				// What such a browser does with the theme's scroll-driven rules
				document.addEventListener("DOMContentLoaded", () => {
					const style = document.createElement("style");
					style.textContent = "* { animation-timeline: auto !important; animation: none !important; }";
					document.head.append(style);
				});
			},
		});
		const [top, middle, end, back] = await readingProgress(page);
		assert.ok(top < 0.2, `ring at ${top} at the top`);
		assert.ok(middle > 0.4 && middle < 0.6, `ring at ${middle} half way`);
		assert.equal(end, 1, "full at the end of the post");
		assert.equal(back, top, "empties again when scrolling back up");
		await dispose();
	});

	it("builds the table of contents from the post headings", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const links = await page.$$eval(".toc a", nodes => nodes.map(a => [a.getAttribute("href"), a.textContent]));
		assert.deepEqual(links, [
			["#first-heading", "First heading"],
			["#second-heading", "Second heading"],
			["#third-heading", "Third heading"],
			["#fourth-heading", "Fourth heading"],
		]);
		await dispose();
	});

	it("reloads native comments added after load when the theme changes", async () => {
		const { page, requests, dispose } = await open({
			fixture: "post.html",
			comments: '<div class="m-comments"><div class="l-wrapper in-comments js-native-comments"></div></div>',
		});
		const commentLoads = () => requests.filter(url => url.endsWith("/fixtures/comments.html")).length;

		await page.evaluate(() => {
			const holder = document.createElement("div");
			const iframe = document.createElement("iframe");
			iframe.src = "/src/tests/fixtures/comments.html";
			holder.appendChild(iframe);
			document.querySelector(".js-native-comments").appendChild(holder);
		});
		assert.equal(await waitFor(() => commentLoads() === 1), true);

		await page.locator(".js-switch-theme").dispatchEvent("click");
		assert.equal(await waitFor(() => commentLoads() === 2), true, "comments iframe reloaded");

		await dispose();
	});

	it("does not fail on theme change when the comments frame is cross-origin", async () => {
		const { page, dispose } = await open({
			fixture: "post.html",
			comments:
				'<div class="m-comments"><div class="l-wrapper in-comments js-native-comments"><div><iframe src="http://blog.test/comments/"></iframe></div></div></div>',
		});
		await page.locator(".js-switch-theme").dispatchEvent("click");
		await page.waitForTimeout(100);
		assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
		await dispose();
	});
});
