// The owner's feedback on 2.0.0 (home and header): card lift, binary wordmark docking, the "ly" colour,
// the hero (tagline under « GEEK », click targets, pager), « Les plus lus », the banner row, the
// subscription block's benefits, the « ••• » menu and the header that hides on a fast scroll down.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, template } from "./support/pages.js";

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
			["main .row-item", ".row-item__media", -3],
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
	const settled = async page => {
		await waitFor(async () => !(await state(page)).flight);
		await sleep(250);
		return state(page);
	};

	it("flies the whole way into the header once the threshold is crossed, and back", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await sleep(200);
		assert.deepEqual(await state(page), { dock: "undocked", flight: false, scale: 1, logo: "hidden", hero: 1 });
		const at = await threshold(page);

		// Just past the threshold, then the scroll stops: the logo still ends in the header
		await page.evaluate(y => scrollTo(0, y), at - 8);
		await sleep(50);
		let s = await state(page);
		assert.equal(s.dock, "docked");
		assert.equal(s.flight, true, "it flies");
		assert.ok(s.scale > 2, `from the hero's size (${s.scale})`);
		s = await settled(page);
		assert.deepEqual(s, { dock: "docked", flight: false, scale: 1, logo: "visible", hero: 0 }, "never stuck between");

		// Hysteresis: back a little, still docked
		await page.evaluate(y => scrollTo(0, y), at - 30);
		await sleep(300);
		assert.equal((await state(page)).dock, "docked", "no flicker near the threshold");

		// Back above: the reverse flight, to the hero
		await page.evaluate(() => scrollTo(0, 0));
		await sleep(50);
		assert.equal((await state(page)).flight, true);
		s = await settled(page);
		assert.deepEqual(s, { dock: "undocked", flight: false, scale: 1, logo: "hidden", hero: 1 });
		await dispose();
	});

	it("reverses mid-flight from where the logo is", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await sleep(200);
		const at = await threshold(page);
		await page.evaluate(y => scrollTo(0, y), at + 20);
		await sleep(180);
		const before = (await state(page)).scale;
		await page.evaluate(() => scrollTo(0, 0));
		await sleep(20);
		const after = await state(page);
		assert.equal(after.dock, "undocked");
		assert.ok(after.scale > 1 && Math.abs(after.scale - before) < 1.2, `continuous: ${before} → ${after.scale}`);
		await dispose();
	});

	it("is docked at once, without a flight, when the page loads scrolled", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.evaluate(() => scrollTo(0, 900));
		await settled(page);
		await page.evaluate(() => {
			const header = document.getElementById("site-header");
			window.__flew = false;
			new MutationObserver(() => header.hasAttribute("data-dock-flight") && (window.__flew = true)).observe(header, {
				attributes: true,
			});
		});
		await page.reload({ waitUntil: "load" });
		await page.evaluate(() => scrollTo(0, 900));
		await sleep(300);
		const s = await state(page);
		assert.equal(s.dock, "docked");
		assert.equal(s.flight, false);
		await dispose();
	});

	it("swaps without a flight under reduced motion", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, reducedMotion: "reduce" });
		await sleep(200);
		await page.evaluate(() => {
			window.__flew = false;
			const header = document.getElementById("site-header");
			new MutationObserver(() => header.hasAttribute("data-dock-flight") && (window.__flew = true)).observe(header, {
				attributes: true,
			});
		});
		await page.evaluate(() => scrollTo(0, 600));
		await sleep(400);
		assert.equal((await state(page)).dock, "docked");
		assert.equal(await page.evaluate(() => window.__flew), false);
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
			await settled(page);
			const expected = colorScheme === "light" ? [18, 20, 24] : [255, 255, 255];
			assert.deepEqual(rgb(await ly()), expected, `${colorScheme}: docked`);
			await page.reload({ waitUntil: "load" });
			await page.evaluate(() => scrollTo(0, 700));
			await settled(page);
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
			};
		});

	for (const width of [390, 768, 1440]) {
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
				assert.ok(tt >= m.baseline, `below the letters' baseline (${tt} ≥ ${m.baseline})`);
				assert.ok(tt < m.y[3], "beside the descender, not below it");
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

	it("puts the banner's count beside « Rubrique » and its tag's picture behind it", async () => {
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
			assert.match(banner.text, /^Section ?· ?\d+ posts$/);
			await dispose();
		}
	});

	it("uses the tags' pictures in the « Rubriques » row", async () => {
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
		assert.equal(content.posts, 4);
		assert.equal(content.dates, 4);
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

	it("slides away with motion, disappears at once without, and moves the sticky table of contents up", async () => {
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
			await reduced.page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue("--header-offset").trim(),
			),
			"0px",
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
