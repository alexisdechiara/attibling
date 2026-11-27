// The owner's feedback on the header and footer: the « ••• » panel (six recent posts, or recommendations
// for a member, then one line: the word « Tags », the tags as plain lighter links, « Tous les tags »), compact rows that lift as one block, pages set in the site's font, the redone
// footer, and the colour of the wordmark's "ly" (and of a site logo drawn for dark backgrounds) on
// every page, in every theme mode and system scheme.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, template } from "./support/pages.js";

const DESKTOP = { width: 1440, height: 900 };
const LAPTOP = { width: 1024, height: 800 };
const TABLET = { width: 768, height: 1024 };
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

describe("« ••• » panel", () => {
	before(launch);
	after(close);

	const openPanel = async viewport => {
		const opened = await open({ viewport });
		await opened.page.locator("[data-discover-button]").click();
		await waitFor(() => opened.page.locator("[data-discover-menu]").isVisible());
		await sleep(300);
		return opened;
	};

	const layout = page =>
		page.evaluate(() => {
			const panel = document.querySelector("[data-discover-menu]");
			const items = [...panel.querySelectorAll(".discover__posts > li")];
			const tops = [...new Set(items.map(li => Math.round(li.getBoundingClientRect().top)))];
			const posts = panel.querySelector(".discover__section--posts").getBoundingClientRect();
			const tags = panel.querySelector(".discover__section--tags").getBoundingClientRect();
			const tag = panel.querySelector(".discover__tag");
			const style = getComputedStyle(tag);
			return {
				count: items.length,
				rows: tops.length,
				perRow: items.filter(li => Math.round(li.getBoundingClientRect().top) === tops[0]).length,
				tagsBelow: tags.top >= posts.bottom - 1,
				tagBackground: style.backgroundColor,
				tagRadius: parseFloat(style.borderTopLeftRadius),
				tagWeight: Number(style.fontWeight),
				titleWeight: Number(
					getComputedStyle(panel.querySelector(".discover__section--tags .discover__title")).fontWeight,
				),
				// The word « Tags », every tag and « Tous les tags »: the middle of each box, to tell one line from two
				tagLine: [
					panel.querySelector(".discover__section--tags .discover__title"),
					...panel.querySelectorAll(".discover__tag"),
					panel.querySelector(".discover__all"),
				]
					.map(el => el.getBoundingClientRect())
					.filter(box => box.width > 0)
					.map(box => Math.round(box.top + box.height / 2)),
				tagsHeight: panel.querySelector(".discover__section--tags").getBoundingClientRect().height,
				// How far each layer of the shadow reaches above the panel (blur + spread - vertical offset), and
				// the gap between the bar and the panel
				shadowUp: getComputedStyle(panel)
					.boxShadow.split(/,(?![^(]*\))/)
					.map(layer =>
						layer
							.replace(/(rgba?|color)\([^)]*\)/, "")
							.match(/-?[\d.]+px/g)
							.map(parseFloat),
					)
					.map(([, y, blur = 0, spread = 0]) => blur + spread - y),
				gap: panel.getBoundingClientRect().top - document.getElementById("site-header").getBoundingClientRect().bottom,
				tagHeight: tag.getBoundingClientRect().height,
				all: panel.querySelector(".discover__all")?.getAttribute("href"),
				overflow: panel.scrollWidth > panel.clientWidth + 1,
			};
		});

	it("shows six recent posts in one row, then « Tags » and the tags on one line, the tags lighter (1440px)", async () => {
		const { page, dispose } = await openPanel(DESKTOP);
		const l = await layout(page);
		assert.equal(l.count, 6);
		assert.equal(l.rows, 1, "one row of six");
		assert.equal(l.tagsBelow, true, "the tags come below the posts");
		assert.equal(l.tagBackground, "rgba(0, 0, 0, 0)", "no pill background");
		assert.ok(l.tagRadius <= 4, "no pill shape");
		assert.ok(l.titleWeight >= 600, "the word « Tags » stays bold");
		assert.ok(l.tagWeight < l.titleWeight, "the tags are lighter than the word « Tags »");
		assert.ok(l.tagLine.length >= 4, "the word, the tags and « Tous les tags »");
		assert.ok(Math.max(...l.tagLine) - Math.min(...l.tagLine) <= 4, `one line (${l.tagLine})`);
		assert.ok(l.tagsHeight <= 48, `no empty line above the tags (${l.tagsHeight}px)`);
		assert.ok(
			l.gap > 0 && Math.max(...l.shadowUp) <= l.gap,
			`the shadow stays under the bar, which cut it off (${l.shadowUp} px up, ${l.gap} px of gap)`,
		);
		assert.ok(l.tagHeight >= 44, "44 px target");
		assert.match(l.all, /\/tags\/$/);
		assert.equal(l.overflow, false);
		await dispose();
	});

	const menu = page =>
		page.evaluate(() => {
			const panel = document.querySelector("[data-discover-menu]");
			const sheet = document.querySelector("[data-mobile-menu] .mobile-menu__discover");
			const read = root => ({
				title: root.querySelector("[data-discover-title]").textContent.trim(),
				posts: [...root.querySelectorAll(".discover__posts > li")].map(li => ({
					url: new URL(li.querySelector("a").href).pathname,
					tag: li.querySelector(".meta__tag")?.textContent.trim() || "",
				})),
			});
			const pool = document.querySelector("[data-discover-pool]");
			return {
				panel: read(panel),
				sheet: read(sheet),
				pool:
					pool &&
					[...pool.content.querySelectorAll("li")].map(li => ({
						url: new URL(li.querySelector("a").href, location.href).pathname,
						tag: li.querySelector(".meta__tag")?.textContent.trim() || "",
					})),
			};
		});

	it("keeps the recent posts for a visitor, and for a member who has read nothing yet", async () => {
		const visitor = await open({
			viewport: DESKTOP,
			storage: {
				"attibling-progress": JSON.stringify([{ url: "/x/", title: "x", tag: "Anime", progress: 0.5, updatedAt: 1 }]),
			},
		});
		const seen = await menu(visitor.page);
		assert.equal(seen.pool, null, "no pool is rendered for a visitor");
		assert.equal(seen.panel.title, "Recent posts");
		await visitor.dispose();

		const member = await open({ viewport: DESKTOP, render: home({ member: true }) });
		await sleep(300);
		const fresh = await menu(member.page);
		assert.ok(fresh.pool.length > 6, "a member gets a pool of posts to pick from");
		assert.equal(fresh.panel.title, "Recent posts");
		assert.deepEqual(fresh.panel.posts, seen.panel.posts, "the same six recent posts");
		await member.dispose();
	});

	it("recommends to a member posts of the tags they read, without the posts of their lists", async () => {
		const probe = await open({ viewport: DESKTOP, render: home({ member: true }) });
		const { pool, panel: recent } = await menu(probe.page);
		await probe.dispose();
		// A tag with several posts in the pool; its newest post is the one being read
		const tag = pool.map(p => p.tag).find(t => t && pool.filter(p => p.tag === t).length >= 3);
		assert.ok(tag, "the fixture has a tag with three posts");
		const reading = pool.find(p => p.tag === tag);
		const others = pool.filter(p => p.tag === tag && p.url !== reading.url);

		const { page, errors, dispose } = await open({
			viewport: DESKTOP,
			render: home({ member: true }),
			storage: {
				"attibling-progress": JSON.stringify([
					{ url: reading.url, title: "t", tag, progress: 0.5, updatedAt: Date.now() },
				]),
			},
		});
		const state = await waitFor(async () => {
			const s = await menu(page);
			return s.panel.title === "Recommended for you" && s;
		});
		assert.ok(state, "the heading says the posts are recommended");
		assert.equal(state.panel.posts.length, 6, "still six posts in the panel");
		assert.equal(state.sheet.posts.length, 4, "and four in the phone sheet");
		assert.equal(state.sheet.title, "Recommended for you");
		const shown = Math.min(others.length, 6);
		assert.deepEqual(
			state.panel.posts.slice(0, shown).map(p => p.url),
			others.slice(0, shown).map(p => p.url),
			"the posts of the tag come first, newest first",
		);
		assert.ok(!state.panel.posts.some(p => p.url === reading.url), "not the post being read");
		assert.notDeepEqual(state.panel.posts, recent.posts);
		assert.equal(new Set(state.panel.posts.map(p => p.url)).size, 6, "no post twice");
		// The pictures of the posts taken from the pool are asked at the size of their box
		await page.locator("[data-discover-button]").click();
		await sleep(400);
		const pictures = await page.$$eval("[data-discover-menu] .discover__posts img", imgs =>
			imgs.map(img => ({ sizes: img.getAttribute("sizes") })),
		);
		assert.ok(pictures.length > 0 && pictures.every(p => p.sizes?.includes("194px")), "the sizes of the panel");
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("keeps the recent posts when nothing else carries the tags the member read", async () => {
		const { page, dispose } = await open({
			viewport: DESKTOP,
			render: home({ member: true }),
			storage: {
				"attibling-saved": JSON.stringify([{ url: "/gone/", title: "t", tag: "A tag no post has", savedAt: 1 }]),
			},
		});
		await sleep(400);
		assert.equal((await menu(page)).panel.title, "Recent posts");
		await dispose();
	});

	for (const viewport of [LAPTOP, TABLET]) {
		it(`wraps the six posts into even rows (${viewport.width}px)`, async () => {
			const { page, dispose } = await openPanel(viewport);
			const l = await layout(page);
			assert.equal(l.count, 6);
			assert.equal(l.rows, 2, "two rows");
			assert.equal(l.perRow, 3, "three per row");
			assert.equal(l.tagsBelow, true);
			assert.equal(l.overflow, false);
			await dispose();
		});
	}

	it("keeps four posts as a list and the tags as plain links in the phone menu sheet", async () => {
		const { page, dispose } = await open({ viewport: PHONE });
		await page.locator("[data-menu-button]").click();
		await sleep(300);
		const s = await page.evaluate(() => {
			const sheet = document.querySelector("[data-mobile-menu] .mobile-menu__discover");
			const tag = sheet.querySelector(".discover__tag");
			return {
				posts: sheet.querySelectorAll(".discover__posts > li").length,
				background: getComputedStyle(tag).backgroundColor,
				overflow: sheet.scrollWidth > sheet.clientWidth + 1,
			};
		});
		assert.deepEqual(s, { posts: 4, background: "rgba(0, 0, 0, 0)", overflow: false });
		await dispose();
	});
});

describe("compact rows lift as one block", () => {
	before(launch);
	after(close);

	// How far the parts of an item moved after hovering it
	const moves = async (page, item, parts) => {
		const read = () =>
			page.evaluate(
				([item, parts]) => {
					const el = document.querySelector(item);
					return [el, ...parts.map(p => el.querySelector(p))].map(e => e.getBoundingClientRect().top + scrollY);
				},
				[item, parts],
			);
		await page.locator(item).scrollIntoViewIfNeeded();
		const before = await read();
		await page.hover(item);
		await sleep(450);
		const after = await read();
		return after.map((v, i) => Math.round((v - before[i]) * 10) / 10);
	};

	it("home « Derniers articles »: the six rows and the lead card move whole", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.evaluate(() => document.querySelector(".latest").scrollIntoView());
		const [li, media, title, meta] = await moves(page, ".latest__list li:nth-child(2)", [
			".row-item__media",
			".row-item__title",
			".tile__meta",
		]);
		assert.equal(li, 0, "the list item (hover target) stays in place");
		assert.ok(media < -2, `the thumbnail lifts (${media})`);
		assert.equal(title, media, "the title moves with it");
		assert.equal(meta, media, "the meta line moves with it");
		const [lead, image, leadTitle] = await moves(page, ".lead", [".lead__media", ".lead__title"]);
		assert.equal(lead, 0);
		assert.ok(image < -2);
		assert.equal(leadTitle, image, "the lead's title moves with its picture");
		await dispose();
	});

	it("the « ••• » panel's posts move whole too", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.locator("[data-discover-button]").click();
		await sleep(400);
		const [li, media, title] = await moves(page, ".discover .discover__posts li:nth-child(1)", [
			".row-item__media",
			".row-item__title",
		]);
		assert.equal(li, 0);
		assert.ok(media < -2);
		assert.equal(title, media);
		await dispose();
	});

	it("no lift with reduced motion: the shadow changes instead", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP, reducedMotion: "reduce" });
		await page.evaluate(() => document.querySelector(".latest").scrollIntoView());
		const shadow = () =>
			page.evaluate(
				() => getComputedStyle(document.querySelector(".latest__list li:nth-child(2) .row-item__media")).boxShadow,
			);
		const rest = await shadow();
		const [, media, title] = await moves(page, ".latest__list li:nth-child(2)", [
			".row-item__media",
			".row-item__title",
		]);
		assert.equal(media, 0);
		assert.equal(title, 0);
		assert.notEqual(await shadow(), rest);
		await dispose();
	});

	it("keyboard focus lifts the row and keeps its focus ring", async () => {
		const { page, dispose } = await open({ viewport: DESKTOP });
		await page.evaluate(() => document.querySelector(".latest").scrollIntoView());
		const focused = await page.evaluate(async () => {
			const link = document.querySelector(".latest__list li:nth-child(3) .row-item");
			link.focus({ focusVisible: true });
			await new Promise(r => setTimeout(r, 400));
			const style = getComputedStyle(link);
			return { y: new DOMMatrix(style.transform).f, outline: style.outlineStyle };
		});
		assert.ok(focused.y < -2, `lifted (${focused.y})`);
		assert.notEqual(focused.outline, "none");
		await dispose();
	});
});

describe("pages use the site's font", () => {
	before(launch);
	after(close);

	const families = (page, selectors) =>
		page.evaluate(selectors => {
			const read = () =>
				Object.fromEntries(
					selectors
						.filter(s => document.querySelector(s))
						.map(s => [s, getComputedStyle(document.querySelector(s)).fontFamily]),
				);
			const theme = read();
			document.documentElement.style.setProperty("--gh-font-body", '"Body Test Font", serif');
			return { theme, custom: read() };
		}, selectors);

	const cases = [
		[
			"page",
			[".page-content", ".page-article__excerpt", ".embed-facade blockquote"],
			{
				custom_excerpt: "A lead sentence.",
				html: '<p>Body</p><figure class="kg-card kg-embed-card"><div class="embed-facade"><blockquote>A post on X</blockquote></div></figure>',
			},
		],
		["page-a-propos", [".about__lead", ".about-note__text"], { custom_excerpt: "A lead sentence." }],
		["page-mentions-legales", [".document__content", ".document__lead"], { custom_excerpt: "A lead sentence." }],
		["page-newsletter", [".subscribe-hero__notes"], {}],
		["page-tags", [".tags-header__intro"], {}],
	];
	for (const [name, selectors, post] of cases) {
		it(`${name}: Onest, or Ghost's body font when it is set`, async () => {
			const { page, dispose } = await open({ render: template(name, { post }), viewport: DESKTOP });
			const f = await families(page, selectors);
			assert.ok(Object.keys(f.theme).length > 0, "something to check");
			for (const [selector, family] of Object.entries(f.theme)) assert.match(family, /^Onest,/, selector);
			for (const [selector, family] of Object.entries(f.custom))
				assert.equal(family, '"Body Test Font", serif', selector);
			await dispose();
		});
	}

	it("articles keep their own font, Noto Sans, for their text", async () => {
		const { page, dispose } = await open({ render: template("post"), viewport: DESKTOP });
		const family = await page.evaluate(() => getComputedStyle(document.querySelector(".gh-content p")).fontFamily);
		assert.match(family, /^"Noto Sans"/);
		await dispose();
	});

	it("legal text keeps a comfortable measure in the sans-serif (60 to 75 characters per line)", async () => {
		const text =
			"<p>" +
			"Le présent site est édité à titre personnel par son auteur, qui en assure la publication. ".repeat(12) +
			"</p>";
		const { page, dispose } = await open({
			render: template("page-mentions-legales", { post: { html: text } }),
			viewport: DESKTOP,
		});
		const m = await page.evaluate(() => {
			const p = document.querySelector(".document__content p");
			const style = getComputedStyle(p);
			return {
				width: p.getBoundingClientRect().width,
				size: parseFloat(style.fontSize),
				lh: parseFloat(style.lineHeight),
			};
		});
		// The tests do not load web fonts: the measure is checked in ems, with Onest's average width of a
		// character of French text (0.449 em, measured on the local Ghost with the real font)
		const cpl = m.width / m.size / 0.449;
		assert.ok(cpl >= 60 && cpl <= 75, `${Math.round(cpl)} characters per line`);
		assert.ok(m.lh / m.size >= 1.5, "line height");
		await dispose();
	});
});

describe("footer", () => {
	before(launch);
	after(close);

	const read = page =>
		page.evaluate(() => {
			const footer = document.querySelector(".site-footer");
			const box = s => footer.querySelector(s)?.getBoundingClientRect().toJSON();
			const description = "L’actu geek, tech et pop";
			return {
				brand: box(".site-footer__brand"),
				nav: box(".site-footer__nav"),
				bottom: box(".site-footer__bottom"),
				copyright: box(".site-footer__copyright"),
				legal: box(".site-footer__legal"),
				descriptions: footer.textContent.split(description).length - 1,
				license: footer.querySelector('a[rel="jslicense"]')?.getAttribute("href"),
				ghost: footer.querySelector('a[href="https://ghost.org"]') !== null,
				rss: footer.querySelector('a[href$="/rss/"]') !== null,
				targets: [...footer.querySelectorAll(".site-footer__nav a, .site-footer__legal a")].map(a => {
					const r = a.getBoundingClientRect();
					return [a.textContent.trim(), Math.round(r.height)];
				}),
				overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			};
		});

	it("a top row (brand left, navigation right) and a bottom bar (copyright left, legal links right) at 1440px", async () => {
		const { page, dispose } = await open({ render: template("tag"), viewport: DESKTOP });
		const f = await read(page);
		assert.ok(f.brand.right < f.nav.left, "brand then navigation");
		assert.ok(f.bottom.top >= Math.max(f.brand.bottom, f.nav.bottom), "the bar comes after the top row");
		assert.ok(Math.abs(f.copyright.top - f.legal.top) < 6, "copyright and legal links on one line");
		assert.ok(f.copyright.right < f.legal.left, "copyright at the start, legal links at the end");
		assert.equal(f.descriptions, 1, "the tagline once");
		assert.match(f.license, /javascript\.html$/);
		assert.equal(f.ghost, true);
		assert.equal(f.rss, true);
		for (const [label, height] of f.targets) assert.ok(height >= 44, `${label}: ${height}px`);
		assert.equal(f.overflow, false);
		await dispose();
	});

	for (const viewport of [TABLET, PHONE]) {
		it(`stacks cleanly without overflow (${viewport.width}px)`, async () => {
			const { page, dispose } = await open({ render: template("tag"), viewport });
			const f = await read(page);
			assert.equal(f.overflow, false);
			assert.ok(f.bottom.top >= f.nav.bottom - 1);
			assert.equal(f.descriptions, 1);
			for (const [label, height] of f.targets) assert.ok(height >= 44, `${label}: ${height}px`);
			await dispose();
		});
	}

	it("lists the secondary navigation and the social accounts set in Ghost (Bluesky included)", async () => {
		const { page, dispose } = await open({
			render: template("tag", {
				site: { settings: { bluesky: "geekly.bsky.social", mastodon: "@geekly@mastodon.social" } },
			}),
			viewport: DESKTOP,
		});
		const labels = await page.evaluate(() =>
			[...document.querySelectorAll(".site-footer__nav a")].map(
				a => a.getAttribute("aria-label") || a.textContent.trim(),
			),
		);
		for (const label of ["About", "Contact", "X", "Bluesky", "Mastodon", "RSS"])
			assert.ok(labels.includes(label), label);
		await dispose();
	});

	it("mirrors in right-to-left", async () => {
		const { page, dispose } = await open({ render: template("tag"), viewport: DESKTOP, lang: "ar" });
		await page.evaluate(() => (document.documentElement.dir = "rtl"));
		const f = await read(page);
		assert.ok(f.brand.left > f.nav.right, "brand on the right");
		assert.ok(f.copyright.left > f.legal.right, "copyright on the right");
		await dispose();
	});
});

describe('the wordmark\'s "ly"', () => {
	before(launch);
	after(close);

	const INK = [18, 20, 24];
	const WHITE = [255, 255, 255];
	const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 2);
	const colours = page =>
		page.evaluate(() => {
			const c = s => {
				const el = document.querySelector(s);
				return el ? getComputedStyle(el).color : null;
			};
			return {
				theme: document.documentElement.getAttribute("data-theme"),
				header: c("#site-header [data-header-logo] .wordmark__script"),
				footer: c(".site-footer .wordmark__script"),
				menu: c("#site-menu .wordmark__script"),
				hero: c("#hero-wordmark .wordmark__script"),
			};
		});

	const pages = {
		home: () => home(),
		post: () => template("post"),
		tag: () => template("tag"),
		tags: () => template("page-tags"),
		about: () => template("page-a-propos"),
		legal: () => template("page-mentions-legales"),
		404: () => template("error-404"),
	};
	for (const [name, render] of Object.entries(pages)) {
		it(`${name}: dark on light, light on dark, white on the hero, in every mode and system scheme`, async () => {
			for (const mode of ["light", "dark", "auto"])
				for (const colorScheme of ["light", "dark"]) {
					const storage = mode === "auto" ? null : { theme: mode };
					const { page, dispose } = await open({ render: render(), viewport: DESKTOP, colorScheme, storage });
					const states = name === "home" ? ["undocked", "docked"] : ["page"];
					for (const state of states) {
						if (state === "docked") {
							await page.evaluate(() => scrollTo(0, 700));
							await waitFor(() =>
								page.evaluate(() => {
									const h = document.getElementById("site-header");
									return h.dataset.dock === "docked" && !h.hasAttribute("data-dock-flight");
								}),
							);
						}
						const c = await colours(page);
						const resolved = mode === "auto" ? colorScheme : mode;
						assert.equal(c.theme, resolved);
						const expected = resolved === "dark" ? WHITE : INK;
						const label = `${name} ${state}, mode ${mode}, system ${colorScheme}`;
						for (const where of ["header", "footer", "menu"])
							assert.ok(near(rgb(c[where]), expected), `${label}: ${where} ${c[where]}`);
						if (name === "home") assert.ok(near(rgb(c.hero), WHITE), `${label}: hero ${c.hero}`);
					}
					await dispose();
				}
		});
	}

	// A site logo drawn for dark backgrounds (white strokes on transparency, like a "ly" in white): on
	// light surfaces its white parts take the text colour; coloured parts and logos whose white sits
	// inside a coloured shape are left alone; on dark surfaces and on images it shows as it is.
	const logoPage = (logo, colorScheme, storage = null) =>
		open({
			render: template("tag", { custom: {}, site: { settings: { logo } } }),
			viewport: DESKTOP,
			colorScheme,
			storage,
		});
	const inkOf = page =>
		page.evaluate(() =>
			[...document.querySelectorAll(".wordmark--logo")].map(w => ({
				ink: w.getAttribute("data-ink"),
				filter: getComputedStyle(w.querySelector(".wordmark__image")).filter,
			})),
		);

	it("a white-ink logo gets the text colour on light surfaces only", async () => {
		const light = await logoPage("/src/tests/fixtures/logo-light-ink.svg", "dark", { theme: "light" });
		assert.ok(
			await waitFor(() => light.page.evaluate(() => document.querySelector(".wordmark--logo[data-ink]") !== null)),
		);
		for (const w of await inkOf(light.page)) {
			assert.equal(w.ink, "light");
			assert.match(w.filter, /url\(/);
		}
		// The pixels: the white strokes now show dark on the light header
		const logo = light.page.locator("#site-header .wordmark__image").first();
		const shot = await logo.screenshot();
		const dark = await light.page.evaluate(async b64 => {
			const img = new Image();
			img.src = "data:image/png;base64," + b64;
			await img.decode();
			const c = document.createElement("canvas");
			c.width = img.width;
			c.height = img.height;
			const x = c.getContext("2d");
			x.drawImage(img, 0, 0);
			const d = x.getImageData(Math.round(img.width * 0.66), 0, Math.round(img.width * 0.34), img.height).data;
			let n = 0;
			for (let i = 0; i < d.length; i += 4) if (d[i] < 80 && d[i + 1] < 80 && d[i + 2] < 80) n++;
			return n;
		}, shot.toString("base64"));
		assert.ok(dark > 20, `dark ink pixels where the white strokes are (${dark})`);
		await light.dispose();

		const dark_ = await logoPage("/src/tests/fixtures/logo-light-ink.svg", "light", { theme: "dark" });
		await sleep(300);
		for (const w of await inkOf(dark_.page)) assert.equal(w.filter, "none", "untouched in dark mode");
		await dark_.dispose();
	});

	it("a logo whose white sits inside a coloured shape is left alone", async () => {
		const { page, dispose } = await logoPage("/src/tests/fixtures/logo-badge.svg", "light");
		await sleep(400);
		for (const w of await inkOf(page)) {
			assert.notEqual(w.ink, "light");
			assert.equal(w.filter, "none");
		}
		await dispose();
	});

	it("the hero keeps a white-ink logo as it is (on the image)", async () => {
		const { page, dispose } = await open({
			render: home({ custom: {}, site: { settings: { logo: "/src/tests/fixtures/logo-light-ink.svg" } } }),
			viewport: DESKTOP,
		});
		await sleep(400);
		const filter = await page.evaluate(
			() => getComputedStyle(document.querySelector("#hero-wordmark .wordmark__image")).filter,
		);
		assert.equal(filter, "none");
		await dispose();
	});
});
