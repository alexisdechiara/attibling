import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, paged, template } from "./support/pages.js";

const INTRO = { use_geekly_logo: true, arrival_animation: true };

const introState = page =>
	page.evaluate(() => {
		const layer = document.querySelector("[data-intro-layer]");
		return {
			attribute: document.documentElement.getAttribute("data-intro"),
			layer: layer ? getComputedStyle(layer).display : null,
			title: getComputedStyle(document.querySelector(".hero__title")).opacity,
		};
	});

// Layout shifts reported by the browser since the page started loading
const shifts = page =>
	page.evaluate(
		() =>
			new Promise(resolve => {
				let total = 0;
				new PerformanceObserver(list => list.getEntries().forEach(entry => (total += entry.value))).observe({
					type: "layout-shift",
					buffered: true,
				});
				setTimeout(() => resolve(total), 50);
			}),
	);

describe("arrival animation", () => {
	before(launch);
	after(close);

	it("plays over the page on the first visit of the home, then leaves no trace", async () => {
		const { page, errors, dispose } = await open({
			render: home({ custom: INTRO }),
			viewport: { width: 1440, height: 900 },
		});
		let state = await introState(page);
		assert.equal(state.attribute, "play", "started before the first paint");
		assert.equal(state.layer, "block");
		assert.equal(Number(state.title), 0, "the hero wordmark waits for the mark to land");
		assert.equal(
			await page.evaluate(() => document.querySelector("[data-intro-layer]").getAttribute("aria-hidden")),
			"true",
		);
		// The content is in the page underneath the whole time
		assert.equal(await page.locator("main h1#hero-title").count(), 1);
		assert.ok((await page.locator("main [data-post-tile], main .row-item").count()) > 5);

		state = await waitFor(
			async () => {
				const s = await introState(page);
				return s.attribute === null && s;
			},
			{ timeout: 4000 },
		);
		assert.ok(state, "over after about 2 s");
		assert.deepEqual(state, { attribute: null, layer: "none", title: "1" });
		assert.equal(await shifts(page), 0, "no layout shift");
		assert.equal(
			await page.evaluate(() => sessionStorage.getItem("attibling-intro")),
			"1",
			"remembered for the session",
		);
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("lands the mark exactly on the hero wordmark", async () => {
		for (const width of [390, 1440]) {
			const { page, dispose } = await open({ render: home({ custom: INTRO }), viewport: { width, height: 900 } });
			await page.evaluate(() => document.fonts.ready);
			const gap = await page.evaluate(() => {
				// The end of the animation, frozen
				document
					.getAnimations()
					.filter(animation => animation.timeline === document.timeline)
					.forEach(animation => {
						animation.pause();
						animation.currentTime = 1949;
					});
				const letters = document.querySelector("#hero-wordmark .wordmark__letters");
				const unit = parseFloat(getComputedStyle(letters).fontSize) / 1000;
				// The SVG's origin (font units, viewBox from x = -20, 3560 wide) on the start of the hero's G
				const svg = document.querySelector(".intro__svg").getBoundingClientRect();
				const g = document.querySelector("#hero-wordmark .wordmark__g").getBoundingClientRect();
				return {
					set: Boolean(document.querySelector("[data-intro-mark]").style.getPropertyValue("--intro-to")),
					x: Math.abs(svg.left + (20 * svg.width) / 3560 - g.left),
					size: Math.abs(svg.width / 3560 - unit) * 1000,
				};
			});
			assert.equal(gap.set, true, `measured at ${width}px`);
			assert.ok(gap.x < 1 && gap.size < 0.5, `on the hero letters at ${width}px: ${JSON.stringify(gap)}`);
			await dispose();
		}
	});

	it("plays once per session", async () => {
		const { page, dispose } = await open({ render: home({ custom: INTRO }) });
		assert.equal((await introState(page)).attribute, "play");
		await page.reload({ waitUntil: "load" });
		assert.deepEqual(await introState(page), { attribute: null, layer: "none", title: "1" });
		await dispose();
	});

	for (const [name, act] of [
		["a key", page => page.keyboard.press("Tab")],
		["a click", page => page.mouse.click(600, 400)],
		["the wheel", page => page.mouse.wheel(0, 200)],
	]) {
		it(`ends at once on ${name}`, async () => {
			const { page, dispose } = await open({ render: home({ custom: INTRO }) });
			await sleep(200);
			await act(page);
			assert.ok(
				await waitFor(async () => (await introState(page)).title === "1", { timeout: 300 }),
				"the hero shows straight away",
			);
			const state = await waitFor(
				async () => {
					const s = await introState(page);
					return s.attribute === null && s;
				},
				{ timeout: 600 },
			);
			assert.ok(state, "gone within a few frames");
			assert.equal(state.layer, "none");
			await dispose();
		});
	}

	it("never plays with reduced motion", async () => {
		const { page, dispose } = await open({ render: home({ custom: INTRO }), reducedMotion: "reduce" });
		assert.deepEqual(await introState(page), { attribute: null, layer: "none", title: "1" });
		assert.equal(await page.evaluate(() => sessionStorage.getItem("attibling-intro")), null);
		await dispose();
	});

	it("never plays on other pages, nor when the setting is off", async () => {
		for (const render of [paged(2, { custom: INTRO }), template("post", { custom: INTRO })]) {
			const { page, dispose } = await open({ render });
			assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-intro")), null);
			assert.equal(await page.locator("[data-intro-layer]").count(), 0, render.template);
			await dispose();
		}
		const off = await open({ render: home({ custom: { use_geekly_logo: true, arrival_animation: false } }) });
		assert.equal(await off.page.evaluate(() => document.documentElement.getAttribute("data-intro")), null);
		assert.equal(await off.page.locator("[data-intro-layer]").count(), 0);
		await off.dispose();
	});

	it("is a short fade of the hero logo without the GEEKly wordmark", async () => {
		const { page, dispose } = await open({ render: home({ custom: { arrival_animation: true } }) });
		assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-intro")), "sober");
		assert.equal(await page.locator("[data-intro-layer]").count(), 0, "no dark screen");
		const animated = await page.evaluate(() =>
			document
				.querySelector(".hero__title")
				.getAnimations()
				.map(a => a.animationName),
		);
		assert.deepEqual(animated, ["intro-sober"]);
		await dispose();
	});
});

describe("wordmark docking travel", () => {
	before(launch);
	after(close);

	const travel = page =>
		page.evaluate(() => {
			const header = document.getElementById("site-header");
			const mark = header.querySelector("[data-header-logo] .wordmark");
			const style = getComputedStyle(mark);
			return {
				travel: header.hasAttribute("data-dock-travel"),
				dock: header.dataset.dock,
				scale: new DOMMatrix(style.transform).a,
				opacity: Number(style.opacity),
				hero: Number(getComputedStyle(document.getElementById("hero-wordmark")).opacity),
			};
		});

	it("starts as the hero wordmark and ends in the header's place", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		await page.evaluate(() => document.fonts.ready);
		let state = await travel(page);
		assert.equal(state.travel, true);
		const ratio = await page.evaluate(
			() =>
				document.getElementById("hero-wordmark").getBoundingClientRect().width /
				document.querySelector("[data-header-logo] .wordmark").getBoundingClientRect().width,
		);
		assert.ok(state.scale > 3, "at the top it has the hero's size");
		assert.ok(Math.abs(ratio - 1) < 0.05, `and the hero's width (${ratio})`);
		assert.equal(state.dock, "undocked");

		await page.evaluate(() => window.scrollTo(0, 700));
		state = await waitFor(async () => {
			const s = await travel(page);
			return s.dock === "docked" && s;
		});
		assert.deepEqual(
			{ ...state, scale: Math.round(state.scale * 100) / 100 },
			{ travel: true, dock: "docked", scale: 1, opacity: 1, hero: 0 },
			"docked: the logo at rest in the header, the hero wordmark faded out",
		);
		await dispose();
	});

	it("keeps the plain fade with reduced motion", async () => {
		const { page, dispose } = await open({ reducedMotion: "reduce" });
		assert.equal((await travel(page)).travel, false);
		await dispose();
	});
});

describe("page transitions", () => {
	before(launch);
	after(close);

	// Every element carrying a view-transition-name, by name
	const names = page =>
		page.evaluate(() => {
			const found = {};
			for (const element of document.querySelectorAll("body *")) {
				const name = getComputedStyle(element).viewTransitionName;
				if (name && name !== "none") (found[name] ||= []).push(element.className || element.tagName);
			}
			return found;
		});

	it("names each element once per page", async () => {
		for (const render of [home(), template("post"), template("tag"), paged(2)]) {
			const { page, dispose } = await open({ render, viewport: { width: 1440, height: 900 } });
			const found = await names(page);
			for (const [name, elements] of Object.entries(found)) {
				assert.equal(elements.length, 1, `${render.template}: ${name} on ${elements.join(", ")}`);
			}
			assert.ok(found["vt-header"] && found["vt-logo"], render.template);
			if (render.template === "post") assert.ok(found["vt-media"], "the article picture");
			if (render.template === "tag") assert.ok(found["vt-tag"], "the tag header");
			if (render.template !== "post") assert.equal(found["vt-media"], undefined, "no tile is named before a click");
			await dispose();
		}
	});

	it("hands the logo from the hero to the header once docked", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		assert.match((await names(page))["vt-logo"][0], /wordmark--hero/);
		await page.evaluate(() => window.scrollTo(0, 700));
		await waitFor(() => page.evaluate(() => document.getElementById("site-header").dataset.dock === "docked"));
		assert.match((await names(page))["vt-logo"][0], /site-header__logo/);
		await dispose();
	});

	it("moves the followed tile's picture into the article header", async () => {
		const custom = { use_geekly_logo: true, page_transitions: true };
		const { page, dispose } = await open({
			render: home({ custom }),
			pages: { "*": template("post", { custom }) },
			viewport: { width: 1440, height: 900 },
		});
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("view-transition-name")),
			"root",
		);
		await page.context().addInitScript(() => {
			window.addEventListener("pagereveal", event => {
				window.__reveal = { transition: Boolean(event.viewTransition), pseudo: [] };
				event.viewTransition?.ready.then(() => {
					window.__reveal.pseudo = document
						.getAnimations()
						.map(a => a.effect.pseudoElement)
						.filter(Boolean);
				});
			});
		});
		await Promise.all([
			page.waitForURL(url => !url.pathname.startsWith("/__render")),
			page.click(".shelf .tile__link"),
		]);
		const reveal = await waitFor(() => page.evaluate(() => window.__reveal?.pseudo.length && window.__reveal));
		assert.ok(reveal?.transition, "the browser animates the change of page");
		assert.ok(reveal.pseudo.includes("::view-transition-old(vt-media)"), "from the tile's picture");
		assert.ok(reveal.pseudo.includes("::view-transition-new(vt-media)"), "to the article's picture");
		await dispose();
	});

	it("is off with reduced motion and without the setting", async () => {
		for (const [custom, reducedMotion] of [
			[{ page_transitions: true }, "reduce"],
			[{ page_transitions: false }, "no-preference"],
		]) {
			const { page, dispose } = await open({ render: home({ custom }), reducedMotion });
			const rule = await page.evaluate(() =>
				[...document.styleSheets].some(sheet => {
					try {
						return [...sheet.cssRules].some(
							rule =>
								rule.cssText.includes("@view-transition") && (!rule.media || matchMedia(rule.media.mediaText).matches),
						);
					} catch {
						return false;
					}
				}),
			);
			assert.equal(rule, false, JSON.stringify(custom) + " " + reducedMotion);
			await dispose();
		}
	});
});

describe("prefetch", () => {
	before(launch);
	after(close);

	const rules = page =>
		page.evaluate(() => {
			const script = document.querySelector('script[type="speculationrules"]');
			return script && JSON.parse(script.textContent);
		});

	it("asks the browser to prefetch the site's pages on intent", async () => {
		const { page, dispose } = await open();
		const json = await rules(page);
		assert.ok(json, "a speculationrules script");
		const [rule] = json.prefetch;
		assert.equal(rule.eagerness, "moderate");
		assert.equal(rule.where.and[0].href_matches, "/*", "same site only");
		const exclude = rule.where.and[1].not.selector_matches;
		// Every exclusion is a valid selector and matches what it must
		const verdicts = await page.evaluate(selector => {
			const test = html => {
				const box = document.createElement("div");
				box.innerHTML = html;
				return box.firstElementChild.matches(selector);
			};
			return {
				admin: test('<a href="/ghost/#/posts">'),
				members: test('<a href="/members/?token=x">'),
				portal: test('<a href="#/portal/account" data-portal="account">'),
				signout: test('<a href="javascript:" data-members-signout>'),
				unsubscribe: test('<a href="/unsubscribe/?uuid=1">'),
				query: test('<a href="/archives/?tag=x">'),
				file: test('<a href="/content/files/a.pdf">'),
				external: test('<a href="/x/" target="_blank">'),
				marked: test('<a href="/x/" data-no-prefetch>'),
				post: test('<a href="/un-article/">'),
				tag: test('<a href="/tag/jeux-video/">'),
			};
		}, exclude);
		assert.deepEqual(verdicts, {
			admin: true,
			members: true,
			portal: true,
			signout: true,
			unsubscribe: true,
			query: true,
			file: true,
			external: true,
			marked: true,
			post: false,
			tag: false,
		});
		await dispose();
	});

	it("does nothing with Save-Data or a slow connection", async () => {
		for (const connection of [
			{ saveData: true, effectiveType: "4g" },
			{ saveData: false, effectiveType: "2g" },
		]) {
			const { page, dispose } = await open({
				initScript: `Object.defineProperty(navigator, "connection", { value: ${JSON.stringify(connection)} });`,
			});
			assert.equal(await rules(page), null, JSON.stringify(connection));
			await dispose();
		}
	});

	it("falls back to <link rel=prefetch> where Speculation Rules are missing", async () => {
		const { page, dispose } = await open({
			initScript: "HTMLScriptElement.supports = () => false;",
			viewport: { width: 1440, height: 900 },
		});
		assert.equal(await rules(page), null);
		const hints = () => page.evaluate(() => [...document.querySelectorAll('link[rel="prefetch"]')].map(l => l.href));
		await page.locator(".row-item").first().focus();
		await page.locator("[data-promo] a[data-portal]").first().focus();
		await page.locator(".tag-tile").first().hover();
		await sleep(150);
		const href = await page.locator(".row-item").first().getAttribute("href");
		const tag = await page.locator(".tag-tile").first().getAttribute("href");
		assert.deepEqual(
			(await hints()).map(h => new URL(h).pathname),
			[href, tag],
			"the focused post and the hovered tag, not the Portal link",
		);
		await dispose();
	});
});
