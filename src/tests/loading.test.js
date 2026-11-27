// How the pages load (audit « performance »): the theme's scripts do not wait for Ghost's, what they
// reveal moves nothing, and only the pictures of the first screen are downloaded up front.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { template, home } from "./support/pages.js";
import { article, LONG_HTML } from "./support/article.js";

const PHONE = { width: 390, height: 844 };
// package.json image_sizes: the name the test site's img_url writes (&size=<name>) for each width
const IMAGE_NAME = { 220: "w220", 300: "s", 400: "w400", 500: "w500", 600: "m", 800: "w800", 1000: "l" };

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

// Lighthouse counts every script that ran before the first paint as blocking it (and it did, on a fast
// connection): the theme's scripts are fetched and run once the first screen is painted
describe("theme scripts wait for the first paint", () => {
	before(launch);
	after(close);

	const timeline = page =>
		page.evaluate(() => ({
			paint: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
			scripts: performance
				.getEntriesByType("resource")
				.filter(entry => entry.name.includes("/assets/js/"))
				.map(entry => [new URL(entry.name).pathname, Math.round(entry.startTime)]),
			early: [...document.querySelectorAll('link[rel="modulepreload"]')].map(link => link.getAttribute("href")),
			waiting: document.querySelectorAll("template[data-theme-scripts]").length,
		}));

	it("home, article, « Tags », archives, « À lire plus tard »: no script of the theme is requested before the first paint, all of them after", async () => {
		for (const [name, render, entry] of [
			["home", undefined, "/assets/js/home.js"],
			["article", article({ html: LONG_HTML }), "/assets/js/post.js"],
			["tags", template("page-tags"), "/assets/js/tags.js"],
			["archives", template("page-archives"), "/assets/js/archives.js"],
			["read later", template("page-favoris", { member: true }), "/assets/js/saved.js"],
		]) {
			// Slow style sheets: the first paint comes late, long after the HTML is parsed; a slow deferred
			// script, as Ghost's Portal: the load event comes later still
			const { page, dispose } = await open({
				render,
				slow: { "/assets/css/app.css": 700 },
				ghostDefer: { delay: 1600 },
			});
			const { paint, scripts, early, waiting } = await timeline(page);
			assert.ok(paint >= 700, `${name}: painted at ${Math.round(paint)} ms`);
			assert.deepEqual(early, [], `${name}: no modulepreload`);
			const paths = scripts.map(([path]) => path);
			assert.ok(paths.includes("/assets/js/app.js") && paths.includes(entry), `${name}: ${paths}`);
			for (const [path, start] of scripts) {
				assert.ok(
					start >= paint,
					`${name}: ${path} requested at ${start} ms, the first paint at ${Math.round(paint)} ms`,
				);
			}
			assert.equal(waiting, 0, `${name}: the scripts left their <template>`);
			await dispose();
		}
	});

	it("start when the page is parsed if nothing is painted (a tab opened in the background), before the load event", async () => {
		const { page, dispose } = await open({
			render: article({ html: LONG_HTML }),
			initScript: () => {
				// No paint is ever reported
				const Native = window.PerformanceObserver;
				window.PerformanceObserver = class extends Native {
					observe(options) {
						if (options?.type !== "paint") super.observe(options);
					}
				};
				document.addEventListener("DOMContentLoaded", () => (window.__parsedAt = performance.now()));
				// post.js ran: the table of contents is there
				window.addEventListener("load", () => (window.__tocAtLoad = !document.querySelector("[data-toc]").hidden));
			},
		});
		const view = await page.evaluate(() => ({
			parsed: window.__parsedAt,
			scripts: performance
				.getEntriesByType("resource")
				.filter(entry => entry.name.includes("/assets/js/"))
				.map(entry => entry.startTime),
			ran: window.__tocAtLoad,
		}));
		assert.ok(view.scripts.length > 0 && view.scripts.every(start => start >= view.parsed - 5), JSON.stringify(view));
		assert.equal(view.ran, true, "the load event waited for the scripts");
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
			animation: "archives-reveal 1.5s",
		});
		assert.equal(await page.locator(".archives__body").evaluate(el => getComputedStyle(el).visibility), "visible");
		await dispose();
	});

	it("archives: a script that fails to load, or breaks, shows the list at once", async () => {
		// When the list becomes visible, in ms from the start of the navigation
		const watch = () => {
			const check = () => {
				const body = document.querySelector(".archives__body");
				if (body && getComputedStyle(body).visibility === "visible") window.__visibleAt = performance.now();
				else requestAnimationFrame(check);
			};
			requestAnimationFrame(check);
		};
		const failed = await open({
			render: template("page-archives"),
			slow: { "/assets/js/archives.js": 300 },
			fail: ["/assets/js/archives.js"],
			initScript: watch,
		});
		const loadFailed = await waitFor(() => failed.page.evaluate(() => window.__visibleAt));
		assert.ok(loadFailed < 1000, `shown at ${Math.round(loadFailed)} ms when the script cannot load`);
		await failed.dispose();

		const broken = await open({
			render: template("page-archives"),
			slow: { "/assets/js/archives.js": 300 },
			// The page the script expects is not quite there: it throws
			initScript: () => {
				const check = () => {
					const body = document.querySelector(".archives__body");
					if (body && getComputedStyle(body).visibility === "visible") window.__visibleAt = performance.now();
					else requestAnimationFrame(check);
				};
				requestAnimationFrame(check);
				document.addEventListener("DOMContentLoaded", () => document.querySelector("[data-archives-years]")?.remove());
			},
		});
		const threw = await waitFor(() => broken.page.evaluate(() => window.__visibleAt));
		assert.ok(threw < 1000, `shown at ${Math.round(threw)} ms when the script throws`);
		assert.equal(broken.errors.length, 1, "the error still reaches the console");
		broken.errors.length = 0;
		await broken.dispose();
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

	it("home hero: the first slide's picture loads with the page, the next one once idle, the others when asked for", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		assert.deepEqual((await hero(page)).slice(2), [false, false, false, false]);
		// Once the page has loaded and is idle: the next slide, its picture at low priority, and no other
		assert.equal(await waitFor(async () => (await hero(page))[1]), true, "the second picture, in the background");
		assert.equal(
			await page
				.locator(".hero__image")
				.nth(1)
				.evaluate(img => img.fetchPriority),
			"low",
		);
		await sleep(400);
		assert.deepEqual(await hero(page), [true, true, false, false, false, false]);
		// Pointing at a dot readies its slide; a click shows it, faded in, and readies the one after it
		await page.locator("[data-hero-dot]").nth(3).hover();
		assert.equal(await waitFor(async () => (await hero(page))[3]), true, "the fourth picture loads on hover");
		await page.locator("[data-hero-dot]").nth(3).click();
		const fourth = page.locator("[data-hero-slide]").nth(3);
		assert.equal(await waitFor(() => fourth.evaluate(el => getComputedStyle(el).opacity === "1")), true);
		assert.equal(await waitFor(async () => (await hero(page))[4]), true, "then the fifth, in the background");
		await sleep(400);
		assert.deepEqual(await hero(page), [true, true, false, true, true, false]);
		// A dot clicked straight away (keyboard, touch) shows its slide too
		await page.locator("[data-hero-dot]").nth(2).focus();
		await page.keyboard.press("Enter");
		const third = page.locator("[data-hero-slide]").nth(2);
		assert.equal(await waitFor(() => third.evaluate(el => !el.inert && getComputedStyle(el).opacity === "1")), true);
		await dispose();
	});

	it("home hero on a touch screen: the next slide's picture is already there when its dot is tapped", async () => {
		const { page, dispose } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
		const second = page.locator(".hero__image").nth(1);
		assert.equal(await waitFor(() => second.evaluate(img => img.currentSrc !== "" && img.complete)), true);
		await page.locator("[data-hero-dot]").nth(1).tap();
		assert.equal(
			await page
				.locator("[data-hero-slide]")
				.nth(1)
				.evaluate(el => !el.inert),
			true,
		);
		await dispose();
	});

	it("home hero with Save-Data: nothing readied in the background", async () => {
		const { page, dispose } = await open({
			viewport: { width: 1440, height: 900 },
			initScript: () => Object.defineProperty(navigator, "connection", { value: { saveData: true } }),
		});
		await sleep(800);
		assert.deepEqual(await hero(page), [true, false, false, false, false, false]);
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

	it("« Tags »: the cells on the first screen load their pictures at once, the largest of the first rows first", async () => {
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
					area: img.getBoundingClientRect().width * img.getBoundingClientRect().height,
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
			// The largest picture of the screen is the one Lighthouse times (LCP): a cell of two rows and two
			// columns, when the first rows have one, is more than twice any other
			const first = images.find(i => i.priority === "high");
			assert.ok(first.top < viewport.height, "on the first screen");
			assert.ok(first.area * 1.6 > images[0].area, "not smaller than the first cell");
			await dispose();
		}
	});
});

// Lighthouse « Improve image delivery »: every picture Ghost stores is asked for in WebP, and its sizes
// attribute is the width of its box, so a 1× desktop screen does not download the 2000 px rendition
describe("pictures: WebP, at the width of their box", () => {
	before(launch);
	after(close);

	// Lighthouse's desktop screen, 1×
	const DESKTOP = { width: 1350, height: 940 };
	// The rendition the browser chose (the test site's img_url writes &size=<name>&format=<format>)
	const chosen = (page, selector) =>
		page
			.locator(selector)
			.first()
			.evaluate(img => {
				const url = img.currentSrc || img.src;
				return `${/[?&]size=(\w+)/.exec(url)?.[1]} ${/[?&]format=(\w+)/.exec(url)?.[1]} ${Math.round(img.getBoundingClientRect().width)}`;
			});
	it("home: the hero takes the 1400 px rendition on a 1350 px screen, not the 2000 px one; the collection banner, a strip, its 1400 × 392 crop", async () => {
		const { page, dispose } = await open({
			render: home({ site: { tagImage: tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}` } }),
			viewport: DESKTOP,
		});
		assert.equal(await chosen(page, ".hero__image"), "w1400 webp 1242");
		const banner = page.locator(".banner__image").first();
		await banner.scrollIntoViewIfNeeded();
		await waitFor(() => banner.evaluate(img => img.currentSrc !== ""));
		assert.equal(await chosen(page, ".banner__image"), "banner webp 1242");
		// Every rendition of the page is WebP
		const formats = await page.evaluate(() =>
			[...document.querySelectorAll("main img[srcset]")]
				.flatMap(img => img.srcset.split(", "))
				.filter(candidate => !/[?&]format=webp /.test(candidate)),
		);
		assert.deepEqual(formats, []);
		await dispose();
	});

	it("article header: the width of its box, in the style « Carte » and in « Immersif »", async () => {
		for (const [internal, want, wide] of [
			// The picture fills the card (92vw, 1328 px at most): the 1400 px rendition on both screens
			[[], "w1400 webp 1242", "w1400 webp 1328"],
			[["#immersif"], "w1400 webp 1350", "xl webp 1920"],
		]) {
			const card = await open({ render: article({ internal }), viewport: DESKTOP });
			assert.equal(await chosen(card.page, "[data-article-image]"), want, internal.join());
			await card.dispose();
			const large = await open({ render: article({ internal }), viewport: { width: 1920, height: 1080 } });
			assert.equal(await chosen(large.page, "[data-article-image]"), wide, internal.join());
			await large.dispose();
		}
	});

	it("article header: a member who chose the other style gets the picture of that style's box", async () => {
		const { page, dispose } = await open({
			render: article({ member: true }),
			viewport: DESKTOP,
			storage: { "attibling-reading": JSON.stringify({ style: "immersive" }) },
		});
		const picture = page.locator("[data-article-image]");
		assert.equal(await waitFor(() => picture.evaluate(img => img.sizes === "100vw")), true);
		assert.equal(await waitFor(async () => (await chosen(page, "[data-article-image]")) === "w1400 webp 1350"), true);
		await dispose();
	});

	it("tag page: the header picture and the tiles do not grow with the screen beyond their box", async () => {
		const { page, dispose } = await open({
			render: template("tag", { site: { tagImage: tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}` } }),
			viewport: { width: 1920, height: 1080 },
		});
		// 903 px wide: the 1000 px rendition (the sizes attribute said 70vw: 1344 px, the 2000 px one)
		assert.match(await chosen(page, ".listing-hero__image"), /^l webp 90\d$/);
		// A tile of the grid is 314 px wide (33vw: 634 px, the 1000 px rendition): the 400 px one
		const tile = page.locator(".post-grid .tile__image").first();
		await tile.scrollIntoViewIfNeeded();
		await waitFor(() => tile.evaluate(img => img.currentSrc !== ""));
		assert.match(await chosen(page, ".post-grid .tile__image"), /^w400 webp 3\d\d$/);
		await dispose();
	});

	it("an SVG keeps its format (Ghost would rasterise it)", async () => {
		const { page, dispose } = await open({
			render: home({
				site: {
					image: (post, i) => (i % 2 ? "/content/images/2026/01/logo.svg" : "/content/images/2026/01/photo.jpg"),
				},
			}),
		});
		const sources = await page.evaluate(() =>
			[...document.querySelectorAll("main img[srcset]")].flatMap(img =>
				img.srcset.split(", ").map(c => c.split(" ")[0]),
			),
		);
		const svg = sources.filter(url => url.includes("logo.svg"));
		assert.ok(
			svg.length > 0 && svg.every(url => /^\/content\/images\/size\/w\d+\/2026\/01\/logo\.svg$/.test(url)),
			svg[0],
		);
		const photos = sources.filter(url => url.includes("photo.jpg"));
		assert.ok(photos.length > 0 && photos.every(url => url.includes("/format/webp/")), photos[0]);
		await dispose();
	});
});

// The « Tags » grid is arranged by a script: it must not wait for the style sheets to ask for the pictures
// of the first screen (Lighthouse: « LCP request discovery », 2 s of load delay on a phone)
describe("« Tags »: the first pictures do not wait for the style sheets", () => {
	before(launch);
	after(close);

	const tagsPage = () =>
		template("page-tags", { site: { tagImage: tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}` } });
	const timings = page =>
		page.evaluate(() => {
			const entries = performance.getEntriesByType("resource");
			const sheets = Math.max(...entries.filter(e => /\/assets\/css\//.test(e.name)).map(e => e.responseEnd));
			const pictures = [...document.querySelectorAll(".tag-cell__image")].map(img => {
				const entry = entries.find(e => e.name === img.currentSrc);
				const box = img.getBoundingClientRect();
				return {
					// The rendition asked for (the test site's &size=<name>) against the box
					wanted: /[?&]size=(\w+)/.exec(img.currentSrc)?.[1],
					width: box.width,
					height: box.height,
					early: Boolean(entry) && entry.startTime < sheets - 300,
					onScreen: box.top < innerHeight,
					firstRow: box.top <= document.querySelector(".tag-cell").getBoundingClientRect().top + 1,
					area: Math.round(box.width * box.height),
					priority: img.fetchPriority,
				};
			});
			return { sheets, pictures };
		});

	it("the first row's pictures are requested while the style sheets are still loading, the largest first", async () => {
		for (const viewport of [
			PHONE,
			{ width: 412, height: 823 },
			{ width: 800, height: 1000 },
			{ width: 1350, height: 940 },
		]) {
			const { page, dispose } = await open({
				render: tagsPage(),
				viewport,
				slow: { "/assets/css/app.css": 900, "/assets/css/tags.css": 900 },
			});
			const { sheets, pictures } = await timings(page);
			assert.ok(sheets >= 900, "the style sheets were slow");
			const early = pictures.filter(p => p.early);
			assert.ok(early.length > 0, `pictures requested before the style sheets at ${viewport.width}px`);
			assert.ok(
				pictures.filter(p => p.firstRow).every(p => p.early),
				`the whole first row at ${viewport.width}px: ${JSON.stringify(pictures)}`,
			);
			// The estimate made without layout never reaches below the screen
			assert.ok(
				early.every(p => p.onScreen),
				`only pictures of the first screen at ${viewport.width}px: ${JSON.stringify(pictures)}`,
			);
			// Each at the width of its cell (no layout yet for sizes="auto": not the screen's width): the smallest
			// rendition that covers it (as wide as its height needs for a 16:9 picture, when the cell is tall), less the 1.5% the
			// script allows for a scrollbar
			for (const p of early) {
				const smallest =
					[220, 300, 400, 500, 600, 800, 1000].find(
						w => w >= Math.ceil(Math.max(p.width, (p.height * 16) / 9) * 0.985),
					) || 1000;
				assert.equal(p.wanted, IMAGE_NAME[smallest], `a ${Math.round(p.width)} px cell at ${viewport.width}px`);
			}
			const first = pictures.filter(p => p.priority === "high");
			assert.equal(first.length, 1, "one picture first");
			assert.ok(first[0].early, "requested with the first ones");
			// A cell of two rows and two columns is more than twice any other
			assert.ok(first[0].area * 1.6 > Math.max(...early.map(p => p.area)), "the largest of them");
			await dispose();
		}
	});

	it("the grid is arranged and shown at the first paint, with slow style sheets too (no reshuffle, CLS 0)", async () => {
		const { page, dispose } = await open({
			render: tagsPage(),
			viewport: PHONE,
			slow: { "/assets/css/app.css": 600, "/assets/css/tags.css": 600 },
			initScript: () => {
				window.__shifts = [];
				new PerformanceObserver(list => {
					for (const entry of list.getEntries())
						if (entry.sources.some(s => (s.node?.parentElement || s.node)?.closest?.("main")))
							window.__shifts.push(entry.value);
				}).observe({ type: "layout-shift", buffered: true });
				new PerformanceObserver((_, observer) => {
					observer.disconnect();
					const grid = document.querySelector("[data-tag-bento]");
					window.__firstPaint = {
						arranged: grid.hasAttribute("data-arranged"),
						hidden: document.documentElement.hasAttribute("data-tags-arranging"),
						visibility: getComputedStyle(grid).visibility,
					};
				}).observe({ type: "paint", buffered: true });
			},
		});
		// The paint may be reported after the load event
		assert.deepEqual(await waitFor(() => page.evaluate(() => window.__firstPaint)), {
			arranged: true,
			hidden: false,
			visibility: "visible",
		});
		assert.deepEqual(await page.evaluate(() => window.__shifts), []);
		await dispose();
	});
});
