// The home hero's veil (src/css/home/hero.css « The shade over the picture », src/js/hero-veil.js): an
// even veil and two wide ramps towards the text, dosed per slide from Ghost's 100px rendition of the
// picture; the CSS defaults without JavaScript or with an unreadable picture; the text's contrast; no
// shadow on the letters; the new sizes (docking, 320px).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home } from "./support/pages.js";

const BRIGHT = "/content/images/hero-bright.png";
const DARK = "/content/images/hero-dark.png";

// Featured posts: the first on a bright picture, the second on a dark one, the others on `rest`
const pictures = (rest = BRIGHT) => {
	let n = 0;
	return post => (post.featured ? [BRIGHT, DARK][n++] || rest : `/src/tests/fixtures/photo.svg?${n}`);
};

// The veil's values set on each slide by the script (null when it set none)
const slideValues = page =>
	page.evaluate(() =>
		[...document.querySelectorAll("[data-hero-slide]")].map(slide => ({
			src: slide.querySelector(".hero__image")?.getAttribute("src") || "",
			veil: slide.style.getPropertyValue("--hero-veil") || null,
			a: slide.style.getPropertyValue("--hero-ramp-a") || null,
			b: slide.style.getPropertyValue("--hero-ramp-b") || null,
		})),
	);

describe("home hero veil", () => {
	before(launch);
	after(close);

	it("doses the veil per slide from the picture: more over a bright one than over a dark one", async () => {
		const { page, requests, dispose } = await open({
			render: home({ site: { image: pictures() } }),
			viewport: { width: 1440, height: 900 },
		});
		const values = await waitFor(
			async () => {
				const v = await slideValues(page);
				return v[0].veil && v[1].veil && v;
			},
			{ timeout: 6000 },
		);
		assert.ok(values, "the first two slides get their values (the second once readied in the background)");
		const [bright, dark] = values;
		assert.match(bright.src, /\/content\/images\/size\/w1000\/format\/webp\/hero-bright\.png$/);
		for (const v of [bright, dark]) {
			for (const key of ["veil", "a", "b"]) assert.ok(Number(v[key]) > 0 && Number(v[key]) <= 0.95, `${key} ${v[key]}`);
		}
		assert.ok(Number(bright.veil) > Number(dark.veil), `bright ${bright.veil} > dark ${dark.veil}`);
		assert.ok(Number(bright.a) > Number(dark.a) && Number(bright.b) > Number(dark.b), "and stronger ramps");
		// Read from the 100px rendition, not from the picture shown
		assert.ok(requests.some(url => url.endsWith("/content/images/size/w100/format/webp/hero-bright.png")));
		await dispose();
	});

	it("keeps the CSS defaults without JavaScript", async () => {
		const { page, dispose } = await open({
			render: home({ site: { image: pictures() } }),
			viewport: { width: 1440, height: 900 },
			javaScriptEnabled: false,
		});
		const scrim = await page.evaluate(() => {
			const slide = document.querySelector("[data-hero-slide]");
			const style = getComputedStyle(slide.querySelector(".hero__scrim"));
			return { inline: slide.getAttribute("style"), color: style.backgroundColor, image: style.backgroundImage };
		});
		assert.equal(scrim.inline, null);
		assert.match(scrim.color, / \/ 0\.34\)$/, "the even veil at 34 %");
		assert.match(scrim.image, /^linear-gradient.*linear-gradient/, "and the two ramps");
		await dispose();
	});

	it("keeps the CSS defaults when the picture cannot be read (another origin), without an error", async () => {
		const { page, errors, dispose } = await open({
			render: home({ site: { image: pictures() } }),
			viewport: { width: 1440, height: 900 },
			// A tainted canvas: reading its pixels throws, as for a picture from another origin
			initScript: () => {
				CanvasRenderingContext2D.prototype.getImageData = () => {
					throw new DOMException("The canvas has been tainted by cross-origin data.", "SecurityError");
				};
			},
		});
		await page.waitForTimeout(2500);
		const values = await slideValues(page);
		assert.deepEqual(
			values.map(v => v.veil),
			values.map(() => null),
			"no slide gets values",
		);
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("leaves pictures that are not Ghost's renditions alone", async () => {
		// The sample site's pictures are not under /content/images/ (like a cover from another site)
		const { page, requests, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		await page.waitForTimeout(2500);
		assert.deepEqual((await slideValues(page)).map(v => v.veil).filter(Boolean), []);
		assert.equal(requests.filter(url => url.includes("/size/w100/")).length, 0);
		await dispose();
	});

	// The hero's text that is not the logo stays at 4.5:1 at least over a bright (near-white) picture:
	// the brightest backdrop pixel under each text, with the texts hidden, against the text's colour
	for (const width of [1440, 390]) {
		it(`keeps the tagline and the post's text at 4.5:1 over a bright picture (${width}px)`, async () => {
			const { page, dispose } = await open({
				render: home({ site: { image: pictures(BRIGHT) } }),
				viewport: { width, height: 900 },
			});
			await waitFor(async () => (await slideValues(page))[0].veil, { timeout: 6000 });
			await page.waitForTimeout(400);
			const boxes = await page.evaluate(() => {
				const card = document.querySelector(".hero__card").getBoundingClientRect();
				const slide = document.querySelector("[data-hero-slide]");
				return Object.fromEntries(
					[
						["tagline", document.querySelector(".hero__tagline")],
						["title", slide.querySelector(".hero__post-title")],
						["excerpt", slide.querySelector(".hero__post-excerpt")],
						["meta", slide.querySelector(".hero__post-meta")],
					]
						.filter(([, el]) => el && el.getClientRects().length)
						.map(([k, el]) => {
							const r = el.getBoundingClientRect();
							return [
								k,
								{ x: r.x - card.x, y: r.y - card.y, w: r.width, h: r.height, color: getComputedStyle(el).color },
							];
						})
						.concat([["card", { x: card.x, y: card.y, w: card.width, h: card.height }]]),
				);
			});
			await page.addStyleTag({
				content:
					".wordmark__letters, .hero__tagline, .hero__post > *, .hero__subscribe, .hero__pager { visibility: hidden !important; }",
			});
			const { card, ...texts } = boxes;
			const shot = await page.screenshot({ clip: { x: card.x, y: card.y, width: card.w, height: card.h } });
			const ratios = await page.evaluate(
				async ({ b64, texts }) => {
					const img = new Image();
					img.src = `data:image/png;base64,${b64}`;
					await img.decode();
					const canvas = new OffscreenCanvas(img.width, img.height);
					const context = canvas.getContext("2d");
					context.drawImage(img, 0, 0);
					const lin = v => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
					const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
					const out = {};
					for (const [k, t] of Object.entries(texts)) {
						const d = context.getImageData(Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h)).data;
						let max = 0;
						for (let i = 0; i < d.length; i += 4) max = Math.max(max, L(d[i], d[i + 1], d[i + 2]));
						const [r, g, b] = t.color.match(/[\d.]+/g).map(Number);
						out[k] = (L(r, g, b) + 0.05) / (max + 0.05);
					}
					return out;
				},
				{ b64: shot.toString("base64"), texts },
			);
			for (const [k, ratio] of Object.entries(ratios))
				assert.ok(ratio >= 4.5, `${k}: ${ratio.toFixed(2)}:1 at ${width}px`);
			await dispose();
		});
	}

	it("draws no shadow on the wordmark nor on the tagline", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		const shadows = await page.evaluate(() =>
			[".wordmark--hero", ".wordmark--hero .wordmark__g", ".wordmark--hero .wordmark__script", ".hero__tagline"].map(
				s => [
					s,
					getComputedStyle(document.querySelector(s)).textShadow,
					getComputedStyle(document.querySelector(s)).filter,
				],
			),
		);
		for (const [s, shadow, filter] of shadows) {
			assert.equal(shadow, "none", `${s} text-shadow`);
			assert.equal(filter, "none", `${s} filter`);
		}
		await dispose();
	});

	// The docking flight starts exactly on the hero wordmark at its new size
	for (const width of [1440, 390]) {
		it(`starts the docking flight on the hero wordmark (${width}px)`, async () => {
			const { page, dispose } = await open({
				viewport: { width, height: 900 },
				isMobile: width < 600,
				hasTouch: width < 600,
			});
			await page.waitForTimeout(300);
			const result = await page.evaluate(
				() =>
					new Promise(resolve => {
						const box = e => {
							const r = e.getBoundingClientRect();
							return { left: r.left, width: r.width };
						};
						const hero = document.querySelector("#hero-wordmark .wordmark__letters");
						const header = document.getElementById("site-header");
						const logo = header.querySelector("[data-header-logo] .wordmark__letters");
						let before = null;
						const tick = () => {
							if (header.hasAttribute("data-dock-flight")) return resolve({ before, first: box(logo) });
							if (header.getAttribute("data-dock") === "docked") return resolve({ before, first: null });
							before = box(hero);
							window.scrollBy(0, 4);
							requestAnimationFrame(tick);
						};
						requestAnimationFrame(tick);
					}),
			);
			assert.ok(result.first, "the logo flies");
			assert.ok(
				Math.abs(result.first.left - result.before.left) < 1,
				`left ${result.first.left} vs ${result.before.left}`,
			);
			assert.ok(
				Math.abs(result.first.width - result.before.width) < 1,
				`width ${result.first.width} vs ${result.before.width}`,
			);
			await dispose();
		});
	}

	it("still fits at 320px: the lockup, the button and the post inside the card, in order, no overflow", async () => {
		const { page, dispose } = await open({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
		const m = await page.evaluate(() => {
			const r = s => document.querySelector(s).getBoundingClientRect();
			const lines = document.createRange();
			lines.selectNodeContents(document.querySelector(".hero__tagline"));
			return {
				scroll: document.documentElement.scrollWidth,
				card: r(".hero__card").toJSON(),
				letters: r(".hero__brand .wordmark__letters").toJSON(),
				tagline: r(".hero__tagline").toJSON(),
				taglineLines: new Set([...lines.getClientRects()].map(x => Math.round(x.top))).size,
				button: r(".hero__brand .hero__subscribe").toJSON(),
				post: r("[data-hero-slide] .hero__post").toJSON(),
				pager: r("[data-hero-pager]").toJSON(),
			};
		});
		assert.equal(m.scroll, 320, "no horizontal scroll");
		for (const k of ["letters", "tagline", "button", "post"]) {
			assert.ok(m[k].left >= m.card.left && m[k].right <= m.card.right, `${k} inside the card`);
		}
		assert.equal(m.taglineLines, 1, "the tagline on one line");
		assert.ok(m.button.bottom <= m.post.top, "the button above the post");
		assert.ok(m.post.bottom <= m.pager.top + 1, "the post above the pager");
		assert.ok(m.pager.bottom <= m.card.bottom, "the pager inside the card");
		await dispose();
	});
});
