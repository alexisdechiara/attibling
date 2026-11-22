import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { article } from "./support/article.js";
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

	// Lighthouse (phone): a font the first layout asks for is requested at the highest priority, before the
	// first paint, and counted against it (125 KB with the italic: 1 s of simulated FCP and LCP)
	it("on phones, ask for Literata once the first screen is painted; the text waits in its fallback face", async () => {
		const html = "<p>Un texte avec <em>de l’italique</em> dans le premier écran.</p>".repeat(30);
		const timeline = async viewport => {
			const { page, dispose } = await open({
				render: article({ html }),
				viewport,
				// Slow style sheets: the first paint comes late; a slow deferred script (as Ghost's Portal): the
				// page is still loading then
				slow: { "/assets/css/app.css": 600 },
				ghostDefer: { delay: 1500 },
				initScript: () => {
					window.__shift = 0;
					new PerformanceObserver(list => {
						for (const entry of list.getEntries()) window.__shift += entry.value;
					}).observe({ type: "layout-shift", buffered: true });
					// The face of the text at the first paint
					new PerformanceObserver((_, observer) => {
						observer.disconnect();
						window.__early = getComputedStyle(document.querySelector(".js-post-content p")).fontFamily;
					}).observe({ type: "paint", buffered: true });
				},
			});
			await page.evaluate(() => document.fonts.ready);
			const view = await page.evaluate(() => ({
				paint: performance.getEntriesByName("first-contentful-paint")[0].startTime,
				fonts: performance
					.getEntriesByType("resource")
					.filter(entry => entry.name.includes("/literata/"))
					.map(entry => [entry.name.split("/").pop().split("?")[0], entry.startTime]),
				early: window.__early,
				family: getComputedStyle(document.querySelector(".js-post-content p")).fontFamily,
				loaded: document.fonts.check('16px "Literata"') && document.fonts.check('italic 16px "Literata"'),
				waiting: document.documentElement.hasAttribute("data-font-wait"),
				shift: window.__shift,
			}));
			await dispose();
			return view;
		};
		const phone = await timeline({ width: 390, height: 844 });
		assert.deepEqual(phone.fonts.map(([name]) => name).sort(), ["literata-italic-latin.woff2", "literata-latin.woff2"]);
		for (const [name, start] of phone.fonts) {
			assert.ok(
				start >= phone.paint,
				`${name} requested at ${Math.round(start)} ms, first paint at ${Math.round(phone.paint)} ms`,
			);
		}
		assert.match(phone.family, /^Literata, "Literata Fallback"/, "then the text is in Literata");
		assert.equal(phone.loaded, true);
		assert.equal(phone.waiting, false);
		// The fallback face has Literata's metrics: the text barely moves when the font arrives
		assert.ok(phone.shift < 0.02, `layout shift ${phone.shift.toFixed(4)}`);
		// Wider screens: preloaded, there before the first paint, as before
		const wide = await timeline({ width: 1280, height: 800 });
		assert.match(wide.early, /^Literata, "Literata Fallback"/);
		const roman = wide.fonts.find(([name]) => name === "literata-latin.woff2");
		assert.ok(roman[1] < wide.paint, "preloaded on a wide screen");
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
});
