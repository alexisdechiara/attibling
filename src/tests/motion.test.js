import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, paged, template } from "./support/pages.js";

const INTRO = { use_geekly_logo: true, arrival_animation: true };

const introAttribute = page => page.evaluate(() => document.documentElement.getAttribute("data-intro"));
const introFlag = page => page.evaluate(() => localStorage.getItem("attibling-intro"));

// The arrival animation's CSS animations running in the page (intro-*): [animation name, properties its keyframes change]
const running = page =>
	page.evaluate(() =>
		document
			.getAnimations()
			.filter(animation => animation.animationName?.startsWith("intro-"))
			.map(animation => [
				animation.animationName,
				[
					...new Set(
						animation.effect
							.getKeyframes()
							.flatMap(frame =>
								Object.keys(frame).filter(key => !["offset", "computedOffset", "easing", "composite"].includes(key)),
							),
					),
				].sort(),
			]),
	);

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

// The intro's own timer and its CSS animations held: the page stays « mid-intro » however slow the test is
const HOLD = () => {
	const timeout = window.setTimeout;
	window.setTimeout = (fn, delay, ...rest) => timeout(fn, delay === 900 ? 600000 : delay, ...rest);
	document.addEventListener("DOMContentLoaded", () => {
		const style = document.createElement("style");
		style.textContent = ":root[data-intro] * { animation-play-state: paused !important; }";
		document.head.append(style);
	});
};

describe("arrival animation", () => {
	before(launch);
	after(close);

	it("plays on the hero wordmark over the page already shown, then leaves no trace but its flag", async () => {
		const { page, errors, dispose } = await open({
			render: home({ custom: INTRO }),
			viewport: { width: 1440, height: 900 },
		});
		assert.equal(await introAttribute(page), "play", "started before the first paint");
		assert.equal(await introFlag(page), "1", "remembered in localStorage");
		assert.equal(await page.evaluate(() => sessionStorage.getItem("attibling-intro")), null, "not per session");
		// No layer: the page is there and reachable from the first frame
		assert.equal(await page.locator("[data-intro-layer], .intro").count(), 0);
		assert.equal(await page.locator("main h1#hero-title").count(), 1);
		assert.ok((await page.locator("main [data-post-tile], main .row-item").count()) > 5);

		const over = await waitFor(async () => (await introAttribute(page)) === null, { timeout: 4000 });
		assert.ok(over, "over after about a second");
		assert.deepEqual(await running(page), [], "nothing left running");
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector("#hero-wordmark .wordmark__g")).opacity),
			"1",
		);
		assert.equal(await shifts(page), 0, "no layout shift");
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("animates nothing but opacity and transform, on the wordmark's letters, in under a second", async () => {
		const { page, dispose } = await open({
			render: home({ custom: INTRO }),
			initScript: HOLD,
			viewport: { width: 1440, height: 900 },
		});
		assert.equal(await introAttribute(page), "play");
		const animations = await running(page);
		assert.deepEqual(
			animations.map(([name]) => name).sort(),
			["intro-letter", "intro-letter", "intro-letter", "intro-letter", "intro-script", "intro-settle"],
			"G, E, E, K, « ly », and the wordmark settling",
		);
		const allowed = ["opacity", "transform", "translate", "scale", "rotate"];
		for (const [name, properties] of animations) {
			assert.ok(properties.length > 0, name);
			for (const property of properties) assert.ok(allowed.includes(property), `${name} animates ${property}`);
		}
		const facts = await page.evaluate(() => {
			const intro = document.getAnimations().filter(animation => animation.animationName?.startsWith("intro-"));
			const wordmark = document.getElementById("hero-wordmark");
			const costly = [];
			const moving = wordmark.querySelectorAll(".wordmark__letters, .wordmark__letters *");
			for (const element of [document.querySelector(".hero__title"), wordmark, ...moving]) {
				const style = getComputedStyle(element);
				for (const property of ["backdropFilter", "filter", "maskImage", "clipPath", "mixBlendMode"]) {
					if (!["none", "normal"].includes(style[property]))
						costly.push([element.className, property, style[property]]);
				}
			}
			// What is over the middle of the hero picture: the hero itself, no layer of the animation
			const picture = document.querySelector("[data-hero] img").getBoundingClientRect();
			const top = document.elementFromPoint(picture.left + picture.width / 2, picture.top + picture.height / 2);
			return {
				end: Math.max(...intro.map(animation => animation.effect.getComputedTiming().endTime)),
				targets: intro.every(animation => animation.effect.target.closest("#hero-wordmark")),
				costly,
				registered: [...document.styleSheets].flatMap(sheet => {
					try {
						return [...sheet.cssRules]
							.filter(rule => rule.constructor.name === "CSSPropertyRule")
							.map(rule => rule.name);
					} catch {
						return [];
					}
				}),
				overHero: Boolean(top?.closest("[data-hero]")),
				picture: getComputedStyle(document.querySelector("[data-hero] img")).opacity,
			};
		});
		assert.ok(facts.end <= 1000, `over in ${facts.end} ms`);
		assert.equal(facts.targets, true, "only the hero wordmark moves");
		assert.deepEqual(facts.costly, [], "no filter, backdrop-filter, mask, clip or blend on what moves");
		assert.deepEqual(
			facts.registered.filter(name => name.startsWith("--intro")),
			[],
			"no registered custom property is animated",
		);
		assert.equal(facts.overHero, true, "nothing covers the hero");
		assert.equal(facts.picture, "1", "the hero picture (LCP) is shown from the start");
		await dispose();
	});

	it("leaves the wordmark exactly where it is without the animation", async () => {
		const boxes = async custom => {
			const { page, dispose } = await open({ render: home({ custom }), viewport: { width: 1440, height: 900 } });
			await page.evaluate(() => document.fonts.ready);
			await waitFor(async () => (await introAttribute(page)) === null, { timeout: 4000 });
			const found = await page.evaluate(() =>
				[...document.querySelectorAll("#hero-wordmark, #hero-wordmark span, .hero__tagline")].map(element => {
					const { x, y, width, height } = element.getBoundingClientRect();
					return [x, y, width, height].map(n => Math.round(n * 100) / 100);
				}),
			);
			await dispose();
			return found;
		};
		const played = await boxes(INTRO);
		assert.ok(played.length >= 7, "the wordmark, its letters and the tagline");
		assert.deepEqual(played, await boxes({ use_geekly_logo: true, arrival_animation: false }));
	});

	it("plays on the first visit only: never again once the browser remembers it", async () => {
		const { page, context, dispose } = await open({ render: home({ custom: INTRO }) });
		assert.equal(await introAttribute(page), "play");
		await page.reload({ waitUntil: "load" });
		assert.equal(await introAttribute(page), null, "not on a second load");
		assert.deepEqual(await running(page), []);
		// Nor in another tab, later: the flag is the browser's, not the tab's
		const tab = await context.newPage();
		await tab.goto(page.url(), { waitUntil: "load" });
		assert.equal(await introAttribute(tab), null, "not in a new tab");
		await dispose();
		// A returning reader
		const back = await open({ render: home({ custom: INTRO }), storage: { "attibling-intro": "1" } });
		assert.equal(await introAttribute(back.page), null);
		assert.deepEqual(await running(back.page), []);
		await back.dispose();
	});

	it("never plays where the browser cannot remember it (rather than on every page)", async () => {
		for (const broken of [
			() => {
				Storage.prototype.setItem = () => {
					throw new DOMException("full", "QuotaExceededError");
				};
			},
			() => {
				Object.defineProperty(window, "localStorage", {
					get() {
						throw new DOMException("denied", "SecurityError");
					},
				});
			},
		]) {
			const { page, dispose } = await open({ render: home({ custom: INTRO }), initScript: broken });
			assert.equal(await introAttribute(page), null);
			assert.deepEqual(await running(page), []);
			await page.reload({ waitUntil: "load" });
			assert.equal(await introAttribute(page), null);
			await dispose();
		}
	});

	it("is for an arrival on the site: not when coming to the home from another of its pages", async () => {
		const { page, dispose } = await open({
			render: template("post", { custom: INTRO }),
			pages: { "/": home({ custom: INTRO }) },
		});
		await Promise.all([page.waitForURL(url => url.pathname === "/"), page.evaluate(() => location.assign("/"))]);
		await page.waitForLoadState("load");
		assert.equal(await page.locator("#hero-wordmark").count(), 1, "on the home");
		assert.equal(await introAttribute(page), null);
		assert.equal(await introFlag(page), null, "kept for the reader's next arrival");
		await dispose();
	});

	// What the reader does reaches the page some time after Playwright sends it (under load, up to a second
	// later): the intro's own 900 ms timer is held, and the timing is read in the page. The animation ends
	// in the same task as the reader's event.
	const WATCH = () => {
		const timeout = window.setTimeout;
		window.setTimeout = (fn, delay, ...rest) => timeout(fn, delay === 900 ? 600000 : delay, ...rest);
		window.__intro = [];
		for (const type of ["keydown", "pointerdown", "wheel"])
			addEventListener(type, () => window.__intro.push([type, performance.now()]), true);
		new MutationObserver(() =>
			window.__intro.push([document.documentElement.getAttribute("data-intro"), performance.now()]),
		).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-intro"] });
	};
	for (const [name, type, act] of [
		["a key", "keydown", page => page.keyboard.press("Tab")],
		["a click", "pointerdown", page => page.mouse.click(600, 400)],
		[
			"the wheel",
			"wheel",
			async page => {
				// Over the page, as a reader's wheel is
				await page.mouse.move(600, 400);
				await page.mouse.wheel(0, 200);
			},
		],
	]) {
		it(`ends at once on ${name}`, async () => {
			const { page, dispose } = await open({ render: home({ custom: INTRO }), initScript: WATCH });
			await sleep(200);
			assert.equal(await introAttribute(page), "play", "still playing before the reader acts");
			await act(page);
			assert.ok(await waitFor(async () => (await introAttribute(page)) === null, { timeout: 5000 }), "it ends");
			assert.deepEqual(await running(page), [], "the wordmark is in place");
			const log = await page.evaluate(() => window.__intro);
			const at = what => log.find(([w]) => w === what)?.[1];
			const trace = JSON.stringify(log);
			assert.ok(at(type) !== undefined && at(null) !== undefined, `the ${type} ends it: ${trace}`);
			assert.ok(at(null) - at(type) < 50, `over with the event: ${trace}`);
			await dispose();
		});
	}

	it("never plays with reduced motion", async () => {
		const { page, dispose } = await open({ render: home({ custom: INTRO }), reducedMotion: "reduce" });
		assert.equal(await introAttribute(page), null);
		assert.deepEqual(await running(page), []);
		assert.equal(await introFlag(page), null);
		// Even if the attribute were there (reduced motion turned on meanwhile), nothing moves
		await page.evaluate(() => document.documentElement.setAttribute("data-intro", "play"));
		assert.deepEqual(await running(page), []);
		await dispose();
	});

	it("never plays on other pages, nor when the setting is off", async () => {
		for (const render of [paged(2, { custom: INTRO }), template("post", { custom: INTRO })]) {
			const { page, dispose } = await open({ render });
			assert.equal(await introAttribute(page), null, render.template);
			assert.equal(await introFlag(page), null, render.template);
			await dispose();
		}
		const off = await open({ render: home({ custom: { use_geekly_logo: true, arrival_animation: false } }) });
		assert.equal(await introAttribute(off.page), null);
		assert.equal(await introFlag(off.page), null);
		assert.doesNotMatch(await off.page.content(), /attibling-intro/, "no script for it either");
		await off.dispose();
	});

	it("is a short fade of the hero logo without the GEEKly wordmark", async () => {
		const { page, dispose } = await open({ render: home({ custom: { arrival_animation: true } }), initScript: HOLD });
		assert.equal(await introAttribute(page), "sober");
		assert.deepEqual(await running(page), [["intro-sober", ["opacity", "transform"]]]);
		await dispose();
	});
});

// The docking itself (a triggered flight, not a scroll-driven travel): feedback.test.js

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
		await page.locator("main .row-item").first().focus();
		await page.locator("[data-promo] a[data-portal]").first().focus();
		await page.locator("main .tag-tile").first().hover();
		await sleep(150);
		const href = await page.locator("main .row-item").first().getAttribute("href");
		const tag = await page.locator("main .tag-tile").first().getAttribute("href");
		assert.deepEqual(
			(await hints()).map(h => new URL(h).pathname),
			[href, tag],
			"the focused post and the hovered tag, not the Portal link",
		);
		await dispose();
	});
});
