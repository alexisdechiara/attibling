// Pages other than the home and the article: tag, author, all tags, all authors, generic page, 404,
// archives, « Mes favoris », subscription page (« À propos »: about.test.js).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { template } from "./support/pages.js";

const PHONE = { width: 390, height: 844 };

const SAVED = [
	{
		url: "/overwatch-renaissance/",
		title: "Overwatch est-il en train de renaître ?",
		image: "/src/tests/fixtures/photo.svg",
		tag: "Actualité",
		readingTime: 11,
		savedAt: 3,
	},
	{
		url: "/hytale-records/",
		title: "Hytale peut-il battre des records ?",
		image: "",
		tag: "",
		readingTime: 2,
		savedAt: 2,
	},
];

// Width of the document beyond the viewport (horizontal overflow), in px
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// Keyboard focus on a control shows a ring (outline or box-shadow)
const focusRing = (page, selector) =>
	page.evaluate(sel => {
		const el = document.querySelector(sel);
		el.focus({ focusVisible: true });
		const style = getComputedStyle(el);
		return (
			document.activeElement === el &&
			((style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2) || style.boxShadow !== "none")
		);
	}, selector);

describe("tag page", () => {
	before(launch);
	after(close);

	it("dresses its header with the tag's image, description and count, then a lead post and the grid", async () => {
		const { page, dispose } = await open({
			render: template("tag", { site: { tagImage: () => "/src/tests/fixtures/photo.svg?tag" } }),
		});
		const view = await page.evaluate(() => ({
			h1: [...document.querySelectorAll("h1")].map(h => h.textContent.trim()),
			image: Boolean(document.querySelector(".listing-hero img.listing-hero__image")),
			meta: document.querySelector(".listing-hero__meta").textContent.trim(),
			lead: document.querySelector(".listing-lead__title")?.textContent.trim(),
			grid: [...document.querySelectorAll(".listing-grid .tile__title")].map(t => t.textContent.trim()),
		}));
		assert.deepEqual(view.h1, ["Jeux vidéo"]);
		assert.ok(view.image, "the tag's feature image is in the header");
		assert.match(view.meta, /posts with this tag/);
		// The tag's featured post leads (the sample site's most recent featured « jeux-video » post)
		assert.equal(view.lead, "Anglais ou français, quelle est la véritable VO de Clair Obscur : Expedition 33 ?");
		assert.ok(view.grid.length > 0);
		assert.ok(!view.grid.includes(view.lead), "the lead post is not repeated in the grid");
		assert.equal(await page.locator(".listing-grid .section-header__more").count(), 0, "no « Tout voir » on the grid");
		await dispose();
	});

	it("works without image, description or featured post (the newest post leads)", async () => {
		const { page, dispose } = await open({
			render: template("tag", { site: { tagImage: () => null, featured: false } }),
		});
		const view = await page.evaluate(() => ({
			image: Boolean(document.querySelector(".listing-hero__image")),
			description: Boolean(document.querySelector(".listing-hero__description")),
			lead: document.querySelector(".listing-lead__title")?.textContent.trim(),
			first: document.querySelector(".listing-grid .tile__title")?.textContent.trim(),
		}));
		assert.equal(view.image, false);
		assert.equal(view.description, false);
		assert.equal(view.lead, "Les animes à voir en VF pour la saison d’hiver 2026", "newest post of the page");
		assert.notEqual(view.first, view.lead);
		await dispose();
	});

	it("shows the description when the tag has one, and no lead post on page 2", async () => {
		const render = template("tag", { paged: true });
		render.context.tag = { ...render.context.tag, description: "Tests, tops et actus du jeu vidéo." };
		const { page, dispose } = await open({ render });
		const view = await page.evaluate(() => ({
			description: document.querySelector(".listing-hero__description")?.textContent.trim(),
			lead: Boolean(document.querySelector(".listing-lead")),
		}));
		assert.equal(view.description, "Tests, tops et actus du jeu vidéo.");
		assert.equal(view.lead, false);
		await dispose();
	});
});

describe("author, tags and authors pages", () => {
	before(launch);
	after(close);

	it("author page: name, bio, links and posts", async () => {
		const { page, dispose } = await open({ render: template("author") });
		const view = await page.evaluate(() => ({
			h1: document.querySelector("h1").textContent.trim(),
			bio: document.querySelector(".listing-hero__description")?.textContent.trim(),
			links: [...document.querySelectorAll(".listing-hero .author-links a")].map(a => a.getAttribute("aria-label")),
			tiles: document.querySelectorAll(".listing-grid .tile").length,
		}));
		assert.equal(view.h1, "Alexis De Chiara");
		assert.match(view.bio, /front-end/);
		assert.deepEqual(view.links, ["X"]);
		assert.equal(view.tiles, 7);
		await dispose();
	});

	it("all tags: a tile per public tag with posts, with its count", async () => {
		const { page, dispose } = await open({ render: template("page-tags") });
		const tiles = await page.evaluate(() =>
			[...document.querySelectorAll(".listing-tags .tag-tile")].map(
				t => t.querySelector(".tag-tile__count").textContent,
			),
		);
		assert.ok(tiles.length >= 5);
		assert.ok(tiles.every(t => /post/.test(t)));
		assert.ok(!(await page.evaluate(() => document.body.textContent.includes("#top"))), "no internal tag");
		await dispose();
	});

	it("all authors: a card per author", async () => {
		const { page, dispose } = await open({ render: template("page-authors") });
		assert.equal(await page.locator(".author-card").count(), 1);
		assert.equal(await page.locator(".author-card__name").textContent(), "Alexis De Chiara");
		await dispose();
	});
});

describe("generic page", () => {
	before(launch);
	after(close);

	it("shows the title and feature image unless the page hides them", async () => {
		let { page, dispose } = await open({ render: template("page") });
		assert.equal(await page.locator(".page-article__title").count(), 1);
		assert.equal(await page.locator(".page-article__image").count(), 1);
		await dispose();
		({ page, dispose } = await open({ render: template("page", { page: { show_title_and_feature_image: false } }) }));
		assert.equal(await page.locator(".page-article__title").count(), 0);
		assert.equal(await page.locator(".page-article__image").count(), 0);
		assert.equal(await page.locator("h1").count(), 1, "the title stays for screen readers");
		await dispose();
	});
});

describe("404 page", () => {
	before(launch);
	after(close);

	it("offers the search, the home page, sections of the navigation and the 4 latest posts", async () => {
		const { page, dispose } = await open({ render: template("error-404") });
		const view = await page.evaluate(() => ({
			h1: document.querySelector("h1").textContent.trim(),
			search: document.querySelector(".error-page__search")?.hasAttribute("data-ghost-search"),
			focused: document.activeElement?.classList.contains("error-page__search"),
			shortcuts: [...document.querySelectorAll(".error-page__shortcuts a")]
				.filter(a => a.offsetParent)
				.map(a => a.textContent.trim()),
			recent: document.querySelectorAll(".error-page__recent .tile").length,
		}));
		assert.equal(view.h1, "Page not found");
		assert.ok(view.search, "native search button");
		assert.ok(view.focused, "the search button has the focus on arrival");
		assert.deepEqual(view.shortcuts, ["Go to the home page", "Newsletter", "Dossier", "News"]);
		assert.equal(view.recent, 4);
		await dispose();
	});
});

describe("archives page", () => {
	before(launch);
	after(close);

	const rows = page =>
		page.evaluate(() =>
			[...document.querySelectorAll("[data-archive-item]")].filter(li => li.offsetParent).map(li => li.dataset.year),
		);

	it("lists every post, more than 100, readable without JavaScript", async () => {
		const { page, dispose } = await open({ render: template("page-archives", { site: { extra: 130 } }) });
		// Without JavaScript: the server-rendered list, the bar hidden
		const server = await page.evaluate(async () => {
			const html = await (await fetch(location.href)).text();
			const doc = new DOMParser().parseFromString(html, "text/html");
			return {
				rows: doc.querySelectorAll("[data-archive-item]").length,
				barHidden: doc.querySelector("[data-archives-bar]").hidden,
				first: doc.querySelector(".archive-item").textContent,
			};
		});
		assert.equal(server.rows, 155, "25 + 130 posts, in pages of 100");
		assert.ok(server.barHidden, "the bar waits for the script");
		assert.match(server.first, /2026/, "each row carries its date");
		await dispose();
	});

	it("groups by year, filters by year, title and section, and keeps a live count", async () => {
		const { page, dispose } = await open({ render: template("page-archives", { site: { extra: 130 } }) });
		const count = () => page.locator("[data-archives-count]").textContent();
		assert.equal(await page.locator("[data-archives-bar]").isVisible(), true);
		assert.equal(await count(), "155 posts");
		const years = await page.locator(".archives-group__year").allTextContents();
		assert.equal(years[0], "2026");
		assert.ok(years.length > 3);

		await page.locator('.archives-year[data-year="2025"]').click();
		assert.equal(await page.locator('.archives-year[data-year="2025"]').getAttribute("aria-pressed"), "true");
		const in2025 = await rows(page);
		assert.ok(in2025.length > 0 && in2025.every(y => y === "2025"));
		assert.equal(await count(), `${in2025.length} posts`);
		assert.match(page.url(), /year=2025/);

		await page.locator('.archives-year[data-year=""]').click();
		await page.locator("[data-archives-search]").fill("hytale");
		assert.equal(await count(), "3 posts");
		await page.locator("[data-archives-search]").fill("HYTALÉ");
		assert.equal(await count(), "3 posts", "case and accents ignored");

		await page.locator("[data-archives-search]").fill("");
		await page.locator("[data-archives-tag]").selectOption("ia");
		const titles = await page.evaluate(() =>
			[...document.querySelectorAll("[data-archive-item]")].filter(li => li.offsetParent).map(li => li.dataset.tags),
		);
		assert.ok(titles.length === 4 && titles.every(t => t.split(" ").includes("ia")));

		await page.locator("[data-archives-search]").fill("zzzz");
		assert.equal(await count(), "No posts");
		assert.equal(await page.locator("[data-archives-empty]").isVisible(), true);
		await dispose();
	});

	it("?tag= shows one series (an internal tag), oldest first, with a way back", async () => {
		const render = template("page-archives", { site: { series: true } });
		const { page, dispose } = await open({
			render,
			initScript: () => history.replaceState(null, "", "?tag=hash-serie-test"),
		});
		await page.reload();
		const view = await page.evaluate(() => ({
			label: document.querySelector("[data-archives-filter-label]").textContent,
			dates: [...document.querySelectorAll("[data-archive-item]")]
				.filter(li => li.offsetParent)
				.map(li => li.dataset.date),
		}));
		assert.equal(view.label, "Series: test");
		assert.equal(await page.locator(".archives__kicker").isVisible(), false, "no « newest first » for a series");
		assert.equal(view.dates.length, 3);
		assert.deepEqual(view.dates, [...view.dates].sort(), "oldest first");
		await page.locator("[data-archives-clear]").click();
		assert.equal(await page.locator("[data-archives-count]").textContent(), "25 posts");
		await dispose();
	});
});

describe("« Mes favoris » page", () => {
	before(launch);
	after(close);

	it("draws the member's saved posts and removes them one by one or all at once", async () => {
		const { page, dispose } = await open({
			render: template("page-favoris", { member: true }),
			storage: { "attibling-saved": JSON.stringify(SAVED) },
		});
		const view = await page.evaluate(() => ({
			titles: [...document.querySelectorAll("[data-saved-list] .tile__title")].map(t => t.textContent),
			hrefs: [...document.querySelectorAll("[data-saved-list] .tile__link")].map(a => a.getAttribute("href")),
			pill: document.querySelectorAll("[data-saved-list] .tile__pill").length,
			noImage: document.querySelectorAll("[data-saved-list] .tile--no-image").length,
			count: document.querySelector("[data-saved-count]").textContent,
		}));
		assert.deepEqual(view.titles, [SAVED[0].title, SAVED[1].title]);
		assert.deepEqual(view.hrefs, [SAVED[0].url, SAVED[1].url]);
		assert.equal(view.pill, 1, "« Format long » on the 11 min post only");
		assert.equal(view.noImage, 1);
		assert.match(view.count, /^2 posts/);

		await page.locator("[data-saved-list] [data-remove]").first().click();
		assert.equal(await page.locator("[data-saved-list] .tile").count(), 1);
		assert.equal(
			await page.evaluate(() => document.activeElement.hasAttribute("data-remove")),
			true,
			"focus stays on the next « Retirer »",
		);

		page.on("dialog", dialog => dialog.accept());
		await page.locator("[data-saved-clear]").click();
		assert.equal(await page.locator("[data-saved-empty]").isVisible(), true);
		assert.equal(await page.evaluate(() => localStorage.getItem("attibling-saved")), "[]");
		await dispose();
	});

	it("shows the empty state when nothing is saved", async () => {
		const { page, dispose } = await open({ render: template("page-favoris", { member: true }) });
		assert.equal(await page.locator("[data-saved-empty]").isVisible(), true);
		assert.equal(await page.locator("[data-saved-clear]").isVisible(), false);
		await dispose();
	});

	it("invites visitors to subscribe or sign in, and never reads the list", async () => {
		const { page, dispose } = await open({
			render: template("page-favoris"),
			storage: { "attibling-saved": JSON.stringify(SAVED) },
		});
		assert.equal(await page.locator("[data-saved]").count(), 0);
		assert.equal(await page.locator('.saved-visitor a[data-portal="signin"]').count(), 1);
		assert.equal(await page.locator('.saved-visitor a[href="#/portal/signup"]').count(), 1);
		await dispose();
	});
});

// « À propos »: src/tests/about.test.js

describe("subscription page", () => {
	before(launch);
	after(close);

	it("opens with Ghost's members form in a section at least as tall as the first screen", async () => {
		for (const viewport of [PHONE, { width: 1440, height: 900 }, { width: 1440, height: 1400 }]) {
			const { page, dispose } = await open({ render: template("page-newsletter"), viewport });
			const view = await page.evaluate(() => {
				const hero = document.querySelector(".subscribe-hero");
				return {
					bottom: hero.getBoundingClientRect().bottom + window.scrollY,
					form:
						document.querySelector('form[data-members-form="subscribe"] input[data-members-email][type=email]') !==
						null,
					faq: document.querySelectorAll(".subscribe-faq details").length,
				};
			});
			assert.ok(view.bottom >= viewport.height, `${viewport.width}×${viewport.height}: the FAQ starts below the fold`);
			assert.ok(view.form);
			assert.equal(view.faq, 3);
			await dispose();
		}
	});

	it("uses the page's excerpt as lead and its content under the form", async () => {
		const { page, dispose } = await open({
			render: template("page-newsletter", {
				post: {
					custom_excerpt: "Une phrase du site.",
					html: '<p>En vous inscrivant, vous acceptez les <a href="/mentions-legales/">mentions légales</a>.</p>',
				},
			}),
		});
		assert.equal(
			await page.locator(".subscribe-panel--signup .subscribe-hero__lead").textContent(),
			"Une phrase du site.",
		);
		assert.equal(await page.locator('.subscribe-hero__notes a[href="/mentions-legales/"]').count(), 1);
		await dispose();
	});

	// Form states, sign-in, validation, surface, member view: subscribe.test.js

	it("members see their account instead of the form", async () => {
		const { page, dispose } = await open({ render: template("page-newsletter", { member: true }) });
		const view = await page.evaluate(() => ({
			form: document.querySelectorAll("[data-members-form]").length,
			email: document.querySelector(".subscribe-member__text strong")?.textContent,
			account: Boolean(document.querySelector('.subscribe-member a[data-portal="account"]')),
			signout: Boolean(document.querySelector(".subscribe-member [data-members-signout]")),
		}));
		assert.equal(view.form, 0);
		assert.equal(view.email, "reader@example.com");
		assert.ok(view.account && view.signout);
		await dispose();
	});
});

describe("pages at 390 px and keyboard focus", () => {
	before(launch);
	after(close);

	const PAGES = [
		["tag", {}],
		["author", {}],
		["page-tags", {}],
		["page-authors", {}],
		["page", {}],
		["error-404", {}],
		["page-archives", {}],
		["page-favoris", { member: true }],
		["page-favoris", {}],
		["page-a-propos", {}],
		["page-newsletter", {}],
		["page-newsletter", { member: true }],
	];

	it("no page scrolls sideways at 390 px", async () => {
		for (const [name, options] of PAGES) {
			const { page, dispose } = await open({
				render: template(name, options),
				viewport: PHONE,
				storage: { "attibling-saved": JSON.stringify(SAVED) },
			});
			assert.equal(await overflow(page), 0, `${name}${options.member ? " (member)" : ""}`);
			await dispose();
		}
	});

	it("the main controls show a focus ring", async () => {
		const checks = [
			["page-archives", {}, ".archives-year"],
			["page-archives", {}, "[data-archives-search]"],
			["page-archives", {}, "[data-archives-tag]"],
			["page-archives", {}, ".archive-item__title"],
			["error-404", {}, ".error-page__search"],
			["page-newsletter", {}, "#subscribe-email"],
			["page-newsletter", {}, ".subscribe-faq summary"],
			["page-favoris", { member: true }, "[data-remove]"],
			["tag", {}, ".listing-lead__link"],
			["page-a-propos", {}, ".about-follow__icon"],
		];
		for (const [name, options, selector] of checks) {
			const { page, dispose } = await open({
				render: template(name, options),
				storage: { "attibling-saved": JSON.stringify(SAVED) },
			});
			assert.ok(await focusRing(page, selector), `${name} ${selector}`);
			await dispose();
		}
	});
});
