// « Tags » page: the bento grid, its arrangement (src/js/tags/layout.js), « Mélanger » and the previews.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { launch, close, open, waitFor, sleep, REPO_ROOT } from "./support/harness.js";
import { template } from "./support/pages.js";
import { layout, COLUMNS } from "../js/tags/layout.js";
import { tagsPrepaint } from "../../vite.config.mjs";

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };

// --- The pure layout ----------------------------------------------------------------------------

// Tags like a real site's: a few with many posts, a long tail; about a third with a picture
const sampleTags = (n, salt = 0) =>
	Array.from({ length: n }, (_, i) => ({
		posts: Math.max(1, Math.round(40 / (1 + i * 0.4))),
		image: (i * 7 + salt) % 3 === 0,
	}));

// CSS grid's sparse auto-placement (css-grid-1 §8.5, both axes auto) of spans in DOM order, written
// independently of the layout: the cursor never goes back
const autoPlace = (spans, columns) => {
	const taken = new Set();
	const free = (x, y, w, h) => {
		for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (taken.has(`${i},${j}`)) return false;
		return true;
	};
	let cx = 0;
	let cy = 0;
	return spans.map(({ w, h }) => {
		for (;;) {
			if (cx + w > columns) {
				cx = 0;
				cy++;
				continue;
			}
			if (free(cx, cy, w, h)) break;
			cx++;
		}
		for (let j = cy; j < cy + h; j++) for (let i = cx; i < cx + w; i++) taken.add(`${i},${j}`);
		return { x: cx, y: cy };
	});
};

describe("tags layout (pure)", () => {
	it("tiles a full rectangle with no hole or overflow, 500 seeds × 3 widths × 1 to 200 tags", () => {
		let checked = 0;
		for (const n of [1, 5, 12, 32, 100, 200]) {
			for (const columns of COLUMNS) {
				for (let seed = 0; seed < 500; seed++) {
					const tags = sampleTags(n, seed);
					const { order, cells } = layout(seed, tags, columns);
					const where = `${n} tags, ${columns} columns, seed ${seed}`;
					assert.equal(cells.length, n, where);
					assert.deepEqual(
						[...order].sort((a, b) => a - b),
						[...tags.keys()],
						`order is a permutation (${where})`,
					);
					assert.deepEqual(
						cells.map(c => c.index),
						order,
						where,
					);
					const rows = Math.max(...cells.map(c => c.y + c.h));
					const grid = Array.from({ length: rows }, () => Array(columns).fill(0));
					for (const c of cells) {
						assert.ok(c.x >= 0 && c.x + c.w <= columns && c.w >= 1 && c.h >= 1 && c.h <= 2, `inside (${where})`);
						for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) grid[y][x]++;
					}
					assert.ok(
						grid.every(row => row.every(v => v === 1)),
						`no hole, no overlap (${where})`,
					);
					// The browser's auto-placement of the spans in this order lands on the same cells: visual order =
					// DOM order
					const placed = autoPlace(cells, columns);
					assert.deepEqual(
						placed,
						cells.map(({ x, y }) => ({ x, y })),
						`auto-placement (${where})`,
					);
					checked++;
				}
			}
		}
		assert.equal(checked, 9000);
	});

	it("keeps one order for every width, and the same seed gives the same arrangement", () => {
		const tags = sampleTags(32);
		for (let seed = 1; seed < 50; seed++) {
			const orders = COLUMNS.map(columns => layout(seed, tags, columns).order);
			assert.deepEqual(orders[0], orders[1]);
			assert.deepEqual(orders[0], orders[2]);
			assert.deepEqual(layout(seed, tags, 6), layout(seed, tags, 6));
		}
	});

	it("changes with the seed: order and large cells", () => {
		const tags = sampleTags(32);
		const signatures = new Set();
		for (let seed = 1; seed <= 200; seed++) {
			signatures.add(JSON.stringify(layout(seed, tags, 6).cells.map(c => [c.index, c.w, c.h])));
		}
		assert.equal(signatures.size, 200);
	});

	it("seed 0 is the default: the server's order, the largest cells for the most posts", () => {
		const tags = sampleTags(32).map(t => ({ ...t, image: true }));
		const { order, cells } = layout(0, tags, 6);
		assert.deepEqual(order, [...tags.keys()]);
		assert.deepEqual([cells[0].w, cells[0].h], [2, 2]);
	});

	it("gives large cells preferably to tags with a picture and many posts", () => {
		const tags = sampleTags(32);
		let withImage = 0;
		let without = 0;
		const big = { image: 0, none: 0 };
		for (let seed = 1; seed <= 300; seed++) {
			for (const c of layout(seed, tags, 6).cells) {
				if (c.w * c.h === 4) big[tags[c.index].image ? "image" : "none"]++;
			}
		}
		for (const t of tags) {
			if (t.image) withImage++;
			else without++;
		}
		const rate = { image: big.image / withImage, none: big.none / without };
		assert.ok(rate.image > rate.none * 3, `2×2 per tag with a picture ${rate.image}, without ${rate.none}`);
		// The first tag (most posts) is large more often than the last one
		const large = index =>
			Array.from({ length: 300 }, (_, s) => layout(s + 1, tags, 6).cells.find(c => c.index === index)).filter(
				c => c.w * c.h > 1,
			).length;
		assert.ok(large(0) > large(30));
	});

	it("the inline pre-paint script is the build of src/js/tags/layout.js", () => {
		const partial = fs.readFileSync(path.join(REPO_ROOT, "partials/tags/prepaint.hbs"), "utf8");
		assert.equal(partial, tagsPrepaint(), "run npm run build");
		assert.ok(partial.length < 5000, `${partial.length} bytes`);
	});
});

// --- The page -----------------------------------------------------------------------------------

const NAMES = [
	"Actualité",
	"Jeux vidéo",
	"Culture geek",
	"VF",
	"Anime",
	"Dossier",
	"Informatique",
	"IA",
	"Test",
	"Programmation",
	"Doublage",
	"Esport",
	"Présentation",
	"Simuldub",
	"Mods",
	"Tuto",
	"Extension",
	"Twitch",
	"Design",
	"Internet",
	"Réseaux sociaux",
	"Top",
	"UI",
	"Nuxt",
	"Vue",
	"Coup de gueule",
	"Science fiction",
	"Preview",
	"Mise à jour",
	"Évènement",
	"Réalité mixte",
	"Star Wars",
];

// The « Tags » page with n public tags (n > 32: generated names), counts decreasing, every third with a
// picture; the sample posts carry them so that the previews have titles
const tagsPage = (n = 32, options = {}) => {
	const render = template("page-tags", options);
	const site = render.site;
	const tags = Array.from({ length: n }, (_, i) => {
		const name = NAMES[i] || `Tag ${i + 1}`;
		const slug = `t-${i + 1}`;
		return {
			id: `tag-${slug}`,
			name,
			slug,
			url: `/tag/${slug}/`,
			visibility: "public",
			description: i === 1 ? "Tests, tops et coups de gueule." : null,
			feature_image: i % 3 === 0 ? `/src/tests/fixtures/photo.svg?${slug}` : null,
			count: { posts: Math.max(1, Math.round(40 / (1 + i * 0.4))) },
		};
	});
	site.posts.forEach((post, p) => {
		post.tags = [tags[p % Math.min(n, 6)], tags[(p * 7) % n]].filter((t, k, a) => a.indexOf(t) === k);
		post.primary_tag = post.tags[0];
	});
	site.tags = [
		...tags,
		{ id: "tag-#top", name: "#top", slug: "hash-top", visibility: "internal", count: { posts: 3 } },
	];
	return render;
};

// Cells in DOM order with their box
const cellBoxes = page =>
	page.evaluate(() =>
		[...document.querySelectorAll(".tag-bento > .tag-cell")].map(cell => {
			const box = cell.getBoundingClientRect();
			return {
				slug: cell.dataset.tag,
				x: Math.round(box.left),
				y: Math.round(box.top + scrollY),
				w: Math.round(box.width),
				h: Math.round(box.height),
			};
		}),
	);

const signature = async page => (await cellBoxes(page)).map(c => `${c.slug}:${c.w}x${c.h}`).join(" ");

// The cells cover the grid's box exactly (areas add up, no overlap), and in DOM order their top-left
// corners come row by row
const assertTiled = async (page, where) => {
	const view = await page.evaluate(() => {
		const grid = document.querySelector(".tag-bento").getBoundingClientRect();
		const style = getComputedStyle(document.querySelector(".tag-bento"));
		return { width: grid.width, height: grid.height, gap: parseFloat(style.columnGap) };
	});
	const cells = await cellBoxes(page);
	for (let i = 0; i < cells.length; i++) {
		for (let j = i + 1; j < cells.length; j++) {
			const [a, b] = [cells[i], cells[j]];
			const overlap = a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
			assert.ok(!overlap, `${where}: ${a.slug} overlaps ${b.slug}`);
		}
	}
	// Area with the gaps: each cell grows by one gap to the right and below; the grid too
	const area = cells.reduce((sum, c) => sum + (c.w + view.gap) * (c.h + view.gap), 0);
	const full = (view.width + view.gap) * (view.height + view.gap);
	assert.ok(Math.abs(area - full) / full < 0.01, `${where}: holes (${area} of ${full})`);
	for (let i = 1; i < cells.length; i++) {
		const [a, b] = [cells[i - 1], cells[i]];
		assert.ok(b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && b.x > a.x), `${where}: ${b.slug} comes before ${a.slug}`);
	}
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
	assert.equal(overflow, 0, `${where}: sideways scroll`);
};

describe("tags page: grid and arrangement", () => {
	before(launch);
	after(close);

	it("lists every public tag with posts, with its count, and the number of tags in the heading", async () => {
		const { page, dispose } = await open({ render: tagsPage(32) });
		const view = await page.evaluate(() => ({
			cells: document.querySelectorAll(".tag-bento > .tag-cell").length,
			count: document.querySelector("[data-tags-count]").textContent,
			internal: document.body.textContent.includes("#top"),
			counts: [...document.querySelectorAll(".tag-cell__count")].every(c => /post/.test(c.textContent)),
			shuffle: !document.querySelector("[data-tags-shuffle]").hidden,
			arranged: document.querySelector(".tag-bento").hasAttribute("data-arranged"),
			hidden: document.documentElement.hasAttribute("data-tags-arranging"),
		}));
		assert.equal(view.cells, 32);
		assert.equal(view.count, "32 tags");
		assert.ok(!view.internal, "no internal tag");
		assert.ok(view.counts);
		assert.ok(view.shuffle && view.arranged && !view.hidden);
		await dispose();
	});

	it("is gap-free and in visual order at 390, 768 and 1440 px, for several visits", async () => {
		for (const viewport of [PHONE, TABLET, DESKTOP]) {
			for (let visit = 0; visit < 3; visit++) {
				const { page, dispose } = await open({ render: tagsPage(32), viewport });
				await assertTiled(page, `${viewport.width}px, visit ${visit}`);
				await dispose();
			}
		}
	});

	it("holds 200 tags (two queries of 100), gap-free", async () => {
		const { page, dispose } = await open({ render: tagsPage(200), viewport: DESKTOP });
		assert.equal(await page.locator(".tag-bento > .tag-cell").count(), 200);
		await assertTiled(page, "200 tags");
		await dispose();
	});

	it("draws a new arrangement on each visit and on reload, the same one when coming back", async () => {
		const pages = { "/elsewhere/": { template: "error-404" } };
		const { page, dispose } = await open({ render: tagsPage(32), pages });
		const first = await signature(page);
		const seed = await page.evaluate(() => history.state.attiblingTagsSeed);
		assert.equal(typeof seed, "number");
		await page.goto("http://theme.test/elsewhere/");
		await page.goBack();
		await page.waitForSelector(".tag-bento[data-arranged]");
		assert.equal(await signature(page), first, "back: same arrangement");
		await page.reload();
		await page.waitForSelector(".tag-bento[data-arranged]");
		assert.notEqual(await signature(page), first, "reload: a new one");
		await dispose();

		const other = await open({ render: tagsPage(32) });
		assert.notEqual(await signature(other.page), first, "another visit: a new one");
		await other.dispose();
	});

	it("shows nothing before it is arranged and shifts no layout afterwards (CLS 0)", async () => {
		const { page, dispose } = await open({
			render: tagsPage(32),
			initScript: () => {
				// Shifts of anything in the page's <main> (the header's wordmark may move when its font arrives)
				window.__shifts = [];
				new PerformanceObserver(list => {
					for (const entry of list.getEntries()) {
						const inMain = entry.sources.some(s => (s.node?.parentElement || s.node)?.closest?.("main"));
						if (inMain)
							window.__shifts.push(
								entry.sources.map(s => [
									(s.node?.parentElement || s.node)?.className,
									JSON.stringify(s.previousRect),
									JSON.stringify(s.currentRect),
								]),
							);
					}
				}).observe({ type: "layout-shift", buffered: true });
			},
		});
		await sleep(600);
		await page.locator("[data-tags-shuffle]").focus();
		const shifts = await page.evaluate(() => window.__shifts);
		assert.deepEqual(shifts, []);
		await dispose();
	});

	it("without JavaScript: the server's order (most posts first), the first cells large, nothing hidden", async () => {
		const { page, dispose } = await open({ render: tagsPage(32), javaScriptEnabled: false });
		const view = await page.evaluate(() => ({
			order: [...document.querySelectorAll(".tag-cell")].slice(0, 4).map(c => c.dataset.tag),
			first: document.querySelector(".tag-cell").className,
			visibility: getComputedStyle(document.querySelector(".tag-bento")).visibility,
			shuffle: document.querySelector("[data-tags-shuffle]").hidden,
			details: document.querySelector("[data-tag-details]").hidden,
		}));
		assert.deepEqual(view.order, ["t-1", "t-2", "t-3", "t-4"]);
		assert.match(view.first, /tag-cell--feature/);
		assert.equal(view.visibility, "visible");
		assert.ok(view.shuffle && view.details, "no control that needs JavaScript");
		await dispose();
	});

	it("« Mélanger »: a new arrangement, kept for the way back, announced; the focus stays", async () => {
		const { page, dispose } = await open({ render: tagsPage(32) });
		const before = await signature(page);
		const seed = await page.evaluate(() => history.state.attiblingTagsSeed);
		await page.locator("[data-tags-shuffle]").focus();
		await page.keyboard.press("Enter");
		await sleep(700);
		const view = await page.evaluate(() => ({
			seed: history.state.attiblingTagsSeed,
			status: document.querySelector("[data-tags-status]").textContent.trim(),
			focus: document.activeElement.matches("[data-tags-shuffle]"),
			live: document.querySelector("[data-tags-status]").getAttribute("aria-live"),
		}));
		assert.notEqual(await signature(page), before);
		assert.notEqual(view.seed, seed);
		assert.equal(view.status, "Tags shuffled");
		assert.equal(view.live, "polite");
		assert.ok(view.focus);
		await assertTiled(page, "after « Mélanger »");
		await dispose();
	});

	it("shows an empty state without tags", async () => {
		const render = template("page-tags");
		render.site.tags = [];
		const { page, dispose } = await open({ render });
		assert.ok(await page.locator(".tags-empty").isVisible());
		assert.equal(await page.locator(".tags-empty a").getAttribute("href"), "http://theme.test/archives/");
		await dispose();
	});
});

// --- Previews -----------------------------------------------------------------------------------

const previewState = page =>
	page.evaluate(() => {
		const panel = document.querySelector(".tag-preview");
		const open = Boolean(panel?.matches(":popover-open"));
		if (!open) return { open };
		const box = panel.getBoundingClientRect();
		return {
			open,
			tag: panel.closest(".tag-cell")?.dataset.tag,
			name: panel.querySelector(".tag-preview__name").textContent,
			posts: [...panel.querySelectorAll(".tag-preview__post-title")].map(t => t.textContent),
			more: panel.querySelector(".tag-preview__more").getAttribute("href"),
			box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
			viewport: { width: document.documentElement.clientWidth, height: innerHeight },
			focusInside: panel.contains(document.activeElement),
		};
	});

const cell = (page, n) => page.locator(".tag-bento > .tag-cell").nth(n);

describe("tags page: previews", () => {
	before(launch);
	after(close);

	it("opens after a rest of the pointer, with the tag's latest posts, and closes when it leaves", async () => {
		const render = tagsPage(32);
		const { page, dispose } = await open({ render, viewport: DESKTOP });
		const target = cell(page, 4);
		const slug = await target.getAttribute("data-tag");
		await target.hover();
		await sleep(300);
		assert.equal((await previewState(page)).open, false, "not yet at 300 ms");
		await sleep(500);
		const state = await previewState(page);
		assert.ok(state.open, "open after 800 ms");
		assert.equal(state.tag, slug);
		const expected = render.site.posts
			.filter(p => p.tags.some(t => t.slug === slug))
			.sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
			.slice(0, 3)
			.map(p => p.title);
		assert.deepEqual(state.posts, expected);
		assert.equal(state.more, `/tag/${slug}/`);
		assert.ok(!state.focusInside, "hover does not move the focus");
		// Moving inside the card does not close it
		const box = await page.locator(".tag-preview").boundingBox();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20, { steps: 4 });
		await sleep(400);
		assert.ok((await previewState(page)).open, "still open over the card");
		await page.mouse.move(5, 5);
		await sleep(400);
		assert.equal((await previewState(page)).open, false, "closed after leaving");
		await dispose();
	});

	it("does not open when the pointer only passes, closes on Escape and on scroll", async () => {
		const { page, dispose } = await open({ render: tagsPage(32), viewport: DESKTOP });
		await cell(page, 2).hover();
		await sleep(300);
		await page.mouse.move(5, 5);
		await sleep(700);
		assert.equal((await previewState(page)).open, false, "passing by");
		await cell(page, 2).hover();
		await waitFor(async () => (await previewState(page)).open);
		await page.keyboard.press("Escape");
		await waitFor(async () => !(await previewState(page)).open);
		assert.equal((await previewState(page)).open, false, "Escape");
		await page.mouse.move(5, 5);
		await cell(page, 3).hover();
		await waitFor(async () => (await previewState(page)).open);
		await page.mouse.wheel(0, 300);
		await waitFor(async () => !(await previewState(page)).open);
		assert.equal((await previewState(page)).open, false, "scroll");
		await dispose();
	});

	it("stays inside the viewport for cells at either edge and does not move the grid", async () => {
		for (const viewport of [DESKTOP, PHONE]) {
			const { page, dispose } = await open({ render: tagsPage(32), viewport });
			const before = await cellBoxes(page);
			const cells = await page.evaluate(() => {
				const all = [...document.querySelectorAll(".tag-bento > .tag-cell")];
				const left = Math.min(...all.map(c => c.getBoundingClientRect().left));
				const right = Math.max(...all.map(c => c.getBoundingClientRect().right));
				return [
					all.findIndex(c => c.getBoundingClientRect().left === left),
					all.findIndex(c => Math.abs(c.getBoundingClientRect().right - right) < 1),
					all.length - 1,
				];
			});
			for (const n of cells) {
				await cell(page, n).scrollIntoViewIfNeeded();
				// (a click on its position could land on the sticky header)
				await cell(page, n)
					.locator("[data-tag-details]")
					.evaluate(button => button.click());
				await sleep(350);
				const state = await previewState(page);
				assert.ok(state.open, `${viewport.width}px cell ${n}`);
				assert.ok(state.box.left >= 0 && state.box.right <= state.viewport.width, `${viewport.width}px cell ${n} x`);
				assert.ok(state.box.top >= 0 && state.box.bottom <= state.viewport.height, `${viewport.width}px cell ${n} y`);
				assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
				await page.keyboard.press("Escape");
			}
			assert.deepEqual(await cellBoxes(page), before, "no layout shift");
			await dispose();
		}
	});

	it("keyboard: Enter on « Détails » opens it with the focus inside, links in order, Escape comes back", async () => {
		const { page, dispose } = await open({ render: tagsPage(32), viewport: DESKTOP });
		const tagged = page.locator('.tag-cell[data-tag="t-2"]');
		const link = tagged.locator(".tag-cell__link");
		await link.focus();
		await page.keyboard.press("Tab");
		assert.ok(await page.evaluate(() => document.activeElement.matches("[data-tag-details]")), "Tab: « Détails »");
		assert.equal(await page.locator(":focus").getAttribute("aria-expanded"), "false");
		await page.keyboard.press("Enter");
		const state = await previewState(page);
		assert.ok(state.open && state.focusInside);
		assert.equal(await tagged.locator("[data-tag-details]").getAttribute("aria-expanded"), "true");
		const order = [];
		for (let i = 0; i < state.posts.length + 2; i++) {
			await page.keyboard.press("Tab");
			order.push(
				await page.evaluate(() => document.activeElement.className.split(" ").find(c => c.startsWith("tag-preview__"))),
			);
		}
		assert.ok(state.posts.length > 0);
		assert.deepEqual(order, [...state.posts.map(() => "tag-preview__post"), "tag-preview__more", "tag-preview__close"]);
		await page.keyboard.press("Escape");
		await waitFor(async () => !(await previewState(page)).open);
		assert.equal((await previewState(page)).open, false);
		assert.ok(await page.evaluate(() => document.activeElement.matches("[data-tag-details]")), "focus back");
		await dispose();
	});

	it("keyboard: focus leaving the card closes it; Enter on the cell follows its link", async () => {
		const pages = { "*": { template: "error-404" } };
		const { page, dispose } = await open({ render: tagsPage(32), viewport: DESKTOP, pages });
		await cell(page, 0).locator("[data-tag-details]").focus();
		await page.keyboard.press("Enter");
		assert.ok((await previewState(page)).open);
		for (
			let i = 0;
			i < 8 && (await page.evaluate(() => Boolean(document.activeElement.closest(".tag-preview"))));
			i++
		) {
			await page.keyboard.press("Tab");
		}
		await sleep(300);
		assert.equal((await previewState(page)).open, false);
		const href = await cell(page, 2).locator(".tag-cell__link").getAttribute("href");
		await cell(page, 2).locator(".tag-cell__link").focus();
		await Promise.all([page.waitForURL(`**${href}`), page.keyboard.press("Enter")]);
		await dispose();
	});

	it("touch: « Détails » is always shown and opens the card; a tap on the cell follows its link", async () => {
		const pages = { "*": { template: "error-404" } };
		const { page, dispose } = await open({
			render: tagsPage(32),
			viewport: PHONE,
			hasTouch: true,
			isMobile: true,
			pages,
		});
		const button = cell(page, 1).locator("[data-tag-details]");
		assert.equal(await button.evaluate(b => getComputedStyle(b).opacity), "1");
		const box = await button.boundingBox();
		assert.ok(box.width >= 44 && box.height >= 44, "44 px target");
		await button.tap();
		await sleep(400);
		const state = await previewState(page);
		assert.ok(state.open);
		assert.ok(state.box.left >= 0 && state.box.right <= 390);
		await page.locator(".tag-preview__close").tap();
		await sleep(300);
		assert.equal((await previewState(page)).open, false);
		const href = await cell(page, 3).locator(".tag-cell__link").getAttribute("href");
		await Promise.all([page.waitForURL(`**${href}`), cell(page, 3).locator(".tag-cell__name").tap()]);
		await dispose();
	});

	it("reduced motion: the card fades in, without growing", async () => {
		const { page, dispose } = await open({ render: tagsPage(32), reducedMotion: "reduce" });
		await cell(page, 1).locator("[data-tag-details]").click({ force: true });
		const frames = await page.evaluate(() =>
			document
				.querySelector(".tag-preview")
				.getAnimations()
				.flatMap(a => a.effect.getKeyframes()),
		);
		assert.ok(frames.length > 0);
		assert.ok(
			frames.every(f => !f.transform || f.transform === "none"),
			JSON.stringify(frames),
		);
		assert.ok(frames.some(f => f.opacity !== undefined));
		await dispose();
	});

	it("without the motion preference, it grows from the cell", async () => {
		const { page, dispose } = await open({ render: tagsPage(32) });
		await cell(page, 1).locator("[data-tag-details]").click({ force: true });
		const transforms = await page.evaluate(() =>
			document
				.querySelector(".tag-preview")
				.getAnimations()
				.flatMap(a => a.effect.getKeyframes().map(f => f.transform))
				.filter(Boolean),
		);
		assert.match(transforms[0], /scale\(/);
		await dispose();
	});
});
