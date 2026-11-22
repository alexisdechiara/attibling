// The owner's feedback on 2.0.0 (home and header): card lift, binary wordmark docking, the "ly" colour,
// the hero (tagline under « GEEK », click targets, pager), « Les plus lus », the banner row, the
// subscription block's benefits, the « ••• » menu and the header that hides on a fast scroll down.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, template } from "./support/pages.js";
import { article } from "./support/article.js";

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

// A computed colour as [r, g, b] (0–255), from rgb() or color(srgb …)
const rgb = value => {
	const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
	if (srgb) return srgb.slice(1, 4).map(n => Math.round(Number(n) * 255));
	return value
		.match(/[\d.]+/g)
		.slice(0, 3)
		.map(Number);
};

describe("tiles lift on hover", () => {
	before(launch);
	after(close);

	const lift = (page, selector, moved) =>
		page.evaluate(
			([selector, moved]) => {
				const el = document.querySelector(selector);
				const target = moved ? el.querySelector(moved) : el;
				return {
					y: new DOMMatrix(getComputedStyle(target).transform).f,
					underline: [...el.querySelectorAll("*")].some(e =>
						getComputedStyle(e).textDecorationLine.includes("underline"),
					),
				};
			},
			[selector, moved],
		);

	it("lifts tiles, lead cards, rows and tag tiles instead of underlining their title", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const cases = [
			["main .row--shelf [data-post-tile]", ":scope > a", -5],
			["main .lead", ":scope > a", -5],
			["main .latest__list li", ":scope > .row-item", -3],
			["main .tag-grid li", ".tag-tile", -5],
		];
		for (const [selector, moved, expected] of cases) {
			await page.locator(selector).first().scrollIntoViewIfNeeded();
			await page.locator(selector).first().hover();
			await sleep(400);
			const state = await lift(page, selector, moved);
			assert.equal(Math.round(state.y), expected, `${selector} lifts`);
			assert.equal(state.underline, false, `${selector}: no underline`);
		}
		await dispose();
	});

	it("lifts on keyboard focus too, keeps the focus ring, and does not move under reduced motion", async () => {
		const normal = await open({ viewport: DESKTOP });
		const link = normal.page.locator("main .row--shelf [data-post-tile] > a").first();
		await link.focus();
		await normal.page.keyboard.press("Shift+Tab");
		await normal.page.keyboard.press("Tab");
		await sleep(400);
		const focused = await normal.page.evaluate(() => {
			const a = document.activeElement;
			return { y: new DOMMatrix(getComputedStyle(a).transform).f, outline: getComputedStyle(a).outlineStyle };
		});
		assert.equal(Math.round(focused.y), -5);
		assert.notEqual(focused.outline, "none", "a visible focus ring");
		await normal.dispose();

		const reduced = await open({ viewport: DESKTOP, reducedMotion: "reduce" });
		await reduced.page.locator("main .row--shelf [data-post-tile]").first().hover();
		await sleep(400);
		assert.equal(Math.round((await lift(reduced.page, "main .row--shelf [data-post-tile]", ":scope > a")).y), 0);
		await reduced.dispose();
	});

	it("leaves room in the scrolling rows so the lift is not clipped", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const room = await page.evaluate(() => {
			const track = document.querySelector("main .row--shelf .shelf__track");
			const tile = track.querySelector("[data-post-tile]");
			return tile.getBoundingClientRect().top - track.getBoundingClientRect().top;
		});
		assert.ok(room >= 16, `room above the tiles: ${room}px`);
		await dispose();
	});
});

describe("wordmark docking is binary", () => {
	before(launch);
	after(close);

	const state = page =>
		page.evaluate(() => {
			const header = document.getElementById("site-header");
			const logo = header.querySelector("[data-header-logo] [data-wordmark]");
			return {
				dock: header.dataset.dock,
				flight: header.hasAttribute("data-dock-flight"),
				scale: new DOMMatrix(getComputedStyle(logo).transform).a,
				logo: getComputedStyle(logo.parentElement).visibility,
				hero: Number(getComputedStyle(document.getElementById("hero-wordmark")).opacity),
			};
		});
	// The scroll position at which the hero wordmark's top reaches the bar's bottom
	const threshold = page =>
		page.evaluate(() => {
			const header = document.getElementById("site-header");
			return Math.round(
				document.getElementById("hero-wordmark").getBoundingClientRect().top + scrollY - header.offsetHeight,
			);
		});
	// The flight over, and the short fades of the swap (150 ms) with it
	// At rest in the given state ("docked" | "undocked"): no flight, the fades of the swap over
	const settled = (page, dock) =>
		waitFor(
			async () => {
				const s = await state(page);
				if (dock && s.dock !== dock) return false;
				const rest = s.dock === "docked" ? s.logo === "visible" && s.hero === 0 : s.logo === "hidden" && s.hero === 1;
				return !s.flight && s.scale === 1 && rest && s;
			},
			{ timeout: 5000 },
		).then(s => s || state(page));

	// Records, from the first frame of every page load, each frame's flight state and logo scale
	// (window.__dock), so the tests read what happened instead of guessing timings
	const SAMPLER = () => {
		window.__dock = [];
		const sample = () => {
			const header = document.getElementById("site-header");
			const logo = header?.querySelector("[data-header-logo] [data-wordmark]");
			if (logo)
				window.__dock.push({
					flight: header.hasAttribute("data-dock-flight"),
					dock: header.dataset.dock,
					scale: new DOMMatrix(getComputedStyle(logo).transform).a,
				});
			requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	};
	const samples = page => page.evaluate(() => window.__dock.splice(0));
	// Loaded, and past the first moments when the docking is instant (scroll restoration)
	const ready = page =>
		waitFor(() => page.evaluate(() => document.readyState === "complete" && window.__dock.length > 20));

	it("flies the whole way into the header once the threshold is crossed, and back", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, initScript: SAMPLER });
		await ready(page);
		assert.deepEqual(await state(page), { dock: "undocked", flight: false, scale: 1, logo: "hidden", hero: 1 });
		const at = await threshold(page);
		await samples(page);

		// Just past the threshold, then the scroll stops: the logo still ends in the header
		await page.evaluate(y => scrollTo(0, y), at - 8);
		let s = await settled(page, "docked");
		assert.deepEqual(s, { dock: "docked", flight: false, scale: 1, logo: "visible", hero: 0 }, "never stuck between");
		let frames = (await samples(page)).filter(f => f.flight);
		assert.ok(frames.length > 0, "it flew");
		assert.ok(frames[0].scale > 2, `from the hero's size (${frames[0].scale})`);
		assert.ok(
			frames.every((f, i) => i === 0 || f.scale <= frames[i - 1].scale + 0.001),
			"shrinking all the way, without going back",
		);

		// Hysteresis: back a little, still docked (no flight starts)
		await page.evaluate(y => scrollTo(0, y), at - 30);
		await waitFor(() => page.evaluate(() => window.__dock.length > 10));
		assert.equal((await state(page)).dock, "docked", "no flicker near the threshold");
		assert.equal(
			(await samples(page)).some(f => f.flight),
			false,
		);

		// Back above: the reverse flight, to the hero
		await page.evaluate(() => scrollTo(0, 0));
		s = await settled(page, "undocked");
		assert.deepEqual(s, { dock: "undocked", flight: false, scale: 1, logo: "hidden", hero: 1 });
		frames = (await samples(page)).filter(f => f.flight);
		assert.ok(frames.length > 0 && frames.at(-1).scale > 2, "it flew back to the hero's size");
		await dispose();
	});

	it("reverses mid-flight from where the logo is", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, initScript: SAMPLER });
		await ready(page);
		const at = await threshold(page);
		await page.evaluate(y => scrollTo(0, y), at + 20);
		// Halfway (by size), whatever the machine's speed
		const start = await waitFor(() => page.evaluate(() => window.__dock.find(f => f.flight)?.scale));
		await waitFor(() =>
			page.evaluate(start => {
				const last = window.__dock.at(-1);
				return last.flight && last.scale < 1 + (start - 1) * 0.6;
			}, start),
		);
		await samples(page);
		await page.evaluate(() => scrollTo(0, 0));
		await settled(page, "undocked");
		const frames = await samples(page);
		const reversal = frames.findIndex(f => f.dock === "undocked");
		const before = frames[reversal - 1] || frames[0];
		const after = frames[reversal];
		assert.ok(after.flight && after.scale > 1 && after.scale < start, `mid-flight: ${after.scale}`);
		assert.ok(Math.abs(after.scale - before.scale) < 0.5 * start, `continuous: ${before.scale} → ${after.scale}`);
		assert.ok(frames.filter(f => f.flight).at(-1).scale > 2, "then back to the hero's size");
		await dispose();
	});

	it("is docked at once, without a flight, when the page loads scrolled", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, initScript: SAMPLER });
		await ready(page);
		await page.evaluate(() => scrollTo(0, 900));
		await settled(page, "docked");
		// The browser restores the scroll position on reload
		await page.reload({ waitUntil: "load" });
		await ready(page);
		await waitFor(() => page.evaluate(() => window.scrollY > 800 && window.__dock.length > 10));
		const s = await state(page);
		assert.equal(s.dock, "docked");
		assert.equal(
			(await samples(page)).some(f => f.flight),
			false,
			"no flight",
		);
		await dispose();
	});

	it("swaps without a flight under reduced motion", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, reducedMotion: "reduce", initScript: SAMPLER });
		await ready(page);
		await page.evaluate(() => scrollTo(0, 600));
		await waitFor(async () => (await state(page)).dock === "docked");
		await waitFor(() => page.evaluate(() => window.__dock.length > 10));
		assert.equal(
			(await samples(page)).some(f => f.flight),
			false,
		);
		await dispose();
	});

	it("draws the docked « ly » in the header's colour: black in light mode, white in dark mode", async () => {
		for (const colorScheme of ["light", "dark"]) {
			const { page, dispose } = await open({ viewport: DESKTOP, colorScheme });
			const ly = () =>
				page.evaluate(() => getComputedStyle(document.querySelector("[data-header-logo] .wordmark__script")).color);
			const hero = await page.evaluate(
				() => getComputedStyle(document.querySelector("#hero-wordmark .wordmark__script")).color,
			);
			assert.deepEqual(rgb(hero), [255, 255, 255], "white on the hero");
			await page.evaluate(() => scrollTo(0, 700));
			await settled(page, "docked");
			const expected = colorScheme === "light" ? [18, 20, 24] : [255, 255, 255];
			assert.deepEqual(rgb(await ly()), expected, `${colorScheme}: docked`);
			await page.reload({ waitUntil: "load" });
			await page.evaluate(() => scrollTo(0, 700));
			await settled(page, "docked");
			assert.deepEqual(rgb(await ly()), expected, `${colorScheme}: after a reload while scrolled`);
			await dispose();

			const other = await open({ render: template("post"), viewport: DESKTOP, colorScheme });
			assert.deepEqual(
				rgb(
					await other.page.evaluate(
						() => getComputedStyle(document.querySelector("[data-header-logo] .wordmark__script")).color,
					),
				),
				expected,
				`${colorScheme}: other pages`,
			);
			await other.dispose();
		}
	});
});

describe("hero", () => {
	before(launch);
	after(close);

	// The "y" of the hero wordmark (its advance box: the descender's leftmost ink is at its left edge)
	const geometry = page =>
		page.evaluate(() => {
			const wordmark = document.getElementById("hero-wordmark");
			const text = wordmark.querySelector(".wordmark__script").firstChild;
			const range = document.createRange();
			range.setStart(text, 1);
			range.setEnd(text, 2);
			const y = range.getBoundingClientRect();
			const tagline = document.querySelector(".hero__tagline").getBoundingClientRect();
			const g = wordmark.querySelector(".wordmark__g").getBoundingClientRect();
			// The letters' baseline: a zero-height box aligned on it
			const probe = document.createElement("span");
			probe.style.cssText = "display:inline-block;width:0;height:0";
			wordmark.querySelector(".wordmark__letters").prepend(probe);
			const baseline = probe.getBoundingClientRect().top;
			probe.remove();
			// The tagline's first line of text
			const lines = document.createRange();
			lines.selectNodeContents(document.querySelector(".hero__tagline"));
			const first = lines.getClientRects()[0];
			return {
				y: [y.left, y.top, y.right, y.bottom],
				tagline: [tagline.left, first.top, tagline.right, tagline.bottom],
				g: g.left,
				baseline,
				size: parseFloat(getComputedStyle(wordmark).fontSize),
				lines: Math.round(
					tagline.height / parseFloat(getComputedStyle(document.querySelector(".hero__tagline")).lineHeight),
				),
				post: document.querySelector("[data-hero-slide]:not([hidden]) .hero__post")?.getBoundingClientRect().left,
				right: wordmark.getBoundingClientRect().right,
			};
		});

	// Tight under « GEEK »: the top of the tagline's first line box sits between the letters' baseline
	// and 0.12 of the wordmark's size under it (the tests use fallback fonts; on the local Ghost with
	// Onest the cap top of the tagline is 0.075 of the wordmark's size under the baseline).
	for (const width of [390, 768, 1024, 1280, 1440, 1920]) {
		it(`tucks the tagline under « GEEK », left of the "y" descender (${width}px)`, async () => {
			for (const description of [null, "A long description of the site, which has to wrap within the width of GEEK"]) {
				const { page, dispose } = await open({ viewport: { width, height: 900 } });
				await page.evaluate(() => document.fonts.ready);
				if (description)
					await page.evaluate(d => (document.querySelector(".hero__tagline").textContent = d), description);
				const m = await geometry(page);
				const [tl, tt, tr] = m.tagline;
				assert.ok(Math.abs(tl - m.g) < 6, `starts at the wordmark's start (${tl} vs ${m.g})`);
				assert.ok(tr <= m.y[0], `ends before the "y" (${tr} ≤ ${m.y[0]})`);
				assert.ok(tt >= m.baseline - 1, `below the letters' baseline (${tt} ≥ ${m.baseline})`);
				assert.ok(
					tt - m.baseline <= 0.12 * m.size,
					`attached to the letters (${(tt - m.baseline).toFixed(1)} ≤ ${(0.12 * m.size).toFixed(1)})`,
				);
				assert.ok(tt < m.y[3], "beside the descender, not below it");
				assert.ok(m.lines <= 2, "two lines at most");
				if (width >= 1024) assert.ok(m.right + 16 <= m.post, `clear of the post (${m.right} + 16 ≤ ${m.post})`);
				// During the font swap: « Onest Fallback » for the letters and the tagline, another face for
				// the "ly". The tagline keeps its place under the baseline (no visible jump when Onest arrives).
				if (!description) {
					await page.addStyleTag({
						content:
							'.hero__brand, .hero__brand .wordmark { font-family: "Onest Fallback", sans-serif !important } .hero__brand .wordmark__script { font-family: serif !important }',
					});
					const f = await geometry(page);
					const gap = f.tagline[1] - f.baseline;
					assert.ok(gap >= -1 && gap <= 0.12 * f.size, `fallback faces: attached (${gap.toFixed(1)})`);
					assert.ok(
						Math.abs(gap - (tt - m.baseline)) <= 0.02 * m.size,
						`no jump when the font arrives (${gap.toFixed(1)} vs ${(tt - m.baseline).toFixed(1)})`,
					);
					assert.ok(f.tagline[2] <= f.y[0], 'fallback faces: ends before the "y"');
				}
				await dispose();
			}
		});
	}

	it("stacks the tagline normally without the GEEKly wordmark", async () => {
		const { page, dispose } = await open({ render: home({ custom: {} }), viewport: DESKTOP });
		const [title, tagline] = await page.evaluate(() =>
			[".hero__title", ".hero__tagline"].map(s => document.querySelector(s).getBoundingClientRect().toJSON()),
		);
		assert.ok(tagline.top >= title.bottom, "under the title");
		await dispose();
	});

	it("links only the post's own group: the left block and the background do nothing", async () => {
		for (const viewport of [PHONE, DESKTOP]) {
			const { page, dispose } = await open({ viewport });
			const hits = await page.evaluate(() => {
				const card = document.querySelector(".hero__card").getBoundingClientRect();
				const at = (x, y) => document.elementFromPoint(x, y)?.closest("a, button");
				const tagline = document.querySelector(".hero__tagline").getBoundingClientRect();
				const post = document.querySelector("[data-hero-slide]:not([inert]) [data-hero-post]");
				const box = post.getBoundingClientRect();
				return {
					slideIsLink: document.querySelector("[data-hero-slide]").tagName,
					tagline: at(tagline.left + 4, tagline.top + 4)?.tagName ?? null,
					corner: at(card.left + 8, card.bottom - 8)?.tagName ?? null,
					post: at(box.left + box.width / 2, box.top + box.height / 2) === post,
					parts: [...post.children].map(c => c.className.split(" ")[0]),
				};
			});
			assert.equal(hits.slideIsLink, "DIV");
			assert.equal(hits.tagline, null, "the tagline is not a link");
			assert.equal(hits.corner, null, "the empty background is not a link");
			assert.equal(hits.post, true, "the post's group is");
			assert.deepEqual(
				hits.parts.filter(p => p !== "hero__post-excerpt"),
				["pill", "hero__post-title", "hero__post-meta"],
			);
			await dispose();
		}
	});

	it("shows a hover state on the post's group", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const post = page.locator("[data-hero-slide]:not([inert]) [data-hero-post]");
		const background = () => post.evaluate(el => getComputedStyle(el).backgroundColor);
		const rest = await background();
		await post.hover();
		await sleep(350);
		assert.notEqual(await background(), rest);
		await dispose();
	});
});

describe("hero pager", () => {
	before(launch);
	after(close);

	it("cues once per session that the dots are clickable, never under reduced motion", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const cued = await waitFor(
			() => page.evaluate(() => document.querySelector("[data-hero-pager]").hasAttribute("data-cue")),
			{
				timeout: 3000,
			},
		);
		assert.equal(cued, true, "the dots ripple");
		assert.equal(await page.evaluate(() => sessionStorage.getItem("attibling-hero-cue")), "1");
		const animated = await page.evaluate(() =>
			document
				.querySelectorAll("[data-hero-dot]")[1]
				.getAnimations({ subtree: true })
				.map(a => a.animationName),
		);
		assert.ok(animated.includes("hero-dot-cue"));
		// Only compositor properties: a background or a shadow in a keyframe repaints the page every frame
		const properties = await page.evaluate(() => [
			...new Set(
				[...document.querySelectorAll("[data-hero-dot]")]
					.flatMap(dot => dot.getAnimations({ subtree: true }))
					.flatMap(a => a.effect.getKeyframes().flatMap(k => Object.keys(k)))
					.filter(key => !["offset", "easing", "composite", "computedOffset"].includes(key)),
			),
		]);
		assert.ok(properties.length > 0, "the dots animate");
		assert.deepEqual(
			properties.filter(key => !["opacity", "transform", "scale", "translate", "rotate"].includes(key)),
			[],
			`animated: ${properties}`,
		);
		await page.reload({ waitUntil: "load" });
		await sleep(2000);
		assert.equal(
			await page.evaluate(() => document.querySelector("[data-hero-pager]").hasAttribute("data-cue")),
			false,
			"once",
		);
		await dispose();

		const reduced = await open({ viewport: DESKTOP, reducedMotion: "reduce" });
		await sleep(2000);
		assert.equal(await reduced.page.evaluate(() => sessionStorage.getItem("attibling-hero-cue")), null);
		await reduced.dispose();
	});

	it("previews the post of a dot, fills the new current dot, and never advances on its own", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const dot = page.locator("[data-hero-dot]").nth(2);
		await dot.hover();
		await sleep(300);
		const preview = await dot.locator(".hero__dot-preview").evaluate(el => ({
			opacity: getComputedStyle(el).opacity,
			text: el.textContent,
			hidden: el.getAttribute("aria-hidden"),
		}));
		assert.equal(preview.opacity, "1");
		assert.match(preview.text, /Knowless/);
		assert.equal(preview.hidden, "true");
		await dot.click();
		const state = await page.evaluate(() => ({
			fill: document
				.querySelectorAll("[data-hero-dot]")[2]
				.getAnimations({ subtree: true })
				.map(a => a.animationName || ""),
			entering: document.querySelectorAll("[data-hero-slide]")[2].hasAttribute("data-entering"),
		}));
		assert.ok(
			state.fill.some(n => n.startsWith("hero-dot-fill")),
			"the pill fills",
		);
		assert.equal(state.entering, true, "the post rises in");
		await page.mouse.move(10, 890);
		await sleep(2500);
		assert.equal(
			await page.evaluate(() => document.querySelectorAll("[data-hero-dot]")[2].getAttribute("aria-current")),
			"true",
			"no auto-advance",
		);
		await dispose();
	});
});

describe("home sections", () => {
	before(launch);
	after(close);

	it("has no « Les plus lus » (title, row or gap) without #top posts", async () => {
		const { page, dispose } = await open({ render: home({ site: { top: false } }), viewport: DESKTOP });
		assert.equal(await page.locator(".top, #top-title").count(), 0);
		await dispose();
	});

	it("puts the banner's count beside « Tag » and its tag's picture behind it", async () => {
		for (const [slug, image] of [
			["ia", true],
			["anime", false],
		]) {
			const { page, dispose } = await open({
				render: home({ custom: { use_geekly_logo: true, home_row_4: slug } }),
				viewport: DESKTOP,
			});
			const banner = await page.evaluate(() => {
				const b = document.querySelector(".banner");
				const kicker = b.querySelector(".banner__kicker");
				const [label, , count] = kicker.children;
				return {
					image: Boolean(b.querySelector(".banner__image")),
					noImage: b.classList.contains("banner--no-image"),
					sameLine: Math.abs(label.getBoundingClientRect().top - count.getBoundingClientRect().top) < 4,
					countAfter: count.getBoundingClientRect().left > label.getBoundingClientRect().right,
					aboveTitle:
						kicker.getBoundingClientRect().bottom <= b.querySelector(".banner__title").getBoundingClientRect().top,
					text: kicker.innerText.replace(/\s+/g, " ").trim(),
				};
			});
			assert.equal(banner.image, image, slug);
			assert.equal(banner.noImage, !image);
			assert.ok(banner.sameLine && banner.countAfter && banner.aboveTitle, JSON.stringify(banner));
			assert.match(banner.text, /^Tag ?· ?\d+ posts$/);
			await dispose();
		}
	});

	it("uses the tags' pictures in the « Tags » row", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		const tiles = await page.$$eval("main .tag-grid .tag-tile", els =>
			els.map(el => ({
				image: Boolean(el.querySelector(".tag-tile__image")),
				plain: el.classList.contains("tag-tile--no-image"),
			})),
		);
		assert.ok(tiles.some(t => t.image) && tiles.every(t => t.image !== t.plain));
		await dispose();
	});

	for (const width of [390, 768, 1024, 1440]) {
		it(`keeps each benefit's name on one line and its text on two (${width}px)`, async () => {
			const { page, dispose } = await open({ viewport: { width, height: 900 } });
			// The longest text of any language must still fit: make them very long
			await page.evaluate(() =>
				document.querySelectorAll(".promo__benefit").forEach(b => {
					b.querySelector(".promo__benefit-title").textContent += " — a very long name for this benefit indeed";
					b.querySelector(".promo__benefit-text").textContent +=
						" ".repeat(1) + "and a much longer explanation ".repeat(6);
				}),
			);
			const lines = await page.$$eval(".promo__benefit", els =>
				els.map(el => {
					const lh = s => parseFloat(getComputedStyle(s).lineHeight);
					const title = el.querySelector(".promo__benefit-title");
					const text = el.querySelector(".promo__benefit-text");
					return [
						Math.round(title.getBoundingClientRect().height / lh(title)),
						Math.round(text.getBoundingClientRect().height / lh(text)),
					];
				}),
			);
			for (const [title, text] of lines) {
				assert.equal(title, 1, `${width}px: one line for the name`);
				assert.ok(text <= 2, `${width}px: two lines at most (${text})`);
			}
			await dispose();
		});
	}
});

describe("« ••• » menu", () => {
	before(launch);
	after(close);

	it("opens recent posts and tags under the bar, and closes on Escape", async () => {
		const { page, errors, dispose } = await open({ viewport: DESKTOP });
		const button = page.locator("[data-discover-button]");
		assert.equal(await button.getAttribute("aria-label"), "Recent posts and tags");
		await button.click();
		const panel = page.locator("[data-discover-menu]");
		assert.equal(await waitFor(() => panel.isVisible()), true);
		const content = await panel.evaluate(el => ({
			posts: el.querySelectorAll(".discover__posts .row-item").length,
			dates: el.querySelectorAll(".discover__posts time").length,
			tags: el.querySelectorAll(".discover__tag").length,
			all: el.querySelector(".discover__all")?.getAttribute("href"),
			top: Math.round(el.getBoundingClientRect().top),
			bar: Math.round(document.querySelector(".site-header__bar").getBoundingClientRect().bottom),
		}));
		assert.equal(content.posts, 6);
		assert.equal(content.dates, 6);
		assert.ok(content.tags > 3);
		assert.match(content.all, /\/tags\/$/);
		assert.ok(content.top >= content.bar && content.top - content.bar < 20, "right under the bar");
		await page.keyboard.press("Tab");
		assert.equal(
			await page.evaluate(() => document.activeElement.closest("[data-discover-menu]") !== null),
			true,
			"Tab goes into it",
		);
		await page.keyboard.press("Escape");
		assert.equal(await waitFor(async () => !(await panel.isVisible())), true);
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("is in the phone menu sheet too", async () => {
		const { page, dispose } = await open({ viewport: PHONE });
		await page.locator("[data-menu-button]").click();
		await sleep(300);
		const content = await page.evaluate(() => {
			const sheet = document.querySelector("[data-mobile-menu] .mobile-menu__discover");
			return {
				posts: sheet.querySelectorAll(".row-item").length,
				tags: sheet.querySelectorAll(".discover__tag").length,
				visible: sheet.getBoundingClientRect().height > 0,
			};
		});
		assert.deepEqual({ ...content, tags: content.tags > 3 }, { posts: 4, tags: true, visible: true });
		await dispose();
	});
});

describe("header hides on a fast scroll down", () => {
	before(launch);
	after(close);

	const hidden = page => page.evaluate(() => document.getElementById("site-header").hasAttribute("data-hidden"));
	const scrollBy = (page, dy) =>
		page.evaluate(
			dy =>
				new Promise(r => {
					scrollBy(0, dy);
					requestAnimationFrame(() => requestAnimationFrame(r));
				}),
			dy,
		);

	it("hides past 40 px down in a frame, comes back past 20 px up and near the top", async () => {
		const { page, dispose } = await open({ render: template("tag"), viewport: DESKTOP });
		await scrollBy(page, 300);
		await scrollBy(page, 300);
		assert.equal(await hidden(page), true, "a fast scroll down");
		await scrollBy(page, -15);
		assert.equal(await hidden(page), true, "a small scroll up does not bring it back");
		await scrollBy(page, -30);
		assert.equal(await hidden(page), false, "more than 20 px up does");
		for (let i = 0; i < 10; i++) await scrollBy(page, 30);
		assert.equal(await hidden(page), false, "a slow scroll down keeps it");
		await scrollBy(page, 400);
		assert.equal(await hidden(page), true);
		await page.evaluate(() => scrollTo(0, 10));
		await sleep(50);
		assert.equal(await hidden(page), false, "always shown at the top");
		await dispose();
	});

	it("never hides with a menu open or focus inside, and focusing it brings it back", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.evaluate(() => scrollTo(0, 400));
		await page.locator("[data-discover-button]").click();
		await scrollBy(page, 300);
		assert.equal(await hidden(page), false, "« ••• » open");
		await page.keyboard.press("Escape");
		await page.locator("[data-ghost-search]").focus();
		await scrollBy(page, 300);
		assert.equal(await hidden(page), false, "focus in the header");
		await page.evaluate(() => document.activeElement.blur());
		await scrollBy(page, 300);
		assert.equal(await hidden(page), true);
		await page.locator("[data-ghost-search]").focus();
		assert.equal(await hidden(page), false, "focusing a header control reveals it");
		await dispose();
	});

	it("slides away with motion and disappears at once without", async () => {
		const normal = await open({ render: template("tag"), viewport: DESKTOP });
		assert.match(
			await normal.page.evaluate(() => getComputedStyle(document.getElementById("site-header")).transitionProperty),
			/transform/,
		);
		await normal.dispose();
		const reduced = await open({ render: template("tag"), viewport: DESKTOP, reducedMotion: "reduce" });
		assert.doesNotMatch(
			await reduced.page.evaluate(() => getComputedStyle(document.getElementById("site-header")).transitionProperty),
			/transform/,
		);
		await reduced.page.evaluate(() => scrollTo(0, 500));
		await sleep(50);
		await reduced.page.evaluate(() => scrollTo(0, 1100));
		await sleep(50);
		assert.equal(
			await reduced.page.evaluate(() => document.getElementById("site-header").hasAttribute("data-hidden")),
			true,
		);
		await reduced.dispose();
	});

	it("keeps the docked wordmark logic on the home page", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.evaluate(() => scrollTo(0, 900));
		await sleep(600);
		assert.equal(await page.evaluate(() => document.getElementById("site-header").dataset.dock), "docked");
		await scrollBy(page, -200);
		await sleep(600);
		assert.equal(await hidden(page), false);
		assert.equal(await page.evaluate(() => document.getElementById("site-header").dataset.dock), "docked");
		await dispose();
	});
});

describe("article table of contents", () => {
	before(launch);
	after(close);

	// A long article: many sections of text
	const LONG = Array.from(
		{ length: 14 },
		(_, i) =>
			`<h2 id="s${i}">Section ${i + 1}</h2>` +
			`<p>${"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(40)}</p>`.repeat(3),
	).join("");

	it("stays in view deep into a long article at 1440px, and follows the header when it hides", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }), viewport: DESKTOP });
		await waitFor(() => page.evaluate(() => document.querySelectorAll("[data-toc-list] a").length > 10));
		const box = () =>
			page.evaluate(() => {
				const nav = document.querySelector("[data-toc] .article-toc__nav").getBoundingClientRect();
				return { top: nav.top, bottom: nav.bottom, height: document.documentElement.scrollHeight };
			});
		const { height } = await box();
		assert.ok(height > 6000, `a long page (${height}px)`);
		// Deep, slowly (the header stays): under the header
		await page.evaluate(async () => {
			for (let y = 0; y <= 3000; y += 30) {
				scrollTo(0, y);
				await new Promise(r => requestAnimationFrame(r));
			}
		});
		const shown = await waitFor(async () => {
			const b = await box();
			return b.top >= 72 && b.bottom <= 900 && b;
		});
		assert.ok(shown, `in view under the header: ${JSON.stringify(await box())}`);
		// A fast scroll down hides the header: the list moves up, still in view
		await page.evaluate(() => scrollBy(0, 400));
		await page.evaluate(() => scrollBy(0, 400));
		const higher = await waitFor(async () => {
			const b = await box();
			return b.top < shown.top - 30 && b.top >= 0 && b.bottom <= 900 && b;
		});
		assert.ok(higher, `higher once the header hides: ${JSON.stringify(await box())}`);
		await dispose();
	});

	it("moves the table of contents up without restyling the page: --header-offset changes on the table only", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }), viewport: DESKTOP });
		await waitFor(() => page.evaluate(() => document.querySelectorAll("[data-toc-list] a").length > 10));
		const offsets = () =>
			page.evaluate(() => {
				const value = el => getComputedStyle(el).getPropertyValue("--header-offset").trim();
				return {
					hidden: document.getElementById("site-header").hasAttribute("data-hidden"),
					root: value(document.documentElement),
					body: value(document.body),
					toc: value(document.querySelector(".article-toc")),
				};
			});
		const before = await offsets();
		assert.equal(before.hidden, false);
		assert.notEqual(before.root, "0px");
		assert.equal(before.toc, before.root, "the table follows the header while it shows");
		await page.evaluate(() => scrollBy(0, 400));
		await page.evaluate(() => scrollBy(0, 400));
		const after = await waitFor(async () => {
			const o = await offsets();
			return o.hidden && o;
		});
		assert.ok(after, "the header hides");
		assert.equal(after.root, before.root, "not changed on :root");
		assert.equal(after.body, before.body, "nor on the body");
		assert.equal(after.toc, "0px", "the table sticks to the top of the window once the header is away");
		await dispose();
	});
});
