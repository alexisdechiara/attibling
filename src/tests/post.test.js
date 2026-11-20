import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { article, LONG_HTML, SUMMARY_CARD, REVIEW_CARD } from "./support/article.js";

// Content with the cases the scripts treat differently
const MEDIA_HTML = `
<p>Intro.</p>
<figure class="kg-card kg-image-card"><img class="plain-image" src="/src/tests/fixtures/pixel.svg" alt="plain" width="400" height="300"></figure>
<p><a href="/somewhere/"><img class="linked-image" src="/src/tests/fixtures/pixel.svg" alt="linked"></a></p>
<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="/elsewhere/"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-metadata"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Site</span></div></div><div class="kg-bookmark-thumbnail"><img src="/src/tests/fixtures/pixel.svg" alt="bookmark"></div></a></figure>
<figure class="kg-card kg-embed-card"><iframe class="embed-4-3" width="640" height="480" src="about:blank"></iframe></figure>
<iframe class="bare-16-9" width="1600" height="900" src="about:blank"></iframe>
${LONG_HTML}`;

// Clipboard stand-ins (an init script cannot use variables of the test: two functions)
const mockClipboard = () => {
	window.__copied = [];
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText: async text => void window.__copied.push(text) },
	});
};
const refuseClipboard = () => {
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText: async () => Promise.reject(new Error("denied")) },
	});
};

describe("article page: content", () => {
	before(launch);
	after(close);

	it("makes content images zoomable, except linked images and cards", async () => {
		const { page, dispose } = await open({ render: article({ html: MEDIA_HTML }) });
		const zoomable = await page.$$eval("[data-article-content] img:is([alt=plain],[alt=linked],[alt=bookmark])", imgs =>
			Object.fromEntries(imgs.map(img => [img.alt, img.classList.contains("js-zoomable")])),
		);
		assert.deepEqual(zoomable, { plain: true, linked: false, bookmark: false });
		await page.locator("img.plain-image").click();
		assert.equal(await waitFor(() => page.locator(".medium-zoom-image--opened").first().isVisible()), true);
		await dispose();
	});

	it("fits video embeds to the column at their own ratio", async () => {
		for (const width of [390, 1440]) {
			const { page, dispose } = await open({ render: article({ html: MEDIA_HTML }), viewport: { width, height: 800 } });
			const boxes = await page.evaluate(() => {
				const column = document.querySelector("[data-article-content] > p").getBoundingClientRect();
				return Object.fromEntries(
					[...document.querySelectorAll("[data-article-content] iframe")].map(frame => {
						const box = frame.getBoundingClientRect();
						return [frame.className, { ratio: box.width / box.height, width: box.width, column: column.width }];
					}),
				);
			});
			for (const [name, ratio] of [
				["embed-4-3", 4 / 3],
				["bare-16-9", 16 / 9],
			]) {
				assert.ok(Math.abs(boxes[name].ratio - ratio) < 0.02, `${name} ratio ${boxes[name].ratio} at ${width}px`);
				assert.ok(Math.abs(boxes[name].width - boxes[name].column) < 2, `${name} fills the column at ${width}px`);
			}
			await dispose();
		}
	});

	// About 0.52em per character in Literata at 19px: 60 to 72 characters per line is 31 to 38 em.
	// (The tests do not load web fonts: the measure is checked in ems of the text size.)
	it("keeps the text at 60 to 72 characters per line by default, justified on desktop and aligned left on phones", async () => {
		const measure = async width => {
			const { page, dispose } = await open({ render: article(), viewport: { width, height: 900 } });
			const result = await page.evaluate(() => {
				const p = document.querySelector("[data-article-content] > p");
				const style = getComputedStyle(p);
				return {
					ems: p.getBoundingClientRect().width / parseFloat(style.fontSize),
					size: style.fontSize,
					align: style.textAlign,
					family: style.fontFamily,
				};
			});
			await dispose();
			return result;
		};
		const desktop = await measure(1440);
		assert.ok(desktop.ems >= 31 && desktop.ems <= 38, `${desktop.ems} em`);
		assert.equal(desktop.size, "19px");
		assert.equal(desktop.align, "justify");
		assert.match(desktop.family, /^Literata/);
		assert.equal((await measure(390)).align, "start");
	});

	it("builds the table of contents from the h2 and h3: in the margin on wide screens, a button on phones", async () => {
		const { page, dispose } = await open({ render: article(), viewport: { width: 1440, height: 900 } });
		const links = await page.$$eval("[data-toc-list] a", nodes =>
			nodes.map(a => [a.getAttribute("href"), a.textContent]),
		);
		assert.deepEqual(links, [
			["#premiere-partie", "Première partie"],
			["#un-detail", "Un détail"],
			["#deuxieme-partie", "Deuxième partie"],
			["#conclusion", "Conclusion"],
		]);
		const wide = await page.evaluate(() => {
			const toc = document.querySelector("[data-toc]");
			const nav = toc.querySelector(".article-toc__nav");
			const text = document.querySelector("[data-article-content] > p").getBoundingClientRect();
			return {
				open: toc.open,
				// The disclosure sticks (a sticky list inside it would scroll away with it)
				sticky: getComputedStyle(toc).position,
				right: nav.getBoundingClientRect().left >= text.right,
			};
		});
		assert.deepEqual(wide, { open: true, sticky: "sticky", right: true });
		await page.setViewportSize({ width: 390, height: 800 });
		await page.waitForTimeout(100);
		assert.equal(await page.evaluate(() => document.querySelector("[data-toc]").open), false, "closed on phones");
		await page.locator(".article-toc__toggle").click();
		assert.equal(await page.locator("[data-toc-list] a").first().isVisible(), true);
		await dispose();
	});

	it("has no table of contents with fewer than two headings", async () => {
		const { page, dispose } = await open({
			render: article({ html: "<p>Court.</p><h2 id='seul'>Seul</h2><p>Fin.</p>" }),
		});
		assert.equal(await page.locator("[data-toc]").isVisible(), false);
		await dispose();
	});

	it("scrolls back to the top, instantly when reduced motion is preferred", async () => {
		for (const reducedMotion of ["no-preference", "reduce"]) {
			const { page, dispose } = await open({ render: article(), reducedMotion });
			await page.evaluate(() => window.scrollTo(0, 2000));
			await waitFor(() => page.evaluate(() => window.scrollY > 1500));
			await page.locator("[data-progress-button]").click();
			if (reducedMotion === "reduce") await page.waitForTimeout(50);
			assert.equal(await waitFor(() => page.evaluate(() => window.scrollY === 0)), true, reducedMotion);
			await dispose();
		}
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
	const ringProgress = async page => {
		await page.waitForTimeout(400);
		const end = await page.evaluate(() => {
			const box = document.querySelector("[data-article-content]").getBoundingClientRect();
			return box.bottom + window.scrollY - window.innerHeight;
		});
		return [await ringAt(page, 0), await ringAt(page, end / 2), await ringAt(page, end), await ringAt(page, 0)];
	};

	it("fills the reading progress ring as the post is read (CSS, and script where scroll-driven animations are missing)", async () => {
		const noTimeline = () => {
			const supports = CSS.supports.bind(CSS);
			CSS.supports = (...args) => !/timeline/.test(args.join(":")) && supports(...args);
			document.addEventListener("DOMContentLoaded", () => {
				const style = document.createElement("style");
				style.textContent = "* { animation-timeline: auto !important; animation: none !important; }";
				document.head.append(style);
			});
		};
		for (const initScript of [null, noTimeline]) {
			const { page, dispose } = await open({ render: article(), initScript });
			const [top, middle, end, back] = await ringProgress(page);
			assert.ok(top < 0.25, `ring at ${top} at the top`);
			assert.ok(middle > 0.35 && middle < 0.65, `ring at ${middle} half way`);
			assert.equal(end, 1, "full at the end of the post");
			assert.equal(back, top, "empties again when scrolling back up");
			await dispose();
		}
	});

	it("reloads native comments added after load when the theme changes", async () => {
		const { page, requests, dispose } = await open({ render: article() });
		const commentLoads = () => requests.filter(url => url.endsWith("/fixtures/comments.html")).length;
		await page.evaluate(() => {
			const section = document.createElement("div");
			section.className = "js-native-comments";
			const holder = document.createElement("div");
			const iframe = document.createElement("iframe");
			iframe.src = "/src/tests/fixtures/comments.html";
			holder.appendChild(iframe);
			section.appendChild(holder);
			document.querySelector("[data-article]").appendChild(section);
		});
		assert.equal(await waitFor(() => commentLoads() === 1), true);
		await page.locator(".site-header .js-switch-theme").dispatchEvent("click");
		assert.equal(await waitFor(() => commentLoads() === 2), true, "comments iframe reloaded");
		await dispose();
	});

	it("never scrolls sideways on a phone, with every block of the article", async () => {
		const html = SUMMARY_CARD + MEDIA_HTML + "<table><tr><td>" + "x".repeat(300) + "</td></tr></table>" + REVIEW_CARD;
		const { page, dispose } = await open({
			render: article({
				member: true,
				html,
				internal: ["#mis-a-jour"],
				series: { published: 12, current: 6, description: "Une longue série · total: 24" },
			}),
			viewport: { width: 390, height: 844 },
			hasTouch: true,
		});
		await page.waitForTimeout(200);
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
		await dispose();
	});
});

describe("article page: copy buttons", () => {
	before(launch);
	after(close);

	it("copies the link of a section from its heading, shows « Lien copié » for 2 seconds and announces it", async () => {
		const { page, dispose } = await open({ render: article(), initScript: mockClipboard });
		const heading = page.locator("#deuxieme-partie");
		await heading.hover();
		const button = heading.locator(".heading-link");
		assert.equal(await button.getAttribute("aria-label"), "Copier le lien vers la section « Deuxième partie »");
		assert.equal(
			await waitFor(() => button.evaluate(el => getComputedStyle(el).opacity === "1")),
			true,
			"shown on hover",
		);
		await button.click();
		const copied = await page.evaluate(() => window.__copied);
		assert.equal(new URL(copied[0]).hash, "#deuxieme-partie");
		assert.equal(await button.getAttribute("data-state"), "copied");
		assert.equal(await heading.locator(".heading-link__toast").textContent(), "Lien copié");
		assert.equal(await waitFor(() => page.locator("[data-article-live]").textContent()), "Lien copié");
		await page.waitForTimeout(2100);
		assert.equal(await button.getAttribute("data-state"), null);
		assert.equal(await heading.locator(".heading-link__toast").count(), 0);
		await dispose();
	});

	it("follows the section's anchor when the clipboard is refused", async () => {
		const { page, dispose } = await open({ render: article(), initScript: refuseClipboard });
		await page.locator("#conclusion .heading-link").click();
		assert.equal(await waitFor(() => page.evaluate(() => location.hash)), "#conclusion");
		await dispose();
	});

	it("shows the heading link after the title on touch screens", async () => {
		const { page, dispose } = await open({ render: article(), viewport: { width: 390, height: 844 }, hasTouch: true });
		const place = await page.evaluate(() => {
			const heading = document.querySelector("#premiere-partie");
			const button = heading.querySelector(".heading-link");
			return {
				opacity: getComputedStyle(button).opacity,
				inside: button.getBoundingClientRect().left >= heading.getBoundingClientRect().left,
			};
		});
		assert.deepEqual(place, { opacity: "1", inside: true });
		await dispose();
	});

	it("labels code blocks with their language and copies their code (« Copier » → « Copié »)", async () => {
		const { page, dispose } = await open({ render: article(), initScript: mockClipboard });
		const block = page.locator(".code-block").first();
		assert.equal(await block.locator(".code-block__language").textContent(), "bash");
		const button = block.locator(".code-block__copy");
		assert.equal(await button.textContent(), "Copier");
		assert.equal(await button.getAttribute("aria-label"), "Copier le code");
		await button.click();
		assert.deepEqual(await page.evaluate(() => window.__copied), ["curl -sSL https://example.com/install.sh | sh"]);
		assert.equal(await button.textContent(), "Copié");
		assert.equal(await waitFor(() => page.locator("[data-article-live]").textContent()), "Code copié");
		await page.waitForTimeout(2100);
		assert.equal(await button.textContent(), "Copier");
		await dispose();
	});
});

describe("article page: header, dates, author", () => {
	before(launch);
	after(close);

	it("shows « Mis à jour le » in the header and at the end only with the internal tag #mis-a-jour", async () => {
		const plain = await open({ render: article() });
		assert.equal(await plain.page.locator(".article-header__updated").count(), 0);
		assert.equal(await plain.page.locator(".article-dates").count(), 0);
		await plain.dispose();

		const updated = await open({ render: article({ internal: ["#mis-a-jour"] }) });
		assert.equal(await updated.page.locator(".article-header__updated").textContent(), "Mis à jour le 2 juin 2026");
		const line = (await updated.page.locator(".article-dates").textContent()).replace(/\s+/g, " ").trim();
		assert.match(line, /^Publié le \d+ \S+ \d{4} · Mis à jour le 2 juin 2026$/);
		await updated.dispose();
	});

	it("ends the content with the dates line, then the series line, then tags and share", async () => {
		const { page, dispose } = await open({
			render: article({ internal: ["#mis-a-jour"], series: { published: 4, current: 2 } }),
		});
		const order = await page.$$eval(".article-end > *", els => els.map(el => el.className.split(" ")[0]));
		assert.deepEqual(order, ["article-dates", "series-line", "article-share"]);
		await dispose();
	});

	it("shares the post's full address, encoded, with each service", async () => {
		const { page, dispose } = await open({ render: article() });
		const links = await page.$$eval(".article-share__link", els => els.map(a => a.getAttribute("href")));
		const address = encodeURIComponent("http://theme.test/overwatch-renaissance/");
		assert.equal(links.length, 4);
		for (const link of links) assert.ok(link.includes(address), link);
		await dispose();
	});

	it("gives members the « À lire plus tard » button in the header, never visitors", async () => {
		const visitor = await open({ render: article() });
		assert.equal(await visitor.page.locator(".article-header [data-bookmark]").count(), 0);
		await visitor.dispose();
		const member = await open({ render: article({ member: true }) });
		const button = member.page.locator(".article-header [data-bookmark]");
		assert.equal(await button.isVisible(), true);
		await button.click();
		assert.equal(await button.getAttribute("aria-pressed"), "true");
		assert.equal(await button.locator(".bookmark__label:visible").textContent(), "Enregistré");
		await member.dispose();
	});

	it("fills the author box from the profile and leaves out what is missing", async () => {
		const full = await open({ render: article() });
		const box = full.page.locator(".author-box");
		assert.match(await box.locator(".author-box__bio").textContent(), /Développeur front-end/);
		assert.deepEqual(
			await box.locator(".author-box__links a").allTextContents(),
			["À propos"],
			"single author: no author page",
		);
		assert.equal(await box.locator("a", { hasText: "À propos" }).getAttribute("href"), "/a-propos/");
		await full.dispose();

		const bare = article({ pages: [] });
		bare.site.posts[1].primary_author = { ...bare.site.posts[1].primary_author, bio: null };
		bare.context.post.primary_author = bare.site.posts[1].primary_author;
		const empty = await open({ render: bare });
		assert.equal(await empty.page.locator(".author-box__bio").count(), 0);
		assert.deepEqual(await empty.page.locator(".author-box__links a").allTextContents(), []);
		await empty.dispose();

		const custom = await open({
			render: article({
				custom: { about_page: "qui-suis-je" },
				pages: [{ id: "p2", slug: "qui-suis-je", url: "/qui-suis-je/" }],
			}),
		});
		assert.equal(
			await custom.page.locator(".author-box a", { hasText: "À propos" }).getAttribute("href"),
			"/qui-suis-je/",
		);
		await custom.dispose();
	});

	it("recommends three other posts sharing a tag, as tiles", async () => {
		const { page, dispose } = await open({ render: article() });
		const tiles = await page.$$eval(".article-related .tile__title", els => els.map(el => el.textContent));
		assert.equal(tiles.length, 3);
		assert.ok(!tiles.includes("Overwatch est-il en train de renaître ?"), "not the post itself");
		await dispose();
	});

	it("recommends posts that share a public tag, never one linked by an internal tag only", async () => {
		const render = article({ tags: ["actualites"], internal: ["#top"] });
		const { posts } = render.site;
		const [actualites, top] = posts[1].tags;
		posts.forEach((post, i) => {
			if (i === 1) return;
			// Post 0 shares #top only (and has a public tag of its own), post 2 shares Actualité
			const tags = i === 0 ? [{ ...actualites, slug: "anime", name: "Anime" }, top] : i === 2 ? [actualites] : [];
			Object.assign(post, { tags, primary_tag: tags.find(t => t.visibility === "public") || null });
		});
		const { page, dispose } = await open({ render });
		const tiles = await page.$$eval(".article-related .tile__title", els => els.map(el => el.textContent));
		assert.deepEqual(tiles, [posts[2].title]);
		await dispose();
	});

	it("prints the title, the meta and the text only, with the address of external links", async () => {
		const html = `<p>Voir <a href="https://ghost.org/?ref=geekly.blog">Ghost</a>.</p>${LONG_HTML}`;
		const { page, dispose } = await open({ render: article({ member: true, html }) });
		assert.equal(await page.locator('link[rel="stylesheet"][media="print"][href*="css/print.css"]').count(), 1);
		await page.waitForSelector(".gh-content a[data-print-href]");
		await page.emulateMedia({ media: "print" });
		const printed = await page.evaluate(() => {
			const shown = sel => [...document.querySelectorAll(sel)].some(el => el.getClientRects().length > 0);
			const hidden = [
				".site-header",
				".site-footer",
				".skip-link",
				".article-header__media",
				".article-header__bookmark",
				".article-toc",
				".article-share",
				".author-box",
				".article-related",
				".progress-button",
				".heading-link",
				".code-block__bar",
				".reading-settings",
			].filter(shown);
			return {
				hidden,
				title: shown("main h1"),
				date: shown(".article-header__meta time"),
				text: shown(".gh-content > p"),
				background: getComputedStyle(document.body).backgroundColor,
				after: getComputedStyle(document.querySelector('.gh-content a[href^="https://ghost.org"]'), "::after").content,
			};
		});
		assert.deepEqual(printed, {
			hidden: [],
			title: true,
			date: true,
			text: true,
			background: "rgb(255, 255, 255)",
			after: '" (https://ghost.org/)"',
		});
		await dispose();
	});
});

describe("article page: reading progress for « Reprendre la lecture »", () => {
	before(launch);
	after(close);

	const scrollTo = (page, share) =>
		page.evaluate(share => {
			const box = document.querySelector("[data-article-content]").getBoundingClientRect();
			const top = box.top + window.scrollY;
			window.scrollTo(0, top + box.height * share - window.innerHeight);
		}, share);
	const stored = page =>
		page.evaluate(() => {
			try {
				return JSON.parse(localStorage.getItem("attibling-progress") || "[]");
			} catch {
				return null;
			}
		});

	it("keeps a member's progress, only between 10 % and 90 %, and never lowers it", async () => {
		const { page, dispose } = await open({ render: article({ member: true }), viewport: { width: 1280, height: 800 } });
		await scrollTo(page, 0.5);
		const half = await waitFor(async () => (await stored(page))[0]);
		assert.equal(half.url, "/overwatch-renaissance/");
		assert.equal(half.title, "Overwatch est-il en train de renaître ?");
		assert.equal(half.tag, "Actualité");
		assert.equal(half.readingTime, 11);
		assert.ok(Math.abs(half.progress - 0.5) < 0.05, `progress ${half.progress}`);

		await scrollTo(page, 0.2);
		await page.waitForTimeout(1500);
		assert.ok((await stored(page))[0].progress >= half.progress - 0.01, "scrolling back up keeps the place");

		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		assert.deepEqual(
			await waitFor(async () => (await stored(page)).length === 0 && []),
			[],
			"read to the end: dropped",
		);
		await dispose();
	});

	it("writes nothing for visitors", async () => {
		const { page, storageWrites, dispose } = await open({ render: article() });
		await scrollTo(page, 0.5);
		await page.waitForTimeout(1500);
		assert.deepEqual(
			(await storageWrites()).filter(([key]) => key === "attibling-progress"),
			[],
		);
		await dispose();
	});
});
