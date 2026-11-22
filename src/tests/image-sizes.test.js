// Lighthouse « Improve image delivery » / « Use responsive images »: the browser takes, from each srcset, the
// smallest rendition that covers the picture's box at the screen's density. The sizes attributes say how wide
// each box is (they copy the CSS: one test per kind of picture), and the renditions are close enough to one
// another (package.json image_sizes) for the smallest that covers not to be twice what is needed.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { launch, close, open, waitFor, REPO_ROOT } from "./support/harness.js";
import { home, template } from "./support/pages.js";
import { article } from "./support/article.js";

// The renditions the theme promises (the srcset lists take some of them), widest last
const LADDER = [220, 300, 400, 500, 600, 800, 1000, 1400, 2000];
const IMAGE_SIZES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).config.image_sizes;

// Lighthouse's desktop (1350 × 940, 1×) and mobile (412 × 823, 1.75×) screens
const DESKTOP = { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 };

const tagImage = tag => `/src/tests/fixtures/photo.svg?tag-${tag.slug}`;

// Every picture of each kind that the browser has chosen a rendition for: its box (CSS px), whether it covers
// the box (object-fit: cover), the ratio its markup gives (width and height attributes), the rendition's name
// (the test site's img_url writes &size=<name>) and its sizes attribute. The page is scrolled to the bottom first
// (loading="lazy"), then every kind is read at once. `shared`: another picture of the page has the same file, and
// Chrome may give a picture the rendition the other one has already loaded (a bigger one of its own srcset)
// instead of the one its box asks for.
const measure = async (page, kinds) => {
	await page.evaluate(async () => {
		for (let y = 0; y < document.body.scrollHeight; y += 300) {
			scrollTo(0, y);
			await new Promise(resolve => setTimeout(resolve, 40));
		}
		scrollTo(0, 0);
	});
	await page.waitForTimeout(300);
	return page.evaluate(
		kinds =>
			kinds.map(([kind, selector]) => ({
				kind,
				pictures: [...document.querySelectorAll(selector)]
					.filter(img => img.getBoundingClientRect().width && img.currentSrc)
					.slice(0, 12)
					.map(img => ({
						box: img.getBoundingClientRect().width,
						height: img.getBoundingClientRect().height,
						cover: getComputedStyle(img).objectFit === "cover",
						ratio: Number(img.getAttribute("width")) / Number(img.getAttribute("height")) || null,
						name: /[?&]size=(\w+)/.exec(img.currentSrc)?.[1],
						sizes: img.sizes,
						shared: [...document.images].some(other => other !== img && other.currentSrc === img.currentSrc),
					})),
			})),
		kinds,
	);
};

// The smallest rendition that covers box × density, and the one above it, which is as far as the browser may
// go (a sizes attribute a hair wide, a scrollbar). A picture that covers its box (object-fit: cover) must be as
// wide as the box, and wide enough for its height at the picture's ratio when the box is taller than that:
// max(width, height × ratio). A 193 × 324 cell with a 16:9 picture needs 576 px, not 193.
const wanted = (box, height, dpr, ratio = 16 / 9) => {
	const need = Math.max(box, height * ratio) * dpr;
	const i = LADDER.findIndex(width => width >= need * 0.995);
	return { need, smallest: LADDER[i] ?? LADDER.at(-1), most: LADDER[i + 1] ?? LADDER.at(-1) };
};

// [kind, selector, "desktop"] of each page's pictures ("desktop": hidden on a phone)
const HOME = [
	["hero", ".hero__image"],
	["collection banner", ".banner__image"],
	["collection banner's posts", ".banner__post-image", "desktop"],
	["lead of the latest posts", ".lead__image"],
	["compact rows", ".latest .row-item__image"],
	["most read tiles", ".top .tile__image"],
	["shelf tiles", ".row--shelf .tile__image"],
	["poster tiles", ".row--posters .tile__image"],
	["tag tiles", ".tag-tile__image"],
	["feature row: the large tile", ".feature-grid__lead .tile__image"],
	["feature row: the small tiles", ".feature-grid li:not(.feature-grid__lead) .tile__image"],
];
const TAG = [
	["tag header", ".listing-hero__image"],
	["tag page lead", ".listing-lead__image"],
	["tag page grid", ".post-grid .tile__image"],
];

// The « À propos » page with six rubrics, four of them with a picture
const aboutPage = () => {
	const tags = Array.from({ length: 6 }, (_, i) => ({
		id: `tag-r${i}`,
		name: `Rubrique ${i + 1}`,
		slug: `rubrique-${i + 1}`,
		visibility: "public",
		url: `/tag/rubrique-${i + 1}/`,
		description: "Ce que la rubrique raconte, en une phrase.",
		feature_image: i % 3 !== 2 ? `/src/tests/fixtures/photo.svg?r${i}` : null,
		count: { posts: 40 - i },
	}));
	const render = template("page-a-propos", {
		custom: { use_geekly_logo: true, about_tags: tags.map(t => t.slug).join(",") },
		post: { custom_excerpt: "Mon blog personnel.", html: "<p>Et comme c’est mon blog.</p>" },
	});
	render.site.tags = tags;
	return render;
};

describe("pictures: the smallest rendition that covers the box", () => {
	before(launch);
	after(close);

	it("package.json declares every rendition of the ladder", () => {
		for (const width of LADDER) {
			assert.ok(
				Object.values(IMAGE_SIZES).some(size => size.width === width),
				`image_sizes has a ${width} px entry`,
			);
		}
	});

	for (const [label, screen] of [
		["desktop 1350 px, 1×", DESKTOP],
		["phone 412 px, 1.75×", PHONE],
	]) {
		const check = async (render, allKinds, extra = {}) => {
			const kinds = allKinds.filter(([, , only]) => !only || screen === DESKTOP);
			const { page, dispose } = await open({ render, ...screen, ...extra });
			const bad = [];
			for (const { kind, pictures } of await measure(page, kinds)) {
				assert.ok(pictures.length > 0, `${kind}: a picture was loaded`);
				for (const { box, height, cover, ratio, name, sizes, shared } of pictures) {
					const rendition = IMAGE_SIZES[name]?.width;
					// A crop made by Ghost has its own ratio (the banner)
					const crop = IMAGE_SIZES[name]?.height ? IMAGE_SIZES[name].width / IMAGE_SIZES[name].height : null;
					const { need, smallest, most } = wanted(
						box,
						cover ? height : 0,
						screen.deviceScaleFactor,
						crop || ratio || 16 / 9,
					);
					// Not under-sampled by more than 3%, not more than one rung over the smallest that covers
					if (!rendition || rendition * 1.03 < need || (rendition > most && !shared && cover)) {
						bad.push(
							`${kind}: ${Math.round(box)} × ${Math.round(height)} px × ${screen.deviceScaleFactor} needs ${Math.round(need)} px, got ${rendition} (smallest ${smallest}), sizes="${sizes}"`,
						);
					}
				}
			}
			assert.deepEqual(bad, []);
			await dispose();
		};

		it(`home, ${label}`, () => check(home({ site: { tagImage } }), HOME));
		it(`tag page, ${label}`, () => check(template("tag", { site: { tagImage } }), TAG));
		it(`related posts, ${label}`, () => check(article(), [["related posts", ".article-related .tile__image"]]));
		it(`« À propos » rubrics, ${label}`, () => check(aboutPage(), [["rubrics", ".about-rubric__image"]]));
		// Desktop browsers draw classic scrollbars (Lighthouse's screen too: 15 px less than the viewport)
		it(`« Tags » cells, the large ones too, ${label}`, () =>
			check(template("page-tags", { site: { tagImage } }), [["tag cells", ".tag-cell__image"]], {
				classicScrollbars: screen === DESKTOP,
			}));
	}
});

describe("pictures: the thumbnails of the « ••• » panel", () => {
	before(launch);
	after(close);

	// The six recent posts in a row (194 px at most, 180 px here): not the 152 px of the compact rows beside the lead
	for (const [label, viewport, boxes] of [
		["1350 px", { width: 1350, height: 940 }, [180, 180]],
		["1100 px: three by row", { width: 1100, height: 900 }, [300, 305]],
	]) {
		it(`take the rendition of their box at ${label}, 1×`, async () => {
			const { page, dispose } = await open({ render: home({ site: { tagImage } }), viewport });
			await page.locator("[data-discover-button]").first().click();
			const images = page.locator(".discover .row-item__image");
			await waitFor(() => images.first().evaluate(el => el.currentSrc !== ""));
			const { box, name } = await images.first().evaluate(el => ({
				box: el.getBoundingClientRect().width,
				name: /[?&]size=(\w+)/.exec(el.currentSrc)?.[1],
			}));
			await dispose();
			assert.ok(box >= boxes[0] - 2 && box <= boxes[1] + 2, `${box} px wide`);
			const { smallest, most } = wanted(box, (box * 9) / 16, 1);
			assert.ok(
				IMAGE_SIZES[name].width >= smallest && IMAGE_SIZES[name].width <= most,
				`${name} for ${Math.round(box)} px`,
			);
		});
	}
});

// The collection banner is a strip from 64rem on (280 px high, 1316 px wide at most): Ghost crops it (image_sizes
// banner, 1400 × 392, and banner-xl, 2000 × 560), whatever the width of the screen; narrower than that, it is a
// block as high as it is wide and takes the usual renditions
describe("pictures: the collection banner", () => {
	before(launch);
	after(close);

	const banner = async (viewport, deviceScaleFactor) => {
		const { page, dispose } = await open({
			render: home({ site: { tagImage } }),
			viewport,
			deviceScaleFactor,
		});
		const img = page.locator(".banner__image").first();
		await img.scrollIntoViewIfNeeded();
		await waitFor(() => img.evaluate(el => el.currentSrc !== ""));
		const url = await img.evaluate(el => el.currentSrc);
		await dispose();
		return /[?&]size=([\w-]+)/.exec(url)?.[1];
	};

	it("takes the 1400 × 392 crop from 64rem on, the 2000 × 560 one on a dense screen", async () => {
		assert.equal(await banner({ width: 1350, height: 940 }, 1), "banner");
		assert.equal(await banner({ width: 1024, height: 800 }, 1), "banner");
		assert.equal(await banner({ width: 1920, height: 1080 }, 1), "banner");
		assert.equal(await banner({ width: 1440, height: 900 }, 2), "banner-xl");
		assert.equal(await banner({ width: 1350, height: 940 }, 1.75), "banner-xl");
	});

	it("takes the usual renditions of its box below 64rem", async () => {
		assert.equal(await banner({ width: 800, height: 900 }, 1), "w800");
		// A phone's banner is 434 px high: a 16:9 picture covering it is 772 px wide, 1351 px at 1.75x
		assert.equal(await banner({ width: 412, height: 823 }, 1.75), "w1400");
	});

	// The crop is as wide for its height as the strip it covers (372 px high, 942 to 1328 px wide: 2.5 to 3.6 times):
	// a crop much wider would show a part of it, a taller one would have to be enlarged to cover
	it("has the ratio of the banner's box at its widest", async () => {
		const { page, dispose } = await open({
			render: home({ site: { tagImage } }),
			viewport: { width: 1440, height: 900 },
		});
		const box = await page
			.locator(".banner__image")
			.first()
			.evaluate(el => el.getBoundingClientRect().toJSON());
		await dispose();
		const crop = IMAGE_SIZES.banner.width / IMAGE_SIZES.banner.height;
		assert.ok(
			Math.abs(crop / (box.width / box.height) - 1) < 0.1,
			`${box.width} x ${box.height} px, crop ${crop.toFixed(2)}`,
		);
	});

	it("declares the crops in image_sizes", () => {
		assert.deepEqual(IMAGE_SIZES.banner, { width: 1400, height: 392 });
		assert.deepEqual(IMAGE_SIZES["banner-xl"], { width: 2000, height: 560 });
	});
});
