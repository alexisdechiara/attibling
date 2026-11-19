// « À propos » (bento) and the single-author rule: when only one author has published posts, the theme
// never links to an author page (article header, author box, « À propos », and nowhere else), and the
// author page asks not to be indexed. Multi-author sites keep their links.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { home, template } from "./support/pages.js";
import { article } from "./support/article.js";

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 768, height: 1024 };

const authorLinks = page =>
	page.$$eval('a[href*="/author/"]', links => links.map(a => `${a.className || a.parentElement.className}`));

// A site whose public tags are `n` generated rubrics (most posts first), listed by about_tags
const rubrics = (
	n,
	{ images = i => i % 2 === 0, descriptions = () => true, names = i => `Rubrique ${i + 1}` } = {},
) => {
	const tags = Array.from({ length: n }, (_, i) => ({
		id: `tag-r${i}`,
		name: names(i),
		slug: `rubrique-${i + 1}`,
		visibility: "public",
		url: `/tag/rubrique-${i + 1}/`,
		description: descriptions(i) ? `Ce que la rubrique ${i + 1} raconte, en une phrase.` : null,
		feature_image: images(i) ? `/src/tests/fixtures/photo.svg?r${i}` : null,
		count: { posts: 40 - i },
	}));
	return { tags, about_tags: tags.map(t => t.slug).join(",") };
};

const about = ({ n = 6, authors = 1, html, excerpt = "Mon blog personnel.", member = false, ...opts } = {}) => {
	const { tags, about_tags } = rubrics(n, opts);
	const render = template("page-a-propos", {
		member,
		site: { authors },
		custom: { use_geekly_logo: true, about_tags },
		post: { custom_excerpt: excerpt, html: html ?? "<p>Et comme c’est mon blog, j’y fais ce que je veux.</p>" },
	});
	render.site.tags = tags;
	return render;
};

// Every point of the bento's grids is in a cell or in a gap next to one: no hole in the mosaic
const holes = page =>
	page.evaluate(() => {
		const found = [];
		for (const grid of document.querySelectorAll(".about-rubrics, .about-bento__people")) {
			const box = grid.getBoundingClientRect();
			const gap = parseFloat(getComputedStyle(grid).columnGap) + 1;
			const cells = [...grid.children].map(c => c.getBoundingClientRect());
			for (let x = box.left + 4; x < box.right - 4; x += 24)
				for (let y = box.top + 4; y < box.bottom - 4; y += 24) {
					const near = cells.some(
						r => x >= r.left - gap && x <= r.right + gap && y >= r.top - gap && y <= r.bottom + gap,
					);
					if (!near) found.push(`${grid.className} ${Math.round(x - box.left)},${Math.round(y - box.top)}`);
				}
		}
		return found;
	});

const luminance = ([r, g, b]) => {
	const c = [r, g, b].map(v => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
	const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
	return (x + 0.05) / (y + 0.05);
};

describe("single-author rule", () => {
	before(launch);
	after(close);

	it("a single-author site never links to the author page", async () => {
		const renders = [
			["home", home()],
			["post", article()],
			["tag", template("tag")],
			["404", template("error-404")],
			["archives", template("page-archives")],
			["à propos", about()],
		];
		for (const [name, render] of renders) {
			const { page, dispose } = await open({ render });
			assert.deepEqual(await authorLinks(page), [], name);
			await dispose();
		}
	});

	it("the article header and the author box show the author as plain text", async () => {
		const { page, dispose } = await open({ render: article() });
		const view = await page.evaluate(() => ({
			byline: document.querySelector(".article-header__authors").textContent,
			avatar: document.querySelector(".article-header__avatar").tagName,
			box: document.querySelector(".author-box__name").textContent,
			boxLinks: [...document.querySelectorAll(".author-box__links a")].map(a => a.textContent),
		}));
		assert.equal(view.byline, "Alexis De Chiara");
		assert.equal(view.avatar, "SPAN");
		assert.equal(view.box, "Alexis De Chiara");
		assert.deepEqual(view.boxLinks, ["À propos"], "no « Tous ses articles »");
		await dispose();
	});

	it("a multi-author site keeps today's links", async () => {
		const { page, dispose } = await open({ render: article({ authors: 2 }) });
		const view = await page.evaluate(() => ({
			byline: document.querySelector(".article-header__authors a")?.getAttribute("href"),
			avatar: document.querySelector(".article-header__avatar").getAttribute("href"),
			box: document.querySelector(".author-box__name a")?.getAttribute("href"),
			boxLinks: [...document.querySelectorAll(".author-box__links a")].map(a => a.textContent),
		}));
		assert.equal(view.byline, "/author/alexis/");
		assert.equal(view.avatar, "/author/alexis/");
		assert.equal(view.box, "/author/alexis/");
		assert.deepEqual(view.boxLinks, ["À propos", "Tous ses articles"]);
		await dispose();

		const multi = await open({ render: about({ authors: 3 }) });
		assert.deepEqual(
			await multi.page.$$eval(".about-author__name a", links => links.map(a => a.getAttribute("href"))),
			["/author/alexis/", "/author/camille/", "/author/jean-baptiste/"],
		);
		await multi.dispose();
	});

	it("the author page asks not to be indexed on a single-author site only", async () => {
		const robots = async render => {
			const { page, dispose } = await open({ render });
			const value = await page.$$eval('meta[name="robots"]', m => m.map(e => e.content));
			await dispose();
			return value;
		};
		assert.deepEqual(await robots(template("author")), ["noindex, follow"]);
		assert.deepEqual(await robots(template("author", { site: { authors: 2 } })), []);
		assert.deepEqual(await robots(template("tag")), [], "other pages are not concerned");
	});
});

describe("« À propos » bento", () => {
	before(launch);
	after(close);

	it("opens with the title and the lead, then one cell per rubric with what Ghost gives", async () => {
		const { page, dispose } = await open({
			render: about({ n: 4, images: i => i === 0, descriptions: i => i !== 1 }),
		});
		const view = await page.evaluate(() => ({
			h1: document.querySelector("h1").textContent,
			lead: document.querySelector(".about__lead").textContent,
			cells: [...document.querySelectorAll(".about-rubric")].map(li => ({
				name: li.querySelector(".about-rubric__name").textContent,
				href: li.querySelector(".about-rubric__link").getAttribute("href"),
				image: Boolean(li.querySelector("img.about-rubric__image")),
				icon: Boolean(li.querySelector(".about-rubric__icon svg")),
				text: Boolean(li.querySelector(".about-rubric__text")),
				count: li.querySelector(".about-rubric__count").textContent,
			})),
			visibleHeadings: [...document.querySelectorAll("main h2")].filter(h => h.offsetWidth > 1).length,
		}));
		assert.equal(view.h1, "About");
		assert.equal(view.lead, "Mon blog personnel.");
		assert.deepEqual(
			view.cells.map(c => c.name),
			["Rubrique 1", "Rubrique 2", "Rubrique 3", "Rubrique 4"],
			"most posts first",
		);
		assert.equal(view.cells[0].href, "/tag/rubrique-1/");
		assert.deepEqual(
			view.cells.map(c => [c.image, c.text]),
			[
				[true, true],
				[false, false],
				[false, true],
				[false, true],
			],
		);
		assert.ok(view.cells.every(c => c.icon && /posts/.test(c.count)));
		assert.equal(view.visibleHeadings, 1, "only « Suivre le blog » shows a section heading");
		await dispose();
	});

	it("gives the largest cell to the first rubric and leaves no hole, for 1 to 12 rubrics", async () => {
		for (const viewport of [DESKTOP, TABLET]) {
			for (let n = 1; n <= 12; n++) {
				const { page, dispose } = await open({ render: about({ n }), viewport });
				const view = await page.evaluate(() => {
					const cells = [...document.querySelectorAll(".about-rubric")].map(c => c.getBoundingClientRect());
					return { areas: cells.map(r => r.width * r.height) };
				});
				assert.equal(view.areas.length, n);
				assert.ok(
					view.areas.every(a => a <= view.areas[0] + 1),
					`${viewport.width}px, ${n}: the first cell is the largest`,
				);
				assert.deepEqual(await holes(page), [], `${viewport.width}px, ${n} rubrics`);
				await dispose();
			}
			for (const authors of [2, 5]) {
				const { page, dispose } = await open({ render: about({ authors }), viewport });
				assert.deepEqual(await holes(page), [], `${viewport.width}px, ${authors} authors`);
				await dispose();
			}
		}
	});

	it("fills the author cell from the profile and the figures from the posts", async () => {
		const { page, dispose } = await open({ render: about() });
		const view = await page.evaluate(() => ({
			name: document.querySelector(".about-author__name").textContent,
			bio: document.querySelector(".about-author__bio")?.textContent,
			facts: document.querySelector(".about-facts").textContent.replace(/\s+/g, " ").trim(),
			follow: [...document.querySelectorAll(".about-follow a")].map(
				a => a.getAttribute("aria-label") || a.textContent.trim(),
			),
		}));
		assert.equal(view.name, "Alexis De Chiara");
		assert.match(view.bio, /Développeur front-end/);
		assert.match(view.facts, /^\d+ posts published since 20\d\d$/);
		assert.deepEqual(view.follow, ["X", "RSS feed", "Subscribe"]);
		await dispose();

		const render = about({ authors: 2 });
		render.site.authors = render.site.authors.map(a => ({ ...a, bio: null }));
		const bare = await open({ render });
		const many = await bare.page.evaluate(() => ({
			many: document.querySelector(".about-author").classList.contains("about-author--many"),
			bios: document.querySelectorAll(".about-author__bio").length,
			facts: [...document.querySelectorAll(".about-author__fact")].map(f => f.textContent.trim()),
		}));
		assert.ok(many.many);
		assert.equal(many.bios, 0, "no bio, no line");
		assert.deepEqual(many.facts, ["Lyon"], "location and website only when set");
		await bare.dispose();
	});

	it("moves the about-links card into « Suivre » and drops the text cell when nothing else was written", async () => {
		const links = '<ul class="about-links"><li><a href="https://example.com/portfolio">Portfolio</a></li></ul>';
		const { page, dispose } = await open({
			render: about({
				html: `<p>Et comme c’est mon blog…</p><!--kg-card-begin: html-->${links}<!--kg-card-end: html-->`,
			}),
		});
		const view = await page.evaluate(() => ({
			moved: [...document.querySelectorAll("[data-about-links] a")].map(a => a.textContent),
			note: document.querySelector("[data-about-note]")?.textContent.trim(),
		}));
		assert.deepEqual(view.moved, ["Portfolio"]);
		assert.equal(view.note, "Et comme c’est mon blog…");
		await dispose();

		const only = await open({ render: about({ html: links }) });
		assert.equal(await only.page.locator("[data-about-note]").count(), 0);
		assert.equal(await only.page.locator("[data-about-links] a").count(), 1);
		await only.dispose();
	});

	it("reads in DOM order on a phone, without overflow, even with long names and 12 rubrics", async () => {
		const { page, dispose } = await open({
			render: about({
				n: 12,
				authors: 3,
				names: i => (i === 0 ? "Intelligenceartificielleetautomatisationdesprocessus" : `Rubrique ${i + 1}`),
			}),
			viewport: PHONE,
		});
		const view = await page.evaluate(() => {
			const cells = [
				...document.querySelectorAll(".about-rubric, .about-note, .about-author, .about-facts, .about-follow"),
			];
			const tops = cells.map(c => c.getBoundingClientRect().top);
			return {
				ordered: tops.every((t, i) => i === 0 || t > tops[i - 1]),
				overflow: document.documentElement.scrollWidth - window.innerWidth,
				clipped: cells.filter(c => c.scrollWidth > c.clientWidth + 1).length,
			};
		});
		assert.ok(view.ordered, "one column, in DOM order");
		assert.equal(view.overflow, 0);
		assert.equal(view.clipped, 0);
		await dispose();
	});

	it("rubric cells are reachable by keyboard and ring the whole cell", async () => {
		const { page, dispose } = await open({ render: about() });
		await page.locator(".about-rubric__link").first().focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		const ring = await page.evaluate(() => {
			const cell = document.activeElement.closest(".about-rubric");
			const style = getComputedStyle(cell);
			return { inCell: Boolean(cell), style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
		});
		assert.ok(ring.inCell);
		assert.equal(ring.style, "solid");
		assert.ok(ring.width >= 2);
		await dispose();
	});

	it("lifts a rubric on hover, without moving under reduced motion", async () => {
		for (const [reducedMotion, lifted] of [
			["no-preference", true],
			["reduce", false],
		]) {
			const { page, dispose } = await open({ render: about(), reducedMotion });
			await page.locator(".about-rubric").nth(2).hover();
			await page.waitForTimeout(400);
			const transform = await page.$eval(".about-rubric:nth-child(3)", el => getComputedStyle(el).transform);
			assert.equal(transform !== "none", lifted, reducedMotion);
			await dispose();
		}
	});

	it("keeps AA contrast on image cells in dark mode, whatever the picture (scrim behind every line)", async () => {
		const { page, dispose } = await open({ render: about({ images: () => true }), colorScheme: "dark" });
		const view = await page.evaluate(() => {
			const probe = document.createElement("span");
			document.body.append(probe);
			probe.style.color = "var(--color-scrim)";
			const scrim = getComputedStyle(probe).color;
			probe.remove();
			return {
				scrim,
				cells: [...document.querySelectorAll(".about-rubric--image")].map(cell => {
					const body = cell.querySelector(".about-rubric__body");
					const fade = parseFloat(getComputedStyle(body).paddingTop) - 8;
					const top = body.getBoundingClientRect().top;
					return [...body.children].map(el => ({
						color: getComputedStyle(el).color,
						offset: el.getBoundingClientRect().top - top,
						fade,
					}));
				}),
			};
		});
		const [r, g, b, a] = view.scrim.match(/[\d.]+/g).map(Number);
		assert.ok(a >= 0.75, `scrim alpha ${a}`);
		// The scrim over a white picture (the worst case)
		const over = [r, g, b].map(c => c * a + 255 * (1 - a));
		for (const lines of view.cells)
			for (const line of lines) {
				assert.ok(line.offset >= line.fade - 1, "no text in the fade");
				const ink = line.color
					.match(/[\d.]+/g)
					.slice(0, 3)
					.map(Number);
				assert.ok(contrast(ink, over) >= 4.5, `${line.color} on ${over}: ${contrast(ink, over).toFixed(2)}`);
			}
		await dispose();
	});
});
