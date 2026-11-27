import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { article, LONG_HTML, SUMMARY_CARD } from "./support/article.js";

const HTML =
	SUMMARY_CARD + LONG_HTML.replace("Première partie</h2>", 'Première partie</h2><p>Un <a href="/x/">lien</a>.</p>');

const openPanel = async page => {
	await page.locator("[data-reading-button]").click();
	await page.waitForFunction(() => document.querySelector("[data-reading-settings]").matches(":popover-open"));
};

// Contrast ratios against the page colour (computed rgb() colours). AA: 4.5:1; the themes of the
// board Idee-17 aim at 10:1 for the text.
const contrastIn = page =>
	page.evaluate(() => {
		const rgb = value =>
			value
				.match(/[\d.]+/g)
				.slice(0, 3)
				.map(Number);
		const lum = ([r, g, b]) => {
			const c = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
			return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
		};
		const ratio = (a, b) => {
			const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
			return (x + 0.05) / (y + 0.05);
		};
		const bg = getComputedStyle(document.documentElement).backgroundColor;
		const text = getComputedStyle(document.querySelector("[data-article-content] > p")).color;
		const link = getComputedStyle(document.querySelector("[data-article-content] a")).color;
		const header = getComputedStyle(document.querySelector(".site-header .nav-link")).color;
		const footer = getComputedStyle(document.querySelector(".site-footer")).color;
		return { bg, text: ratio(text, bg), link: ratio(link, bg), header: ratio(header, bg), footer: ratio(footer, bg) };
	});

describe("display settings: access and panel", () => {
	before(launch);
	after(close);

	it("translate the S / M / L sizes (P / M / G in French)", async () => {
		const { page, dispose } = await open({ render: article({ member: true }) });
		const sizes = name =>
			page.$$eval(`input[name=${name}]`, inputs => inputs.map(i => i.parentElement.textContent.trim()));
		assert.equal(
			await page.locator("label[for=reading-theme]").textContent(),
			"Palette",
			"the colour list is « Palette »",
		);
		assert.deepEqual(await sizes("width"), ["P", "M", "G"]);
		assert.deepEqual(await sizes("size"), ["P", "M", "G"]);
		await dispose();
	});

	it("are for members only", async () => {
		const visitor = await open({ render: article() });
		assert.equal(await visitor.page.locator("[data-reading-button], [data-reading-settings]").count(), 0);
		await visitor.dispose();
		const member = await open({ render: article({ member: true }) });
		assert.equal(await member.page.locator("[data-reading-button]").isVisible(), true);
		await member.dispose();
		const off = await open({ render: article({ member: true, custom: { reading_settings: false } }) });
		assert.equal(await off.page.locator("[data-reading-button]").count(), 0, "theme setting off");
		await off.dispose();
	});

	it("open as a popover under the gear, move the focus in, and give it back on Escape", async () => {
		const { page, dispose } = await open({ render: article({ member: true }), viewport: { width: 1440, height: 900 } });
		const gear = page.locator("[data-reading-button]");
		await gear.focus();
		await page.keyboard.press("Enter");
		await page.waitForFunction(() => document.querySelector("[data-reading-settings]").matches(":popover-open"));
		assert.equal(await gear.getAttribute("aria-expanded"), "true");
		const place = await page.evaluate(() => {
			const panel = document.querySelector("[data-reading-settings]").getBoundingClientRect();
			const button = document.querySelector("[data-reading-button]").getBoundingClientRect();
			return {
				width: panel.width,
				below: panel.top >= button.bottom,
				rightAligned: Math.abs(panel.right - button.right) < 2,
			};
		});
		assert.deepEqual(place, { width: 312, below: true, rightAligned: true });
		assert.equal(await waitFor(() => page.evaluate(() => document.activeElement.id)), "reading-theme");
		await page.keyboard.press("Escape");
		assert.equal(
			await page.evaluate(() => document.querySelector("[data-reading-settings]").matches(":popover-open")),
			false,
		);
		assert.equal(await page.evaluate(() => document.activeElement.matches("[data-reading-button]")), true);
		assert.equal(await waitFor(async () => (await gear.getAttribute("aria-expanded")) === "false"), true);
		await dispose();
	});

	it("open as a bottom sheet on phones", async () => {
		const { page, dispose } = await open({
			render: article({ member: true }),
			viewport: { width: 390, height: 844 },
			hasTouch: true,
		});
		await openPanel(page);
		await page.waitForTimeout(400);
		const box = await page.evaluate(() =>
			document.querySelector("[data-reading-settings]").getBoundingClientRect().toJSON(),
		);
		assert.equal(Math.round(box.bottom), 844);
		assert.equal(Math.round(box.width), 390);
		await page.keyboard.press("Escape");
		await dispose();
	});
});

describe("display settings: every control", () => {
	before(launch);
	after(close);

	const choose = async (page, name, value) => {
		const select = page.locator(`select[name="${name}"]`);
		if (await select.count()) await select.selectOption(value);
		else await page.locator(`input[name="${name}"][value="${value}"]`).check({ force: true });
	};
	const read = (page, fn) => page.evaluate(fn);

	it("change what they say, are saved, and « Réinitialiser » restores the defaults", async () => {
		const { page, requests, dispose } = await open({
			render: article({ member: true, html: HTML }),
			viewport: { width: 1440, height: 900 },
		});
		await openPanel(page);
		const before = await read(page, () => ({
			bg: getComputedStyle(document.documentElement).backgroundColor,
			width: document.querySelector("[data-article-content] > p").getBoundingClientRect().width,
		}));

		await choose(page, "theme", "desert");
		assert.equal(
			await read(page, () => getComputedStyle(document.documentElement).backgroundColor),
			"rgb(241, 230, 210)",
		);

		await choose(page, "heading", "space-grotesk");
		assert.match(
			await read(page, () => getComputedStyle(document.querySelector("#premiere-partie")).fontFamily),
			/^"Space Grotesk"/,
		);
		await choose(page, "body", "merriweather");
		assert.match(
			await read(page, () => getComputedStyle(document.querySelector("[data-article-content] > p")).fontFamily),
			/^Merriweather/,
		);
		assert.equal(
			await waitFor(() =>
				requests.filter(url => url.startsWith("https://fonts.bunny.net/") && url.includes("merriweather")).at(-1),
			),
			"https://fonts.bunny.net/css?family=space-grotesk:400,700|merriweather:400,400i,700&display=swap",
		);

		await choose(page, "width", "s");
		const narrow = await read(
			page,
			() => document.querySelector("[data-article-content] > p").getBoundingClientRect().width,
		);
		assert.ok(narrow < before.width - 50, `S is narrower (${narrow} < ${before.width})`);

		await choose(page, "size", "l");
		assert.equal(
			await read(page, () => getComputedStyle(document.querySelector("[data-article-content] > p")).fontSize),
			"21px",
		);
		await choose(page, "leading", "airy");
		assert.equal(
			await read(page, () => {
				const s = getComputedStyle(document.querySelector("[data-article-content] > p"));
				return Math.round((parseFloat(s.lineHeight) / parseFloat(s.fontSize)) * 100) / 100;
			}),
			1.95,
		);
		await choose(page, "align", "center");
		assert.equal(
			await read(page, () => getComputedStyle(document.querySelector("[data-article-content] > p")).textAlign),
			"center",
		);
		assert.equal(
			await read(page, () => getComputedStyle(document.querySelector("#premiere-partie")).textAlign),
			"start",
			"titles keep theirs",
		);

		await choose(page, "links", "underline");
		assert.deepEqual(
			await read(page, () => {
				const a = getComputedStyle(document.querySelector("[data-article-content] p a"));
				return {
					line: a.textDecorationLine,
					sameColour:
						a.color === getComputedStyle(document.querySelector("[data-article-content] p a").parentElement).color,
				};
			}),
			{ line: "underline", sameColour: true },
		);

		await choose(page, "cover", "hide");
		assert.equal(await page.locator("[data-article-image]").isVisible(), false);

		await choose(page, "summary", "hide");
		assert.equal(await page.locator(".en-bref").isVisible(), false);

		await choose(page, "style", "immersive");
		assert.equal(
			await read(page, () => document.querySelector(".article-header__card").getBoundingClientRect().width),
			1440,
		);

		const saved = await read(page, () => JSON.parse(localStorage.getItem("attibling-reading")));
		assert.deepEqual(saved, {
			theme: "desert",
			heading: "space-grotesk",
			body: "merriweather",
			size: "l",
			leading: "airy",
			align: "center",
			links: "underline",
			cover: "hide",
			summary: "hide",
			style: "immersive",
		});

		await page.locator("[data-reading-reset]").click();
		const reset = await read(page, () => ({
			attributes: [...document.documentElement.attributes].map(a => a.name).filter(n => n.startsWith("data-reading-")),
			stored: localStorage.getItem("attibling-reading"),
			bg: getComputedStyle(document.documentElement).backgroundColor,
			fonts: document.querySelectorAll("link[data-reading-fonts]").length,
			width: document.querySelector("input[name=width]:checked").value,
			theme: document.querySelector("select[name=theme]").value,
		}));
		assert.deepEqual(reset, { attributes: [], stored: null, bg: before.bg, fonts: 0, width: "m", theme: "geekly" });
		await dispose();
	});

	it("offer the theme's fonts first: Google Sans and Noto Sans by default, Onest and Literata without a font service", async () => {
		const { page, requests, dispose } = await open({
			render: article({ member: true, html: HTML }),
			viewport: { width: 1440, height: 900 },
		});
		await openPanel(page);
		const options = name =>
			page.$$eval(`select[name=${name}] option`, els => els.map(el => [el.value, el.textContent.trim()]));
		assert.deepEqual(await options("heading"), [
			["default", "Google Sans"],
			["onest", "Onest"],
			["space-grotesk", "Space Grotesk"],
			["libre-baskerville", "Libre Baskerville"],
			["poppins", "Poppins"],
			["lora", "Lora"],
			["jetbrains-mono", "JetBrains Mono"],
		]);
		assert.deepEqual(await options("body"), [
			["default", "Noto Sans"],
			["literata", "Literata"],
			["merriweather", "Merriweather"],
			["ibm-plex-serif", "IBM Plex Serif"],
			["inter", "Inter"],
			["fira-mono", "Fira Mono"],
		]);
		const family = selector => page.evaluate(s => getComputedStyle(document.querySelector(s)).fontFamily, selector);
		assert.match(await family("#premiere-partie"), /^"Google Sans"/);
		assert.match(await family(".article-header__title"), /^"Google Sans"/);
		assert.match(await family("[data-article-content] > p"), /^"Noto Sans"/);

		await choose(page, "heading", "onest");
		await choose(page, "body", "literata");
		assert.match(await family("#premiere-partie"), /^Onest,/);
		assert.match(await family(".article-header__title"), /^Onest,/);
		assert.match(await family("[data-article-content] > p"), /^Literata, "Literata Fallback"/);
		assert.deepEqual(await read(page, () => JSON.parse(localStorage.getItem("attibling-reading"))), {
			heading: "onest",
			body: "literata",
		});
		// On the next page too (pre-paint script): the theme's own files, nothing from fonts.bunny.net
		await page.reload();
		await page.evaluate(() => document.fonts.ready);
		assert.match(await family("[data-article-content] > p"), /^Literata/);
		assert.equal(await read(page, () => document.querySelectorAll("link[data-reading-fonts]").length), 0);
		assert.ok(
			requests.some(url => url.includes("/assets/fonts/literata/literata-latin.woff2")),
			"Literata comes from the theme",
		);
		assert.deepEqual(
			requests.filter(url => /fonts\.bunny\.net/.test(url)),
			[],
		);
		await dispose();
	});

	it("read a saved « Noto Sans » (a choice when Literata was the default) as the default it has become", async () => {
		const { page, requests, dispose } = await open({
			render: article({ member: true, html: HTML }),
			storage: { "attibling-reading": JSON.stringify({ body: "noto-sans", size: "l" }) },
			viewport: { width: 1440, height: 900 },
		});
		await openPanel(page);
		assert.deepEqual(
			await read(page, () => ({
				attribute: document.documentElement.getAttribute("data-reading-body"),
				size: document.documentElement.getAttribute("data-reading-size"),
				select: document.querySelector("select[name=body]").value,
				family: getComputedStyle(document.querySelector("[data-article-content] > p")).fontFamily.split(",")[0],
			})),
			{ attribute: null, size: "l", select: "default", family: '"Noto Sans"' },
		);
		await choose(page, "leading", "airy");
		assert.deepEqual(
			requests.filter(url => /fonts\.bunny\.net/.test(url)),
			[],
		);
		await dispose();
	});

	it("are applied before the first paint on the next page (no flash)", async () => {
		const { page, dispose } = await open({
			render: article({ member: true }),
			storage: { "attibling-reading": JSON.stringify({ theme: "forest", size: "s", style: "immersive" }) },
			// What <html> carries when <body> starts: before anything is painted
			initScript: () => {
				new MutationObserver((records, observer) => {
					if (document.body) {
						window.__atBody = Object.fromEntries(
							[...document.documentElement.attributes]
								.filter(a => a.name.startsWith("data-reading-"))
								.map(a => [a.name, a.value]),
						);
						observer.disconnect();
					}
				}).observe(document, { childList: true, subtree: true });
			},
		});
		assert.deepEqual(await page.evaluate(() => window.__atBody), {
			"data-reading-theme": "forest",
			"data-reading-size": "s",
			"data-reading-style": "immersive",
		});
		await page.reload();
		assert.equal(await page.evaluate(() => window.__atBody["data-reading-theme"]), "forest", "after a reload too");
		await dispose();
	});

	it("ignore saved settings for visitors and bad values", async () => {
		const visitor = await open({
			render: article(),
			storage: { "attibling-reading": JSON.stringify({ theme: "desert" }) },
		});
		assert.equal(await visitor.page.evaluate(() => document.documentElement.hasAttribute("data-reading-theme")), false);
		await visitor.dispose();
		const bad = await open({
			render: article({ member: true }),
			storage: { "attibling-reading": '{"theme":"x\\" onload=\\"alert(1)","Size":"l","body":"../evil"}' },
		});
		const attrs = await bad.page.evaluate(() =>
			[...document.documentElement.attributes].map(a => a.name).filter(n => n.startsWith("data-reading-")),
		);
		assert.deepEqual(attrs, []);
		await bad.dispose();
		const broken = await open({ render: article({ member: true }), storage: { "attibling-reading": "{not json" } });
		assert.equal(await broken.page.locator("[data-reading-button]").isVisible(), true, "the page still works");
		await broken.dispose();
	});

	it("request no font at all with the default settings", async () => {
		const { page, requests, dispose } = await open({ render: article({ member: true }) });
		await page.waitForTimeout(300);
		assert.deepEqual(
			requests.filter(url => /fonts\.bunny\.net/.test(url)),
			[],
		);
		await dispose();
	});
});

describe("display settings: themes", () => {
	before(launch);
	after(close);

	it("restyle the whole page with AA contrast, in light and dark, for the four themes", async () => {
		const seen = new Set();
		for (const theme of ["geekly", "desert", "ink", "forest"]) {
			for (const mode of ["light", "dark"]) {
				const { page, dispose } = await open({
					render: article({ member: true, html: HTML }),
					storage: { theme: mode, "attibling-reading": theme === "geekly" ? "{}" : JSON.stringify({ theme }) },
				});
				const c = await contrastIn(page);
				const where = `${theme} ${mode}`;
				assert.ok(c.text >= 10, `${where}: text ${c.text.toFixed(2)}:1`);
				assert.ok(c.link >= 4.5, `${where}: links ${c.link.toFixed(2)}:1`);
				assert.ok(c.header >= 4.5, `${where}: header ${c.header.toFixed(2)}:1`);
				assert.ok(c.footer >= 4.5, `${where}: footer ${c.footer.toFixed(2)}:1`);
				seen.add(c.bg);
				await dispose();
			}
		}
		assert.equal(seen.size, 8, "eight different page colours");
	});
});

describe("style « Immersif »", () => {
	before(launch);
	after(close);

	const layout = page =>
		page.evaluate(() => {
			const rect = s => document.querySelector(s).getBoundingClientRect();
			const series = rect("[data-series]");
			const summary = rect(".en-bref");
			return {
				header: Math.round(rect(".article-header__card").width),
				text: Math.round(rect("[data-article-content] > p").width),
				textLeft: Math.round(rect("[data-article-content] > p").left),
				image: Math.round(rect("[data-article-content] .kg-image-card img").width),
				sideBySide: Math.abs(series.top - summary.top) < 2 && summary.left > series.right,
				sameHeight: Math.abs(series.height - summary.height) < 2,
				toc: getComputedStyle(document.querySelector(".article-toc__toggle")).display,
				overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			};
		});

	it("spreads text and media across 16:9 screens, caps only the text on ultrawide ones, and stacks the top boxes under 900px", async () => {
		const render = article({
			member: true,
			html: SUMMARY_CARD + LONG_HTML,
			internal: ["#immersif"],
			series: { published: 4, current: 2 },
		});
		const expected = {
			1440: { text: 1328, textLeft: 56 },
			1920: { text: 1808, textLeft: 56 },
			2560: { text: 1808, textLeft: 376 },
		};
		for (const [width, want] of Object.entries(expected)) {
			const { page, dispose } = await open({ render, viewport: { width: Number(width), height: 1000 } });
			const l = await layout(page);
			assert.equal(l.header, Number(width), `header full width at ${width}`);
			assert.equal(l.image, Number(width), `images full width at ${width}`);
			assert.equal(l.text, want.text, `text width at ${width}`);
			assert.equal(l.textLeft, want.textLeft, `text start at ${width}`);
			assert.equal(l.sideBySide, true, `series and « En bref » side by side at ${width}`);
			assert.equal(l.sameHeight, true);
			assert.notEqual(l.toc, "none", "the table of contents is a « Sommaire » button");
			assert.equal(l.overflow, 0);
			await dispose();
		}
		const { page, dispose } = await open({ render, viewport: { width: 860, height: 1000 } });
		assert.equal((await layout(page)).sideBySide, false, "stacked under 900px");
		await dispose();
	});

	it("comes from the theme setting, the internal tags #immersif / #carte, and the member's choice, in that order of precedence", async () => {
		const style = async render => {
			const { page, dispose } = await open({ render, viewport: { width: 1440, height: 900 } });
			const width = await page.evaluate(() =>
				Math.round(document.querySelector(".article-header__card").getBoundingClientRect().width),
			);
			await dispose();
			return width === 1440 ? "immersive" : "card";
		};
		assert.equal(await style(article()), "card");
		assert.equal(await style(article({ custom: { article_style: "Immersive" } })), "immersive");
		assert.equal(await style(article({ internal: ["#immersif"] })), "immersive");
		assert.equal(await style(article({ custom: { article_style: "Immersive" }, internal: ["#carte"] })), "card");
		const memberChoice = article({ member: true, internal: ["#immersif"] });
		const { page, dispose } = await open({
			render: memberChoice,
			storage: { "attibling-reading": JSON.stringify({ style: "card" }) },
			viewport: { width: 1440, height: 900 },
		});
		assert.ok(
			(await page.evaluate(() => document.querySelector(".article-header__card").getBoundingClientRect().width)) < 1440,
		);
		await dispose();
	});

	it("narrows the text with the « Largeur » setting (S 864px, M 1200px)", async () => {
		for (const [width, px] of [
			["s", 864],
			["m", 1200],
		]) {
			const { page, dispose } = await open({
				render: article({ member: true, internal: ["#immersif"] }),
				storage: { "attibling-reading": JSON.stringify({ width }) },
				viewport: { width: 1920, height: 1000 },
			});
			assert.equal(
				await page.evaluate(() =>
					Math.round(document.querySelector("[data-article-content] > p").getBoundingClientRect().width),
				),
				px,
			);
			await dispose();
		}
	});
});
