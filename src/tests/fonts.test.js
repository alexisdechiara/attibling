import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { launch, close, open } from "./support/harness.js";
import { article, SUMMARY_CARD, REVIEW_CARD } from "./support/article.js";
import { home, DEFAULT_CUSTOM } from "./support/pages.js";

// Computed font-family of each element, before and after setting Ghost's custom font variables on :root
const families = (page, selectors) =>
	page.evaluate(selectors => {
		const read = () =>
			Object.fromEntries(selectors.map(s => [s, getComputedStyle(document.querySelector(s)).fontFamily]));
		const theme = read();
		document.documentElement.style.setProperty("--gh-font-body", '"Body Test Font", serif');
		document.documentElement.style.setProperty("--gh-font-heading", '"Heading Test Font", monospace');
		return { theme, custom: read() };
	}, selectors);

const FONTS = new URL("../../assets/fonts/", import.meta.url);

// Axes ({ tag: [min, default, max] }) of a variable WOFF2: the table directory, then the fvar table in the
// Brotli stream (https://www.w3.org/TR/WOFF2/; fvar is stored untransformed, index 47 of the known tags)
const axesOf = file => {
	const buf = fs.readFileSync(new URL(file, FONTS));
	const FVAR = 47;
	let pos = 48;
	const base128 = () => {
		let n = 0;
		for (;;) {
			const byte = buf[pos++];
			n = n * 128 + (byte & 0x7f);
			if (!(byte & 0x80)) return n;
		}
	};
	const tables = [];
	for (let i = 0, count = buf.readUInt16BE(12); i < count; i++) {
		const flags = buf[pos++];
		const index = flags & 0x3f;
		const tag = index === 63 ? buf.toString("latin1", pos, (pos += 4)) : index;
		const version = flags >> 6;
		const length = base128();
		// glyf (10) and loca (11) are transformed with version 0, every other table with a version above 0
		const transformed = index === 10 || index === 11 ? version === 0 : version !== 0;
		tables.push({ tag, length: transformed ? base128() : length });
	}
	const data = zlib.brotliDecompressSync(buf.subarray(pos, pos + buf.readUInt32BE(20)));
	let offset = 0;
	for (const table of tables) {
		if (table.tag === FVAR) {
			const axesAt = offset + data.readUInt16BE(offset + 4);
			const count = data.readUInt16BE(offset + 8);
			const size = data.readUInt16BE(offset + 10);
			const axes = {};
			for (let i = 0; i < count; i++) {
				const at = axesAt + i * size;
				axes[data.toString("latin1", at, at + 4)] = [4, 8, 12].map(o => data.readInt32BE(at + o) / 65536);
			}
			return axes;
		}
		offset += table.length;
	}
	throw new Error(`no fvar table in ${file}`);
};

const sizeOf = file => fs.statSync(new URL(file, FONTS)).size;
const LITERATA_FILES = fs
	.readdirSync(new URL("literata/", FONTS))
	.filter(name => name.endsWith(".woff2"))
	.map(name => `literata/${name}`);

// An article with every kind of text the theme dresses in Literata (the article's own font): paragraphs,
// emphasis and bold italic, links, sup and sub (0.83 em), lists, quotes, a table, captions, code, cards,
// « En bref » and the review card
const RICH_HTML = [
	"<p>Un paragraphe avec du <strong>gras</strong>, de l’<em>italique</em>, du <strong><em>gras italique</em></strong>, un <a href='/x/'>lien</a>, du <code>code</code>, une note<sup><a href='#fn1'>1</a></sup> et H<sub>2</sub>O.</p>",
	"<p>Русский <em>курсив</em>, Tiếng Việt <em>nghiêng</em>, Zażółć <em>gęślą</em>.</p>",
	"<h2>Un titre</h2><h3>Un sous-titre</h3>",
	"<ul><li>Premier point</li><li>Deuxième <strong>point</strong><ul><li>Imbriqué</li></ul></li></ul><ol><li>Un</li></ol>",
	"<blockquote><p>Une citation, <em>avec italique</em>.</p></blockquote>",
	"<blockquote class='kg-blockquote-alt'>Une citation mise en avant.</blockquote>",
	"<figure class='kg-card kg-image-card kg-card-hascaption'><img src='/src/tests/fixtures/photo.svg?content' class='kg-image' alt='' width='1600' height='900'><figcaption>Une <em>légende</em></figcaption></figure>",
	"<table><thead><tr><th>Jeu</th><th>Note</th></tr></thead><tbody><tr><td>Un</td><td><strong>8,5</strong></td></tr></tbody></table>",
	"<pre><code>curl -sSL https://example.com | sh</code></pre>",
	"<div class='kg-card kg-callout-card kg-callout-card-grey'><div class='kg-callout-emoji'>💡</div><div class='kg-callout-text'>Un encart <em>important</em></div></div>",
	"<div class='kg-card kg-toggle-card' data-kg-toggle-state='open'><div class='kg-toggle-heading'><h4 class='kg-toggle-heading-text'>Un toggle</h4></div><div class='kg-toggle-content'><p>Contenu</p></div></div>",
	"<figure class='kg-card kg-bookmark-card'><a class='kg-bookmark-container' href='https://example.com'><div class='kg-bookmark-content'><div class='kg-bookmark-title'>Titre</div><div class='kg-bookmark-description'>Description</div></div></a></figure>",
	SUMMARY_CARD,
	REVIEW_CARD,
	"<section class='footnotes'><ol><li id='fn1'>Une note de bas de page.</li></ol></section>",
].join("\n");

// The sizes (px) of every visible text rendered in Literata, roman and italic, for the three text sizes of
// the reading settings, three widths and both article styles
const literataSizes = async () => {
	const sizes = { roman: new Set(), italic: new Set() };
	for (const article_style of ["Card", "Immersive"]) {
		const { page, dispose } = await open({
			render: article({ member: true, html: RICH_HTML, custom: { article_style, consent_notice: "None" } }),
			viewport: { width: 1440, height: 900 },
		});
		for (const width of [360, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			for (const size of ["s", "m", "l"]) {
				await page.evaluate(value => (document.documentElement.dataset.readingSize = value), size);
				const found = await page.evaluate(() => {
					const out = [];
					for (const el of document.querySelectorAll("body *")) {
						if (!el.getClientRects().length) continue;
						const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
						for (const pseudo of [null, "::before", "::after", "::marker"]) {
							const cs = getComputedStyle(el, pseudo);
							if (!/^["']?Literata/.test(cs.fontFamily)) continue;
							if (pseudo && pseudo !== "::marker" && (cs.content === "none" || cs.content === "normal")) continue;
							if (!pseudo && !hasText) continue;
							out.push([parseFloat(cs.fontSize), cs.fontStyle === "italic", cs.fontOpticalSizing]);
						}
					}
					return out;
				});
				for (const [px, italic, optical] of found) {
					assert.equal(optical, "auto", "the theme leaves font-optical-sizing on auto: opsz follows the size");
					sizes[italic ? "italic" : "roman"].add(Math.round(px * 100) / 100);
				}
			}
		}
		await dispose();
	}
	return sizes;
};

describe("fonts", () => {
	before(launch);
	after(close);

	it("use Onest, and Ghost's custom fonts when they are set (heading font for titles, body font elsewhere)", async () => {
		const { page, dispose } = await open();
		const f = await families(page, [".section-header__title", ".tile__title", ".tile__meta", ".site-nav .nav-link"]);
		for (const selector of Object.keys(f.theme)) assert.match(f.theme[selector], /^Onest,/, selector);
		assert.equal(f.custom[".section-header__title"], '"Heading Test Font", monospace');
		assert.equal(f.custom[".tile__title"], '"Heading Test Font", monospace');
		assert.equal(f.custom[".tile__meta"], '"Body Test Font", serif');
		assert.equal(f.custom[".site-nav .nav-link"], '"Body Test Font", serif');
		await dispose();
	});

	it("keep the wordmark in its own fonts", async () => {
		const { page, dispose } = await open();
		const f = await families(page, ["#hero-wordmark", "#hero-wordmark .wordmark__script"]);
		assert.match(f.custom["#hero-wordmark"], /^Onest,/);
		assert.match(f.custom["#hero-wordmark .wordmark__script"], /^Pacifico,/);
		await dispose();
	});

	it("are served by the theme: no font service, Onest latin preloaded and used, display swap", async () => {
		const { page, requests, dispose } = await open();
		await page.evaluate(() => document.fonts.ready);
		const fontRequests = requests.filter(url => /\.woff2|fonts\./.test(url)).map(url => new URL(url).pathname);
		assert.ok(!requests.some(url => /fonts\.(googleapis|gstatic)\.com|fonts\.bunny\.net/.test(url)), "no font service");
		assert.ok(fontRequests.includes("/assets/fonts/onest/onest-latin.woff2"), fontRequests.join());
		assert.ok(
			!fontRequests.some(p => /literata|cyrillic|vietnamese/.test(p)),
			`only what the page uses: ${fontRequests}`,
		);
		const preloads = await page.$$eval('link[rel="preload"][as="font"]', els =>
			els.map(el => [new URL(el.href).pathname, el.crossOrigin]),
		);
		// Pacifico too, with the GEEKly wordmark: the "ly" is on the first screen of every page
		assert.deepEqual(preloads, [
			["/assets/fonts/onest/onest-latin.woff2", "anonymous"],
			["/assets/fonts/pacifico/pacifico-ly.woff2", "anonymous"],
		]);
		const faces = await page.evaluate(() =>
			[...document.styleSheets]
				.flatMap(sheet => [...sheet.cssRules])
				.filter(rule => rule instanceof CSSFontFaceRule)
				.map(rule => ({
					family: rule.style.getPropertyValue("font-family").replaceAll('"', ""),
					display: rule.style.getPropertyValue("font-display"),
					src: rule.style.getPropertyValue("src"),
					range: rule.style.getPropertyValue("unicode-range"),
				})),
		);
		const onest = faces.filter(f => f.family === "Onest");
		assert.equal(onest.length, 5, "latin, latin-ext, cyrillic, cyrillic-ext, vietnamese");
		for (const face of onest) {
			assert.equal(face.display, "swap");
			assert.match(face.src, /\/assets\/fonts\/onest\/onest-[a-z-]+\.woff2/);
			assert.ok(face.range, "each subset has its unicode-range");
		}
		assert.ok(faces.some(f => f.family === "Onest Fallback" && /local\("Arial"\)/.test(f.src)));
		assert.ok(!faces.some(f => f.family === "Literata"), "Literata only on posts and pages");
		assert.equal(await page.evaluate(() => document.fonts.check('16px "Onest"')), true);
		// The wordmark's Pacifico: only its two letters
		const pacifico = faces.find(f => f.family.replaceAll("'", "") === "Pacifico");
		assert.match(pacifico.src, /pacifico-ly\.woff2/);
		assert.match(pacifico.range, /U\+6C, U\+79/i);
		assert.ok(fontRequests.includes("/assets/fonts/pacifico/pacifico-ly.woff2"), fontRequests.join());
		assert.equal(
			fontRequests.filter(p => p.includes("pacifico")).length,
			1,
			`the preloaded file is the one the wordmark uses: ${fontRequests}`,
		);
		await dispose();
	});

	it("do not preload Pacifico without the GEEKly wordmark", async () => {
		const { page, requests, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, use_geekly_logo: false } }),
		});
		await page.evaluate(() => document.fonts.ready);
		const preloads = await page.$$eval('link[rel="preload"][as="font"]', els =>
			els.map(el => new URL(el.href).pathname),
		);
		assert.deepEqual(preloads, ["/assets/fonts/onest/onest-latin.woff2"]);
		assert.ok(!requests.some(url => url.includes("pacifico")), "Pacifico is not downloaded");
		await dispose();
	});

	it("preload Literata on wide screens only: on phones the article's picture is asked for first", async () => {
		for (const [viewport, pictureFirst] of [
			[{ width: 390, height: 844 }, true],
			[{ width: 1280, height: 800 }, false],
		]) {
			const { page, requests, dispose } = await open({ render: article(), viewport });
			await page.evaluate(() => document.fonts.ready);
			const font = requests.findIndex(url => url.includes("/literata/literata-latin.woff2"));
			const picture = requests.findIndex(url => url.includes("photo.svg"));
			assert.ok(font >= 0 && picture >= 0, requests.join("\n"));
			assert.equal(picture < font, pictureFirst, `at ${viewport.width}px: ${requests.join("\n")}`);
			await dispose();
		}
	});

	it("load Literata from the theme on posts, roman preloaded, italic only when the text has some", async () => {
		const { page, requests, dispose } = await open({ render: article() });
		await page.evaluate(() => document.fonts.ready);
		const preloads = await page.$$eval('link[rel="preload"][as="font"]', els =>
			els.map(el => new URL(el.href).pathname),
		);
		assert.deepEqual(preloads, [
			"/assets/fonts/onest/onest-latin.woff2",
			"/assets/fonts/literata/literata-latin.woff2",
			"/assets/fonts/pacifico/pacifico-ly.woff2",
		]);
		const fonts = requests.filter(url => url.endsWith(".woff2")).map(url => new URL(url).pathname);
		assert.ok(fonts.includes("/assets/fonts/literata/literata-latin.woff2"), fonts.join());
		assert.ok(!fonts.some(p => p.includes("italic")), "no italic in this text");
		assert.equal(new Set(fonts).size, fonts.length, `each file once (the preload is reused): ${fonts}`);
		assert.ok(!requests.some(url => /fonts\.(googleapis|gstatic)\.com/.test(url)));
		await dispose();
	});

	it("download another script subset only for its own letters (œ stays in latin, Š needs latin-ext)", async () => {
		const files = async html => {
			const { page, requests, dispose } = await open({ render: article({ html }) });
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(200);
			const list = requests.filter(url => url.endsWith(".woff2")).map(url => new URL(url).pathname.split("/").pop());
			await dispose();
			return list;
		};
		const french = await files("<p>Le cœur de l’œuvre, « en bref ».</p>");
		assert.ok(!french.some(f => /ext|cyrillic/.test(f)), french.join());
		const lithuanian = await files("<p>Švitrigailos g. 34, Vilnius</p>");
		assert.ok(lithuanian.includes("literata-latin-ext.woff2"), lithuanian.join());
		const russian = await files("<p>Привет, мир</p>");
		assert.ok(russian.includes("literata-cyrillic.woff2"), russian.join());
	});

	it("keep in Literata the optical sizes the article uses, and not many more (opsz follows the size in px)", async () => {
		const sizes = await literataSizes();
		for (const [style, files] of [
			["roman", ["literata/literata-latin.woff2", "literata/literata-cyrillic.woff2"]],
			["italic", ["literata/literata-italic-latin.woff2", "literata/literata-italic-vietnamese.woff2"]],
		]) {
			const used = [...sizes[style]].sort((a, b) => a - b);
			// the three text sizes of the settings are all there, or this test measures nothing
			for (const px of [17, 19, 21]) assert.ok(used.includes(px), `${style} text at ${px}px in ${used}`);
			for (const file of files) {
				const { opsz } = axesOf(file);
				assert.ok(opsz, `${file} keeps an optical size axis`);
				assert.ok(
					used[0] >= opsz[0] && used.at(-1) <= opsz[2],
					`${style} sizes ${used} are not all inside the opsz ${opsz[0]}–${opsz[2]} kept in ${file}: ` +
						"widen LITERATA_OPSZ in src/fonts/build-fonts.py and run it again",
				);
				// and not far beyond: a wider range is bytes the reader downloads for nothing
				assert.ok(opsz[0] >= used[0] - 4 && opsz[2] <= used.at(-1) + 10, `${file} opsz ${opsz} for sizes ${used}`);
			}
		}
		assert.deepEqual(axesOf("literata/literata-latin.woff2").wght, [400, 400, 650]);
		assert.equal(axesOf("literata/literata-italic-latin.woff2").wght, undefined, "italic: weight 400 only");
	});

	it("keep the Literata files light: latin under 56 KB (roman) and 34 KB (italic), all ten under 250 KB", () => {
		assert.ok(sizeOf("literata/literata-latin.woff2") < 56 * 1000, sizeOf("literata/literata-latin.woff2"));
		assert.ok(
			sizeOf("literata/literata-italic-latin.woff2") < 34 * 1000,
			sizeOf("literata/literata-italic-latin.woff2"),
		);
		assert.equal(LITERATA_FILES.length, 10);
		const total = LITERATA_FILES.reduce((sum, file) => sum + sizeOf(file), 0);
		assert.ok(total < 250 * 1000, `all ten Literata files: ${total} bytes`);
	});
});
