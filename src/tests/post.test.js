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

	// A gallery as pasted or imported HTML gives it: the second image has no width and height attributes
	const GALLERY_HTML = `<figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image sized"><img src="/src/tests/fixtures/pixel.svg" width="1600" height="800" alt=""></div><div class="kg-gallery-image unsized"><img src="/src/tests/fixtures/pixel.svg" alt=""></div></div></div></figure>`;

	it("keeps every enhancement when a gallery image has no width and height", async () => {
		const { page, errors, dispose } = await open({ render: article({ html: GALLERY_HTML + LONG_HTML }) });
		// tocbot is loaded on demand: the table of contents fills a moment after the other enhancements
		await page.locator("[data-toc] a").first().waitFor();
		const state = await page.evaluate(() => ({
			sized: document.querySelector(".kg-gallery-image.sized").style.flexGrow,
			unsized: document.querySelector(".kg-gallery-image.unsized").style.flexGrow,
			toc: document.querySelectorAll("[data-toc] a").length,
			copy: document.querySelectorAll("[data-article-content] pre button, [data-article-content] .code-block button")
				.length,
			zoomable: document.querySelectorAll("img.js-zoomable").length > 0,
		}));
		assert.deepEqual(
			errors.map(error => error.message),
			[],
		);
		assert.deepEqual(state, { sized: "2", unsized: "", toc: 4, copy: 1, zoomable: true });
		await dispose();
	});

	it("keeps the other enhancements when one of them fails, and still reports the error", async () => {
		const { page, errors, dispose } = await open({
			render: article({ html: MEDIA_HTML }),
			// The embed ratios fail (they read the frames' attributes); everything after them must still run
			initScript: () => {
				HTMLIFrameElement.prototype.getAttribute = () => {
					throw new Error("broken embed");
				};
			},
		});
		assert.equal(await page.locator("[data-toc] a").count(), 4, "the table of contents is built");
		assert.equal((await page.locator("img.js-zoomable").count()) > 0, true, "images are zoomable");
		assert.deepEqual(
			errors.map(error => error.message),
			["broken embed"],
		);
		// dispose() fails a test on any page error: this one is the point of the test
		errors.length = 0;
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

	it("highlights the entry of the table of contents that was just chosen, its heading clear of the bar", async () => {
		for (const reducedMotion of ["no-preference", "reduce"]) {
			const { page, dispose } = await open({
				render: article({ html: LONG_HTML }),
				viewport: { width: 1440, height: 900 },
				reducedMotion,
			});
			await page.locator("[data-toc-list] a").first().waitFor();
			const count = await page.locator("[data-toc-list] a").count();
			// Neither the first entry (the page starts on it) nor the last ones (the page ends before them)
			for (const index of [2, Math.floor(count / 2)]) {
				const link = page.locator("[data-toc-list] a").nth(index);
				const id = decodeURIComponent((await link.getAttribute("href")).slice(1));
				await link.click();
				const landed = await waitFor(
					() =>
						page.evaluate(target => {
							const active = document.querySelector("[data-toc-list] .is-active-link");
							const top = document.getElementById(target).getBoundingClientRect().top;
							const settled = Math.abs(top - (window.__top ?? -1)) < 1;
							window.__top = top;
							return settled && { top, active: decodeURIComponent(active?.getAttribute("href").slice(1) || "") };
						}, id),
					{ timeout: 4000, interval: 150 },
				);
				assert.ok(landed, `the page settles on entry ${index} (${reducedMotion})`);
				assert.equal(landed.active, id, `the chosen entry is the highlighted one (${reducedMotion})`);
				assert.ok(
					landed.top >= 72 && landed.top <= 130,
					`its heading is just under the bar (${Math.round(landed.top)} px)`,
				);
			}
			await dispose();
		}
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

	// A long table of contents (36 entries, taller than the screen allows): sticky in the margin while the
	// text is read, it stops at the end of the article instead of sliding over what follows
	it("keeps the sticky table of contents inside the article: it sticks mid-text and never covers the author box or the comments", async () => {
		const sections = Array.from(
			{ length: 18 },
			(_, i) =>
				`<h2 id="section-${i}">Section ${i + 1}</h2><p>${"lecture ".repeat(90)}</p>` +
				`<h3 id="detail-${i}">Détail ${i + 1}</h3><p>${"lecture ".repeat(90)}</p>`,
		).join("");
		const measure = (page, fromEnd) =>
			page.evaluate(async fromEnd => {
				const max = document.documentElement.scrollHeight - innerHeight;
				window.scrollTo(0, fromEnd === null ? Math.round(max / 2) : max - fromEnd);
				await new Promise(resolve => setTimeout(resolve, 400));
				const box = selector => document.querySelector(selector).getBoundingClientRect();
				const nav = box(".article-toc__nav");
				const crosses = other => nav.bottom > other.top + 1 && nav.top < other.bottom - 1;
				return {
					top: Math.round(nav.top),
					height: Math.round(nav.height),
					pastEnd: Math.round(nav.bottom - box(".article-end").bottom),
					overAuthor: crosses(box(".author-box")),
					overComments: crosses(box("[data-comments]")),
				};
			}, fromEnd);
		for (const custom of [{}, { reading_settings: false }]) {
			const { page, dispose } = await open({
				render: article({ html: sections, custom }),
				viewport: { width: 1440, height: 900 },
			});
			assert.equal(await page.locator("[data-toc-list] a").count(), 36);
			const before = await page.evaluate(() => document.querySelector(".article-body").getBoundingClientRect().height);
			const middle = await measure(page, null);
			assert.ok(middle.height > 600, `a tall list (${middle.height}px)`);
			assert.ok(middle.top >= 0 && middle.top < 200, `sticks under the header mid-text (top ${middle.top}px)`);
			for (const fromEnd of [700, 300, 0]) {
				const end = await measure(page, fromEnd);
				assert.ok(end.pastEnd <= 1, `${fromEnd}px from the end: ${end.pastEnd}px past the end of the article`);
				assert.equal(end.overAuthor, false, `${fromEnd}px from the end: over the author box`);
				assert.equal(end.overComments, false, `${fromEnd}px from the end: over the comments`);
			}
			// The margin column does not stretch the text: the article ends where its own content ends
			const natural = await page.evaluate(() => {
				document.querySelector("[data-toc]").hidden = true;
				document.querySelector("[data-toc]").style.setProperty("display", "none", "important");
				return document.querySelector(".article-body").getBoundingClientRect().height;
			});
			assert.ok(Math.abs(before - natural) <= 1, `the table of contents adds ${before - natural}px to the article`);
			await dispose();
		}
	});

	it("gives a short article with a longer table of contents the room for it, without covering what follows", async () => {
		// An HTML card that lays its sections out in columns: 24 headings in a few short rows
		const html = `<div style="display: flex; flex-wrap: wrap; gap: 8px">${Array.from(
			{ length: 24 },
			(_, i) => `<h3 id="s-${i}" style="margin: 0; font-size: 14px">Section ${i + 1}</h3>`,
		).join("")}</div>`;
		const { page, dispose } = await open({ render: article({ html }), viewport: { width: 1440, height: 1200 } });
		assert.equal(await page.locator("[data-toc-list] a").count(), 24);
		const result = await page.evaluate(() => {
			const box = selector => document.querySelector(selector).getBoundingClientRect();
			const nav = box(".article-toc__nav");
			return {
				// The text itself, not its row (which the list lengthens)
				longer: nav.height > box("[data-article-content] > :last-child").bottom - box("[data-article-content]").top,
				pastEnd: nav.bottom - box(".article-end").bottom,
				author: box(".author-box").top - nav.bottom,
			};
		});
		assert.equal(result.longer, true, "the list is longer than the text");
		assert.ok(result.pastEnd <= 1, `${result.pastEnd}px past the end of the article`);
		assert.ok(result.author >= 0, "above the author box");
		await dispose();
	});

	it("puts the table of contents back above a wide text (L) below 90rem, as a « Sommaire » button that opens", async () => {
		const { page, dispose } = await open({
			render: article({ member: true }),
			storage: { "attibling-reading": JSON.stringify({ width: "l" }) },
			viewport: { width: 1300, height: 900 },
		});
		await page.waitForTimeout(100);
		const state = () =>
			page.evaluate(() => {
				const box = selector => document.querySelector(selector).getBoundingClientRect();
				const text = box("[data-article-content] > p");
				const toc = box("[data-toc]");
				const end = box(".article-end");
				const nav = box(".article-toc__nav");
				return {
					width: document.documentElement.dataset.readingWidth,
					position: getComputedStyle(document.querySelector("[data-toc]")).position,
					open: document.querySelector("[data-toc]").open,
					toggle: getComputedStyle(document.querySelector(".article-toc__toggle")).display,
					inColumn: Math.abs(toc.left - text.left) < 1 && toc.right <= text.right + 1,
					aboveText: toc.bottom <= text.top && toc.height > 0,
					listInColumn: nav.left >= text.left - 1 && nav.right <= text.right + 1,
					endInColumn: Math.abs(end.left - text.left) < 1,
				};
			});
		assert.deepEqual(await state(), {
			width: "l",
			position: "static",
			open: false,
			toggle: "inline-flex",
			inColumn: true,
			aboveText: true,
			listInColumn: true,
			endInColumn: true,
		});
		await page.locator(".article-toc__toggle").click();
		assert.deepEqual(await state(), {
			width: "l",
			position: "static",
			open: true,
			toggle: "inline-flex",
			inColumn: true,
			aboveText: true,
			listInColumn: true,
			endInColumn: true,
		});
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

	it("has no table of contents when the headings are those of cards or are left out of it", async () => {
		const cards =
			'<div class="kg-card kg-header-card"><h2 id="en-tete">En-tête</h2><h3 id="sous-titre">Sous-titre</h3></div>' +
			'<div class="kg-card kg-signup-card"><h2 id="inscription">Inscription</h2></div><p>Un texte sans intertitre.</p>';
		const ignored =
			'<h2 id="seul">Seul</h2><p>Texte.</p><h2 id="hors" class="js-toc-ignore">Hors sommaire</h2><p>Fin.</p>';
		for (const html of [cards, ignored, cards + ignored]) {
			for (const width of [1440, 390]) {
				const { page, dispose } = await open({ render: article({ html }), viewport: { width, height: 900 } });
				await page.waitForTimeout(150);
				const toc = await page.evaluate(() => {
					const el = document.querySelector("[data-toc]");
					return { display: getComputedStyle(el).display, links: el.querySelectorAll("a").length };
				});
				assert.deepEqual(toc, { display: "none", links: 0 }, `at ${width}px`);
				await dispose();
			}
		}
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

	it("shows « back to the top » only after a screen of scrolling, and never over a control", async () => {
		const filler = "<p>Un paragraphe pour que la page défile bien au-delà de l’écran, ligne après ligne.</p>".repeat(
			30,
		);
		const facade =
			'<figure class="kg-card kg-embed-card"><iframe width="200" height="113" src="https://www.youtube.com/embed/_jGbRsxHi7Q" title="Une vidéo"></iframe></figure>';
		const html = `${filler}${facade}${filler}<p style="text-align: right">Fin de ligne : <a href="/x/">un lien</a></p>${filler}`;
		const { page, dispose } = await open({ render: article({ html }), viewport: { width: 390, height: 844 } });
		const button = page.locator("[data-progress-button]");
		const shown = () =>
			page.waitForTimeout(400).then(() => button.evaluate(b => getComputedStyle(b).visibility === "visible"));
		// The middle of `selector` at the height of the button's middle
		const align = selector =>
			page.evaluate(selector => {
				const b = document.querySelector("[data-progress-button]").getBoundingClientRect();
				const el = document.querySelector(selector).getBoundingClientRect();
				window.scrollBy(0, el.top + el.height / 2 - (b.top + b.height / 2));
			}, selector);
		assert.equal(await shown(), false, "not at the top");
		await page.evaluate(() => window.scrollTo(0, 400));
		assert.equal(await shown(), false, "not before a screen of scrolling");
		await page.evaluate(() => window.scrollTo(0, 1400));
		assert.equal(await shown(), true, "over the text");
		await align("[data-embed-facade] [data-embed-open]");
		assert.equal(await shown(), false, "not over the embed's « Voir sur YouTube »");
		await align('.gh-content a[href="/x/"]');
		assert.equal(await shown(), false, "not over a link");
		await page.evaluate(() => window.scrollBy(0, 300));
		assert.equal(await shown(), true, "back over the text");
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

	it("takes the quotes of the copy-link label from the translation, not from the script", async () => {
		const html = `${LONG_HTML}<h2 id="cout">Coût $&amp; plus</h2><p>Texte.</p>`;
		const english = await open({ render: article({ locale: "en", html }) });
		assert.equal(
			await english.page.locator("#deuxieme-partie .heading-link").getAttribute("aria-label"),
			"Copy the link to the section “Deuxième partie”",
		);
		await english.dispose();
		const french = await open({ render: article({ html }) });
		assert.equal(
			await french.page.locator("#cout .heading-link").getAttribute("aria-label"),
			"Copier le lien vers la section « Coût $& plus »",
		);
		await french.dispose();
	});

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
		// One name, the list's: « À lire plus tard », then « Dans À lire plus tard » once the post is in it
		// (the visible label is the accessible name; the state is aria-pressed)
		const name = () => button.evaluate(element => element.innerText.trim());
		assert.equal(await button.getAttribute("aria-label"), null);
		assert.deepEqual([await name(), await button.getAttribute("aria-pressed")], ["À lire plus tard", "false"]);
		await button.click();
		assert.deepEqual([await name(), await button.getAttribute("aria-pressed")], ["Dans À lire plus tard", "true"]);
		assert.equal(await button.locator(".bookmark__label:visible").textContent(), "Dans À lire plus tard");
		await button.click();
		assert.deepEqual([await name(), await button.getAttribute("aria-pressed")], ["À lire plus tard", "false"]);
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

	it("gives the header image an empty alt (the h1 is next to it) unless the author wrote one", async () => {
		const plain = await open({ render: article() });
		assert.equal(await plain.page.locator(".article-header__image").getAttribute("alt"), "");
		await plain.dispose();
		const render = article();
		render.context.post.feature_image_alt = "Capture du jeu";
		const written = await open({ render });
		assert.equal(await written.page.locator(".article-header__image").getAttribute("alt"), "Capture du jeu");
		await written.dispose();
	});

	it("shows no empty « Tags » block and no recommendations for a post with internal tags only", async () => {
		const { page, dispose } = await open({ render: article({ tags: [], internal: ["#top"] }) });
		assert.equal(await page.locator("#article-tags-label").count(), 0, "no Tags label");
		assert.equal(await page.locator(".article-share__tags").count(), 0, "no empty list of tags");
		assert.equal(await page.locator(".article-related").count(), 0, "no recommendations");
		assert.equal(await page.locator(".article-share__links a").count(), 4, "the share links stay");
		await dispose();
	});

	it("prints a series box as its name and « Partie N sur T » only", async () => {
		const { page, dispose } = await open({
			render: article({ series: { published: 4, current: 2, description: "Construire son homelab" } }),
		});
		await page.emulateMedia({ media: "print" });
		const printed = await page.$eval("[data-series]", box => box.innerText.replace(/\s+/g, " ").trim());
		assert.equal(printed, "Série Construire son homelab Partie 2 sur 4");
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

describe("article page: scripts loaded when needed", () => {
	before(launch);
	after(close);

	const chunks = requests => ({
		tocbot: requests.some(url => /\/chunks\/tocbot-/.test(url)),
		zoom: requests.some(url => /\/chunks\/medium-zoom/.test(url)),
	});
	const IMAGE =
		'<figure class="kg-card kg-image-card"><img src="/src/tests/fixtures/pixel.svg" alt="plain" width="400" height="300"></figure>';
	const SHORT = "<p>Un texte court, sans titre ni image.</p>";

	it("does not fetch tocbot nor medium-zoom for a post without headings and without zoomable images", async () => {
		const { page, requests, dispose } = await open({ render: article({ html: SHORT }) });
		await page.waitForTimeout(600);
		assert.deepEqual(chunks(requests), { tocbot: false, zoom: false });
		assert.equal(await page.locator("[data-toc]").isVisible(), false);
		await dispose();
	});

	it("fetches tocbot only for a post with a table of contents, and medium-zoom only with zoomable images", async () => {
		const sections = '<h2 id="a">Premier</h2><p>Texte.</p><h2 id="b">Second</h2><p>Texte.</p>';
		const headings = await open({ render: article({ html: sections }) });
		await waitFor(() => headings.page.evaluate(() => document.querySelectorAll("[data-toc] a").length > 0));
		await headings.page.waitForTimeout(300);
		assert.equal(chunks(headings.requests).tocbot, true);
		assert.equal(chunks(headings.requests).zoom, false, "no image, no zoom");
		await headings.dispose();

		const images = await open({ render: article({ html: SHORT + IMAGE }) });
		await waitFor(() => images.page.evaluate(() => performance.getEntriesByType("resource").length > 0));
		await images.page.waitForTimeout(600);
		assert.deepEqual(chunks(images.requests), { tocbot: false, zoom: true });
		await images.dispose();
	});

	it("zooms an image clicked before medium-zoom has loaded", async () => {
		const { page, dispose } = await open({ render: article({ html: SHORT + IMAGE }) });
		await page.locator("img.js-zoomable").click();
		assert.equal(await waitFor(() => page.locator(".medium-zoom-image--opened").first().isVisible()), true);
		await dispose();
	});
});
