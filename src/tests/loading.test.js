// How the pages load (audit « performance »): the theme's scripts do not wait for Ghost's, what they
// reveal moves nothing, and only the pictures of the first screen are downloaded up front.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { template } from "./support/pages.js";
import { article, LONG_HTML } from "./support/article.js";

const PHONE = { width: 390, height: 844 };

// Layout shifts of anything inside <main> (the header's wordmark may move when its font arrives)
const recordShifts = () => {
	window.__shifts = [];
	new PerformanceObserver(list => {
		for (const entry of list.getEntries()) {
			const nodes = entry.sources.map(s => s.node?.parentElement || s.node);
			if (nodes.some(n => n?.closest?.("main")))
				window.__shifts.push({ value: entry.value, nodes: nodes.map(n => n?.className || n?.nodeName) });
		}
	}).observe({ type: "layout-shift", buffered: true });
};

describe("theme scripts and Ghost's deferred scripts", () => {
	before(launch);
	after(close);

	// Ghost's {{ghost_head}} scripts (Portal: ~500 KB) are deferred: a plain module script of the theme
	// would wait in the same queue, behind them
	it("run as soon as they arrive, before a slow deferred script of Ghost", async () => {
		const { page, dispose } = await open({
			viewport: PHONE,
			ghostDefer: { delay: 1500 },
			initScript: () => {
				window.__ran = {};
				// app.js: setUpPrivacy defines window.attiblingConsent
				Object.defineProperty(window, "attiblingConsent", {
					configurable: true,
					set(value) {
						window.__ran.app = performance.now();
						Object.defineProperty(window, "attiblingConsent", { value, writable: true, configurable: true });
					},
				});
				// home.js: shows the hero's pager
				new MutationObserver(() => {
					const pager = document.querySelector("[data-hero-pager]");
					if (pager && !pager.hidden && !window.__ran.home) window.__ran.home = performance.now();
				}).observe(document, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
			},
		});
		const { ran, ghost } = await page.evaluate(() => ({ ran: window.__ran, ghost: window.__ghostDeferRan }));
		assert.ok(ghost > 1500, "Ghost's deferred script ran last");
		assert.ok(
			ran.app < ghost,
			`app.js ran at ${Math.round(ran.app)} ms, before Ghost's script (${Math.round(ghost)} ms)`,
		);
		assert.ok(ran.home < ghost, `home.js ran at ${Math.round(ran.home)} ms, before Ghost's script`);
		await dispose();
	});

	it("start once the page is parsed: they see the site's footer code, after them", async () => {
		// Ghost prints the footer code injection ({{ghost_foot}}) after the theme's scripts. Here a slow
		// classic script holds the parser there, so app.js arrives first; the gated script after it
		// must still be found (the reader accepted analytics earlier: it runs)
		const { page, dispose } = await open({
			render: template("tag", {
				custom: { use_geekly_logo: true, consent_notice: "Banner" },
				site: {
					settings: {
						codeinjection_foot:
							'<script src="/__slow.js"></script><script type="text/plain" data-consent="analytics">window.__gatedRan = true</script>',
					},
				},
			}),
			slow: { "/__slow.js": 1200 },
			storage: {
				"attibling-consent": JSON.stringify({ analytics: true, embeds: true, other: true, v: 1, at: Date.now() }),
			},
		});
		assert.equal(await waitFor(() => page.evaluate(() => window.__gatedRan)), true, "the gated script ran");
		await dispose();
	});
});

describe("nothing moves when the scripts reveal their parts", () => {
	before(launch);
	after(close);

	it("archives: the filter bar and the year headings arrive without pushing the list (CLS 0)", async () => {
		for (const viewport of [PHONE, { width: 1280, height: 800 }]) {
			const { page, dispose } = await open({
				render: template("page-archives", { site: { extra: 130 } }),
				viewport,
				slow: { "/assets/js/archives.js": 1200 },
				initScript: recordShifts,
			});
			await waitFor(() => page.locator(".archives--grouped").count());
			assert.equal(await page.locator("[data-archives-bar]").isVisible(), true);
			assert.deepEqual(await page.evaluate(() => window.__shifts), [], `no shift at ${viewport.width}px`);
			await dispose();
		}
	});

	it("archives: until the script runs the list keeps its place, and shows anyway if it never does", async () => {
		const { page, dispose } = await open({
			render: template("page-archives"),
			slow: { "/assets/js/archives.js": 1200 },
			initScript: () => {
				// At the first paint
				new PerformanceObserver((_, observer) => {
					observer.disconnect();
					const body = getComputedStyle(document.querySelector(".archives__body"));
					window.__early = { visibility: body.visibility, animation: `${body.animationName} ${body.animationDelay}` };
				}).observe({ type: "paint", buffered: true });
			},
		});
		assert.deepEqual(await page.evaluate(() => window.__early), {
			visibility: "hidden",
			animation: "archives-reveal 4s",
		});
		assert.equal(await page.locator(".archives__body").evaluate(el => getComputedStyle(el).visibility), "visible");
		await dispose();
	});

	it("table of contents: its place is kept from the first paint, in articles and documents", async () => {
		const html = '<p>Intro.</p><h2 id="a">Un</h2><p>Texte.</p><h2 id="b">Deux</h2><p>Texte.</p>';
		for (const [name, render, script] of [
			["article", article({ html: LONG_HTML }), "/assets/js/post.js"],
			["document", template("page-mentions-legales", { post: { html } }), "/assets/js/page.js"],
		]) {
			const { page, dispose } = await open({
				render,
				viewport: PHONE,
				slow: { [script]: 1200 },
				initScript: recordShifts,
			});
			await waitFor(() =>
				page
					.locator("[data-toc], [data-document-toc]")
					.first()
					.evaluate(el => !el.hidden),
			);
			// The headings' copy-link buttons may nudge a line by a pixel; the table of contents moved the
			// whole text (0.03 to 0.05 on a phone)
			const shift = await page.evaluate(() => window.__shifts.reduce((sum, s) => sum + s.value, 0));
			assert.ok(shift < 0.005, `the text stays in place in the ${name} (layout shift ${shift.toFixed(4)})`);
			await dispose();
		}
	});
});

describe("pictures of the first screen", () => {
	before(launch);
	after(close);

	const hero = page =>
		page.evaluate(() => [...document.querySelectorAll(".hero__image")].map(img => img.currentSrc !== ""));

	it("home hero: only the first slide's picture loads with the page, the others when asked for", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		assert.deepEqual(await hero(page), [true, false, false, false, false, false]);
		// Pointing at a dot readies its slide; a click shows it, faded in
		await page.locator("[data-hero-dot]").nth(2).hover();
		assert.equal(await waitFor(async () => (await hero(page))[2]), true, "the third picture loads on hover");
		await page.locator("[data-hero-dot]").nth(2).click();
		const third = page.locator("[data-hero-slide]").nth(2);
		assert.equal(await waitFor(() => third.evaluate(el => getComputedStyle(el).opacity === "1")), true);
		// A dot clicked straight away (keyboard, touch) shows its slide too
		await page.locator("[data-hero-dot]").nth(4).focus();
		await page.keyboard.press("Enter");
		const fifth = page.locator("[data-hero-slide]").nth(4);
		assert.equal(await waitFor(() => fifth.evaluate(el => !el.inert && getComputedStyle(el).opacity === "1")), true);
		assert.deepEqual((await hero(page)).slice(0, 5), [true, false, true, false, true]);
		await dispose();
	});

	it("« À propos »: the first rubrics' pictures load at once, the first one first", async () => {
		const { page, dispose } = await open({
			render: template("page-a-propos", { site: { tagImage: tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}` } }),
		});
		const images = await page.evaluate(() =>
			[...document.querySelectorAll(".about-rubric__image")].map(img => [
				img.getAttribute("loading"),
				img.fetchPriority,
			]),
		);
		assert.ok(images.length >= 4);
		assert.deepEqual(images.slice(0, 4), [
			[null, "high"],
			[null, "auto"],
			[null, "auto"],
			["lazy", "auto"],
		]);
		await dispose();
	});

	it("« Tags »: the cells on the first screen load their pictures at once, the first one first", async () => {
		for (const viewport of [
			{ width: 390, height: 560 },
			{ width: 1440, height: 420 },
		]) {
			const { page, dispose } = await open({
				render: template("page-tags", { site: { tagImage: tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}` } }),
				viewport,
			});
			const images = await page.evaluate(() =>
				[...document.querySelectorAll(".tag-cell__image")].map(img => ({
					top: img.getBoundingClientRect().top,
					loading: img.loading,
					priority: img.fetchPriority,
				})),
			);
			const onScreen = images.filter(i => i.top < viewport.height);
			assert.ok(
				onScreen.length > 0 && onScreen.length < images.length,
				`some cells below the screen: ${JSON.stringify(images)}`,
			);
			assert.ok(
				onScreen.every(i => i.loading === "eager"),
				`first screen eager at ${viewport.width}px`,
			);
			assert.ok(
				images.filter(i => i.top >= viewport.height).every(i => i.loading === "lazy"),
				"the others lazy",
			);
			assert.deepEqual(images.map(i => i.priority).filter(p => p === "high").length, 1, "one picture first");
			assert.equal(images[0].priority, "high");
			await dispose();
		}
	});
});
