// Vignettes (partials/vignette/*.hbs): cards show the image the author set for sharing (og image, else
// X image), else the feature image, else the designed no-image state; the article header and the home
// hero keep the feature image (the banner).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home, template } from "./support/pages.js";

const PHOTO = "/src/tests/fixtures/photo.svg";
// A varied site: posts 0, 2, 4… have an og image (post 6's equals its feature image), posts 1, 7, 13…
// only an X image, every fifth post (4, 9, 14…) has no feature image
const SITE = {
	image: (post, i) => (i % 5 === 4 ? null : `${PHOTO}?${i}`),
	ogImage: (post, i) => (i === 6 ? `${PHOTO}?6` : i % 2 === 0 ? `${PHOTO}?og-${i}` : null),
	twitterImage: (post, i) => (i % 6 === 1 ? `${PHOTO}?tw-${i}` : null),
};
const expected = slug => {
	const i = POSTS.findIndex(p => p.slug === slug);
	if (i < 0) throw new Error(`unknown post ${slug}`);
	if (i === 6) return { src: `${PHOTO}?6`, social: false };
	if (i % 2 === 0) return { src: `${PHOTO}?og-${i}`, social: true };
	if (i % 6 === 1) return { src: `${PHOTO}?tw-${i}`, social: true };
	if (i % 5 === 4) return null;
	return { src: `${PHOTO}?${i}`, social: false };
};
let POSTS = [];

const CARDS = [
	".lead__image",
	".row-item img",
	".tile__image",
	".banner__post img",
	".listing-lead__image",
	".discover__posts img",
].join(", ");

// Each card picture of the page: the post it links to, its picture (without the size) and its marks
const cards = page =>
	page.evaluate(selector => {
		const base = url => url.replace(/&size=\w+(&format=\w+)?$/, "");
		return [...document.querySelectorAll(selector)]
			.filter(img => img.closest("a[href]") && !img.closest("template"))
			.map(img => ({
				slug: new URL(img.closest("a[href]").href).pathname.replaceAll("/", ""),
				src: base(img.getAttribute("src")),
				srcset: img
					.getAttribute("srcset")
					.split(", ")
					.map(s => base(s.split(" ")[0])),
				social: img.dataset.vignette === "social",
				webp: [img.getAttribute("src"), ...img.getAttribute("srcset").split(", ")].every(s =>
					/&format=webp( |$)/.test(s),
				),
				where: img.className || img.closest("[class]").className,
			}));
	}, CARDS);

const checkCards = (list, label) => {
	assert.ok(list.length > 0, `${label}: card pictures found`);
	for (const card of list) {
		const want = expected(card.slug);
		assert.ok(want, `${label}: ${card.slug} has no image, its card must show the no-image state (${card.where})`);
		assert.equal(card.src, want.src, `${label}: ${card.slug} in ${card.where}`);
		assert.ok(
			card.srcset.every(s => s === want.src),
			`${label}: srcset of ${card.slug} uses the same picture`,
		);
		assert.equal(card.social, want.social, `${label}: ${card.slug} marked as a social vignette`);
		assert.equal(card.webp, true, `${label}: ${card.slug} served as WebP`);
	}
};

describe("vignettes", () => {
	before(async () => {
		await launch();
		POSTS = home({ site: SITE }).site.posts;
	});
	after(close);

	it("every card of the home shows the image set for sharing, else the feature image", async () => {
		const { page, errors, dispose } = await open({
			render: home({ site: SITE }),
			viewport: { width: 1440, height: 900 },
		});
		const list = await cards(page);
		checkCards(list, "home");
		const where = new Set(list.map(c => c.where.split(" ")[0]));
		for (const kind of ["lead__image", "tile__image", "banner__post-image", "row-item__image"]) {
			assert.ok(where.has(kind), `the home has ${kind} cards`);
		}
		// Rows of every form: « Les plus lus », shelf, posters, one large + four
		for (const row of [".top", ".row--shelf", ".row--posters", ".row--feature", ".latest", ".row--banner"]) {
			assert.ok(await page.locator(`${row} img[data-vignette="social"]`).count(), `${row} shows social vignettes`);
		}
		assert.deepEqual(errors.map(String), []);
		await dispose();
	});

	it("keeps the feature image (the banner) in the home hero", async () => {
		const { page, dispose } = await open({ render: home({ site: SITE }), viewport: { width: 1440, height: 900 } });
		const hero = await page.$$eval(".hero__image", imgs =>
			imgs.map(img => ({
				slug: new URL(img.closest("[data-hero-slide]").querySelector("a[href]").href).pathname.replaceAll("/", ""),
				src: img.getAttribute("src").replace(/&size=\w+&format=webp$/, ""),
			})),
		);
		assert.ok(hero.length > 0);
		for (const { slug, src } of hero) {
			const i = POSTS.findIndex(p => p.slug === slug);
			assert.equal(src, `${PHOTO}?${i}`, `hero slide of ${slug} uses the feature image`);
		}
		await dispose();
	});

	it("shows the no-image tile only when the post has neither image", async () => {
		const site = {
			image: (post, i) => (i < 3 ? null : `${PHOTO}?${i}`),
			ogImage: (post, i) => (i === 1 ? `${PHOTO}?og-1` : null),
			twitterImage: (post, i) => (i === 2 ? `${PHOTO}?tw-2` : null),
		};
		const { page, dispose } = await open({ render: home({ site }), viewport: { width: 1440, height: 900 } });
		const lead = page.locator(".latest .lead");
		assert.match(await lead.getAttribute("class"), /lead--no-image/, "the latest post has no image at all");
		assert.equal(await lead.locator(".tile__placeholder").count(), 1);
		const rows = page.locator(".latest__list li");
		assert.equal(await rows.nth(0).locator("img").getAttribute("data-vignette"), "social", "og image, no banner");
		assert.match(await rows.nth(0).locator("img").getAttribute("src"), /og-1/);
		assert.match(await rows.nth(1).locator("img").getAttribute("src"), /tw-2/, "X image, no banner");
		const ogOnly = page.locator(`[data-post-tile]:has(a[href="${POSTS[1].url}"])`).first();
		assert.doesNotMatch((await ogOnly.getAttribute("class")) || "", /no-image/);
		await dispose();
	});

	it("tag pages, related posts and the 404 use vignettes too", async () => {
		for (const name of ["tag", "post", "error-404"]) {
			const { page, dispose } = await open({
				render: template(name, { site: SITE }),
				viewport: { width: 1440, height: 900 },
			});
			checkCards(await cards(page), name);
			await dispose();
		}
	});

	it("keeps the feature image in the article header and stores the vignette for the members' lists", async () => {
		// template("post") renders posts[1]: X image tw-1, feature image ?1
		const { page, dispose } = await open({
			render: template("post", { site: SITE, member: true }),
			viewport: { width: 1440, height: 900 },
		});
		assert.match(await page.locator("[data-article-image]").getAttribute("src"), /photo\.svg\?1&size=l&format=webp$/);
		assert.match(await page.locator("[data-article]").getAttribute("data-image"), /\?tw-1&size=m&format=webp$/);
		await page.locator(".article-header [data-bookmark]").click();
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("attibling-saved")));
		assert.match(saved[0].image, /\?tw-1&size=m&format=webp$/);
		await dispose();
	});

	it("saves the vignette of a tile in « Read later »", async () => {
		const { page, dispose } = await open({
			render: home({ site: SITE, member: true }),
			viewport: { width: 1440, height: 900 },
		});
		const tile = page.locator(`.row--shelf [data-post-tile]:has(img[data-vignette="social"])`).first();
		await tile.scrollIntoViewIfNeeded();
		await tile.hover();
		await tile.locator("[data-bookmark]").click();
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("attibling-saved")));
		const want = expected(saved[0].url.replaceAll("/", ""));
		assert.equal(saved[0].image, `${want.src}&size=m&format=webp`);
		// The members' list draws it
		await waitFor(() => page.locator("[data-member-lists] .tile__image[src]").count());
		assert.equal(
			await page.locator("[data-member-lists] .tile__image").first().getAttribute("src"),
			`${want.src}&size=m&format=webp`,
		);
		await dispose();
	});

	it("shows a social vignette whole on posters, over a blurred backdrop", async () => {
		const { page, dispose } = await open({ render: home({ site: SITE }), viewport: { width: 1440, height: 900 } });
		const poster = page.locator('.row--posters .tile--poster:has(img[data-vignette="social"])').first();
		await poster.scrollIntoViewIfNeeded();
		const look = await poster.evaluate(tile => {
			const img = tile.querySelector("img[data-vignette]");
			const backdrop = tile.querySelector(".vignette-backdrop");
			return {
				fit: getComputedStyle(img).objectFit,
				backdrop: backdrop && {
					filter: getComputedStyle(backdrop).filter,
					hidden: backdrop.getAttribute("aria-hidden"),
					alt: backdrop.getAttribute("alt"),
					src: backdrop.getAttribute("src"),
				},
				slug: new URL(tile.querySelector("a").href).pathname.replaceAll("/", ""),
			};
		});
		assert.equal(look.fit, "contain");
		assert.ok(look.backdrop, "a backdrop");
		assert.match(look.backdrop.filter, /blur/);
		assert.equal(look.backdrop.alt, "");
		const i = POSTS.findIndex(p => p.slug === look.slug);
		const banner = SITE.image(null, i);
		assert.equal(
			look.backdrop.src,
			`${banner || expected(look.slug).src}&size=s&format=webp`,
			"the banner behind, when there is one",
		);
		// A poster showing its feature image keeps the upright crop
		const plain = page.locator(".row--posters .tile--poster img.tile__image:not([data-vignette])").first();
		assert.equal(await plain.evaluate(img => getComputedStyle(img).objectFit), "cover");
		await dispose();
	});

	it("does not morph a social vignette into the article header", async () => {
		const custom = { use_geekly_logo: true, page_transitions: true };
		const run = async selector => {
			const { page, dispose } = await open({
				render: home({ site: SITE, custom }),
				pages: { "*": template("post", { site: SITE, custom }) },
				viewport: { width: 1440, height: 900 },
			});
			await page.context().addInitScript(() => {
				window.addEventListener("pagereveal", event => {
					window.__reveal = { transition: Boolean(event.viewTransition), pseudo: null };
					event.viewTransition?.ready.then(() => {
						window.__reveal.pseudo = document
							.getAnimations()
							.map(a => a.effect.pseudoElement)
							.filter(Boolean);
					});
				});
			});
			await page.locator(selector).first().scrollIntoViewIfNeeded();
			await Promise.all([
				page.waitForURL(url => !url.pathname.startsWith("/__render")),
				page.locator(selector).first().click(),
			]);
			const reveal = await waitFor(() => page.evaluate(() => window.__reveal?.pseudo && window.__reveal));
			await dispose();
			return reveal;
		};
		const social = await run('.row--shelf .tile__link:has(img[data-vignette="social"])');
		assert.ok(social.transition, "the page still changes with a transition");
		// The article header is still named on the new page (it fades in on its own): no old picture
		assert.ok(!social.pseudo.includes("::view-transition-old(vt-media)"), `no picture pair: ${social.pseudo}`);
		assert.ok(social.pseudo.includes("::view-transition-old(root)"), "the page cross-fades");
		const banner = await run(".row--shelf .tile__link:has(img.tile__image:not([data-vignette]))");
		assert.ok(banner.pseudo.includes("::view-transition-new(vt-media)"), "a feature image still morphs");
	});

	it("gets og_image and twitter_image as Ghost exposes them", async () => {
		// Guard for the stub renderer (verified on Ghost 6.78): always present on posts, null when unset
		const { site } = home({ site: SITE });
		assert.equal(site.posts[0].og_image, `${PHOTO}?og-0`);
		assert.equal(site.posts[3].og_image, null, "null when unset, never the feature image");
	});
});
