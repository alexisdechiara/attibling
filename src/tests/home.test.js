import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home, paged, template } from "./support/pages.js";

const heroState = page =>
	page.evaluate(() => ({
		dots: [...document.querySelectorAll("[data-hero-dot]")].map(dot => dot.getAttribute("aria-current")),
		active: [...document.querySelectorAll("[data-hero-slide]")]
			.filter(slide => !slide.inert && !slide.hidden && getComputedStyle(slide).visibility !== "hidden")
			.map(slide => slide.querySelector(".hero__post-title").textContent),
		pagerHidden: document.querySelector("[data-hero-pager]")?.hidden ?? null,
	}));

describe("home hero", () => {
	before(launch);
	after(close);

	it("shows the latest featured post and switches posts with the pager", async () => {
		for (const width of [390, 1440]) {
			const { page, errors, dispose } = await open({ viewport: { width, height: 900 } });
			let state = await heroState(page);
			assert.equal(state.pagerHidden, false, "the pager shows once the script runs");
			assert.deepEqual(state.dots, ["true", null, null, null, null, null], `six dots, the first current at ${width}px`);
			assert.deepEqual(state.active, ["Test de Dokploy : une alternative sérieuse à Coolify"]);

			await page.locator("[data-hero-dot]").nth(2).click();
			state = await waitFor(async () => {
				const s = await heroState(page);
				return s.active.length === 1 && s.active[0].startsWith("Voici Knowless") && s;
			});
			assert.ok(state, `the third post shows at ${width}px`);
			assert.deepEqual(state.dots, [null, null, "true", null, null, null]);
			assert.deepEqual(errors.map(String), []);
			await dispose();
		}
	});

	it("names each dot and moves between them with the arrow keys", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		const first = page.locator("[data-hero-dot]").first();
		assert.equal(
			await first
				.locator(".sr-only")
				.textContent()
				.then(t => t.trim()),
			"1 of 6: Test de Dokploy : une alternative sérieuse à Coolify",
		);
		await first.focus();
		await page.keyboard.press("ArrowDown");
		assert.deepEqual((await heroState(page)).dots.slice(0, 2), [null, "true"]);
		assert.equal(await page.evaluate(() => document.activeElement.matches("[data-hero-dot]:nth-of-type(2)")), true);
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("ArrowUp");
		assert.equal((await heroState(page)).dots.at(-1), "true", "wraps around to the last post");
		await dispose();
	});

	it("keeps the posts that are not shown out of the keyboard's reach", async () => {
		const { page, dispose } = await open();
		const reachable = await page.evaluate(() =>
			[...document.querySelectorAll("[data-hero-slide]")].map(slide => !slide.closest("[inert]") && !slide.hidden),
		);
		assert.deepEqual(reachable, [true, false, false, false, false, false]);
		await dispose();
	});

	it("has no pager with a single featured post, and a plain card with none", async () => {
		const one = await open({ render: home({ site: { featured: false } }) });
		assert.equal(await one.page.locator("[data-hero-slide]").count(), 0);
		assert.equal(await one.page.locator("[data-hero-pager]").count(), 0);
		assert.equal(await one.page.locator(".hero__slide--static").count(), 1);
		assert.equal(
			await one.page
				.locator("h1#hero-title")
				.textContent()
				.then(t => t.trim().startsWith("Geekly")),
			true,
		);
		await one.dispose();
	});
});

describe("wordmark docking", () => {
	before(launch);
	after(close);

	const dock = page =>
		page.evaluate(() => {
			const header = document.getElementById("site-header");
			const logo = header.querySelector("[data-header-logo]");
			const style = getComputedStyle(logo);
			return { dock: header.dataset.dock, visible: style.visibility === "visible" };
		});

	for (const reducedMotion of ["no-preference", "reduce"]) {
		it(`docks the wordmark into the header once the hero has scrolled away (${reducedMotion})`, async () => {
			const { page, dispose } = await open({ reducedMotion, viewport: { width: 1440, height: 900 } });
			assert.deepEqual(await dock(page), { dock: "undocked", visible: false }, "no logo while the hero shows");

			await page.evaluate(() => window.scrollTo(0, 700));
			assert.equal(await waitFor(async () => (await dock(page)).dock === "docked"), true);
			assert.equal(await waitFor(async () => (await dock(page)).visible), true, "the logo shows");

			await page.evaluate(() => window.scrollTo(0, 0));
			assert.equal(await waitFor(async () => (await dock(page)).dock === "undocked"), true, "and leaves again");
			await dispose();
		});
	}

	it("keeps the hidden logo out of the tab order", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		assert.equal(
			await page.evaluate(() => document.activeElement.matches("[data-header-logo]")),
			false,
			"the second Tab goes past the hidden logo",
		);
		await dispose();
	});

	it("always shows the logo on the other pages", async () => {
		for (const render of [paged(2), template("tag"), template("post")]) {
			const { page, dispose } = await open({ render, viewport: { width: 1440, height: 900 } });
			assert.deepEqual(await dock(page), { dock: undefined, visible: true }, render.template);
			await dispose();
		}
	});
});

describe("subscription block", () => {
	before(launch);
	after(close);

	const promoShown = page =>
		page.evaluate(() => {
			const promo = document.querySelector("[data-promo]");
			return Boolean(promo) && getComputedStyle(promo).display !== "none";
		});

	it("shows to visitors only", async () => {
		const visitor = await open();
		assert.equal(await promoShown(visitor.page), true);
		assert.equal(await visitor.page.locator("[data-promo] .promo__signin a").count(), 1);
		await visitor.dispose();

		// « Se connecter » leads to the theme's sign-in on the subscription page, underlined on hover only
		const page = await open({ render: home({ custom: { use_geekly_logo: true, subscribe_url: "/newsletter/" } }) });
		const link = page.page.locator("[data-promo] .promo__signin a");
		assert.equal(await link.getAttribute("href"), "/newsletter/#connexion");
		const underline = () => link.evaluate(a => getComputedStyle(a).textDecorationLine);
		assert.equal(await underline(), "none");
		await link.hover();
		assert.equal(await underline(), "underline");
		await page.dispose();

		const member = await open({ render: home({ member: true }) });
		assert.equal(await member.page.locator("[data-promo]").count(), 0);
		await member.dispose();

		const closed = await open({ render: home({ site: { settings: { members_enabled: false } } }) });
		assert.equal(await closed.page.locator("[data-promo]").count(), 0, "not when members are disabled");
		await closed.dispose();
	});

	it("closes for good with its close button", async () => {
		const { page, dispose } = await open();
		await page.getByRole("button", { name: "Close", exact: true }).click();
		assert.equal(await promoShown(page), false);
		assert.equal(await page.evaluate(() => localStorage.getItem("attibling-promo-closed")), "1");

		// Hidden from the first paint on the next visit
		const hiddenBeforeScripts = await page.evaluate(
			() =>
				new Promise(resolve => {
					const frame = document.createElement("iframe");
					frame.style.width = "1200px";
					frame.src = location.href;
					frame.addEventListener("load", () => {
						resolve(frame.contentDocument.documentElement.hasAttribute("data-promo-closed"));
					});
					document.body.append(frame);
				}),
		);
		assert.equal(hiddenBeforeScripts, true);
		await page.reload();
		assert.equal(await promoShown(page), false, "still closed after a reload");
		await dispose();
	});
});

const PROGRESS = [
	{
		url: "/overwatch-renaissance/",
		title: "Overwatch est-il en train de renaître ?",
		image: "",
		tag: "Actualité",
		readingTime: 11,
		progress: 0.4,
		updatedAt: 2,
	},
	{
		url: "/top-jeux-2025/",
		title: "Mon top des jeux auquel j’ai joué en 2025",
		image: "",
		tag: "",
		readingTime: 20,
		progress: 0.75,
		updatedAt: 1,
	},
];
const SAVED = [
	{
		url: "/battlefield-6/",
		title: "Annonce de Battlefield 6",
		image: "",
		tag: "Actualité",
		readingTime: 5,
		savedAt: 1,
	},
];

describe("members' lists", () => {
	before(launch);
	after(close);

	const lists = page =>
		page.evaluate(() => {
			const section = document.querySelector("[data-member-lists]");
			if (!section) return null;
			return {
				hidden: section.hidden,
				title: section.querySelector("[data-list-switch]").textContent.trim(),
				cards: [...section.querySelectorAll("[data-list-items] .tile__title")].map(t => t.textContent),
				metas: [...section.querySelectorAll("[data-list-items] .tile__meta")].map(m =>
					m.textContent.replace(/\s+/g, " ").trim(),
				),
				clear: !section.querySelector("[data-list-clear]").hidden,
				all: !section.querySelector("[data-list-all]").hidden,
			};
		});

	it("does not exist for visitors", async () => {
		const { page, dispose } = await open({ storage: { "attibling-progress": JSON.stringify(PROGRESS) } });
		assert.equal(await lists(page), null);
		await dispose();
	});

	it("stays hidden for a member with nothing in progress or saved", async () => {
		const { page, dispose } = await open({ render: home({ member: true }) });
		assert.equal((await lists(page)).hidden, true);
		await dispose();
	});

	it("shows the reading in progress first, with progress and time left", async () => {
		const { page, dispose } = await open({
			render: home({ member: true }),
			storage: { "attibling-progress": JSON.stringify(PROGRESS), "attibling-saved": JSON.stringify(SAVED) },
		});
		const state = await lists(page);
		assert.equal(state.hidden, false);
		assert.equal(state.title, "Continue reading");
		assert.deepEqual(state.cards, [PROGRESS[0].title, PROGRESS[1].title]);
		assert.deepEqual(state.metas, ["40% read•about 7 min left", "75% read•about 5 min left"]);
		assert.deepEqual([state.clear, state.all], [true, false]);
		await dispose();
	});

	it("switches to « Read later » with the title, from the keyboard", async () => {
		const { page, dispose } = await open({
			render: home({ member: true }),
			storage: { "attibling-progress": JSON.stringify(PROGRESS), "attibling-saved": JSON.stringify(SAVED) },
		});
		const button = page.locator("[data-list-switch]");
		assert.equal(await button.getAttribute("aria-haspopup"), "listbox");
		await button.focus();
		await page.keyboard.press("Enter");
		assert.equal(await button.getAttribute("aria-expanded"), "true");
		assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-selected")), "true");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		assert.equal(await button.getAttribute("aria-expanded"), "false");
		assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-list-switch")), true);
		const state = await lists(page);
		assert.equal(state.title, "Read later");
		assert.deepEqual(state.cards, [SAVED[0].title]);
		assert.deepEqual(state.metas, ["Actualité•5 min"]);
		assert.deepEqual([state.clear, state.all], [false, true]);

		await button.click();
		await page.keyboard.press("Escape");
		assert.equal(await button.getAttribute("aria-expanded"), "false", "Escape closes the list");
		await dispose();
	});

	it("opens on « Read later » when nothing is in progress, and says when a list is empty", async () => {
		const { page, dispose } = await open({
			render: home({ member: true }),
			storage: { "attibling-saved": JSON.stringify(SAVED) },
		});
		assert.equal((await lists(page)).title, "Read later");
		await page.locator("[data-list-switch]").click();
		await page.locator("[role=option][data-list=resume]").click();
		assert.deepEqual((await lists(page)).cards, []);
		assert.equal(await page.locator("[data-list-empty=resume]").isVisible(), true);
		await dispose();
	});

	it("removes a card, and disappears when both lists are empty", async () => {
		const { page, dispose } = await open({
			render: home({ member: true }),
			storage: { "attibling-progress": JSON.stringify(PROGRESS.slice(0, 1)) },
		});
		await page.getByRole("button", { name: `Remove “${PROGRESS[0].title}” from the list` }).click();
		assert.equal(await page.evaluate(() => localStorage.getItem("attibling-progress")), "[]");
		assert.equal((await lists(page)).hidden, true);
		await dispose();
	});

	it("keeps the keyboard focus on the page when the last card is removed, or the list cleared", async () => {
		const focusState = page =>
			page.evaluate(() => ({
				body: document.activeElement === document.body,
				visible: document.activeElement.checkVisibility(),
			}));
		for (const [name, storage, act] of [
			[
				"remove",
				{ "attibling-saved": JSON.stringify(SAVED) },
				async page => {
					await page.locator("[data-list-items] [data-remove]").focus();
					await page.keyboard.press("Enter");
				},
			],
			[
				"clear",
				{ "attibling-progress": JSON.stringify(PROGRESS.slice(0, 1)) },
				async page => {
					await page.locator("[data-list-clear]").focus();
					await page.keyboard.press("Enter");
				},
			],
		]) {
			const { page, dispose } = await open({ render: home({ member: true }), storage });
			await act(page);
			await page.waitForTimeout(100);
			assert.equal((await lists(page)).hidden, true, `${name}: the section is gone`);
			assert.deepEqual(await focusState(page), { body: false, visible: true }, `${name}: focus kept on the page`);
			await dispose();
		}
	});

	it("hides when the browser storage is blocked", async () => {
		const { page, dispose } = await open({
			render: home({ member: true }),
			initScript: () => {
				Object.defineProperty(window, "localStorage", {
					get() {
						throw new DOMException("blocked", "SecurityError");
					},
				});
			},
		});
		assert.equal((await lists(page)).hidden, true);
		assert.equal(await page.locator("[data-bookmark]:visible").count(), 0, "no bookmark pretends to work");
		await dispose();
	});
});

describe("bookmarks", () => {
	before(launch);
	after(close);

	it("are not rendered for visitors", async () => {
		const { page, dispose } = await open();
		assert.equal(await page.locator("[data-bookmark]").count(), 0);
		await dispose();
	});

	it("save a post for a member, keep it after a reload and fill « Read later »", async () => {
		const { page, dispose } = await open({ render: home({ member: true }), viewport: { width: 1440, height: 900 } });
		const tile = page.locator(".row--shelf [data-post-tile]").first();
		const button = tile.locator("[data-bookmark]");
		assert.equal(await button.getAttribute("aria-pressed"), "false");
		assert.match(await button.getAttribute("aria-label"), /^Read later: /);
		await tile.scrollIntoViewIfNeeded();
		await tile.hover();
		await button.click();
		assert.equal(await button.getAttribute("aria-pressed"), "true");
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("attibling-saved")));
		assert.equal(saved.length, 1);
		assert.equal(saved[0].url, "/overwatch-renaissance/");
		assert.equal(saved[0].readingTime, 11);

		const same = await page
			.locator('[data-bookmark][data-url="/overwatch-renaissance/"]')
			.evaluateAll(buttons => buttons.map(b => b.getAttribute("aria-pressed")));
		assert.ok(same.length > 1 && same.every(v => v === "true"), "every button of the post follows");
		assert.equal(await page.locator("[data-member-lists]").isVisible(), true, "the members' section appears");

		await page.reload();
		assert.equal(await page.locator(".row--shelf [data-bookmark]").first().getAttribute("aria-pressed"), "true");
		await button.click();
		assert.equal(await page.evaluate(() => localStorage.getItem("attibling-saved")), "[]");
		await dispose();
	});

	it("show on hover on desktop and always on touch screens; a saved post keeps its mark", async () => {
		const opacity = page =>
			page.evaluate(() =>
				[...document.querySelectorAll(".row--shelf [data-bookmark] .bookmark__icon")]
					.slice(0, 2)
					.map(icon => getComputedStyle(icon).opacity),
			);
		const desktop = await open({
			render: home({ member: true }),
			storage: { "attibling-saved": JSON.stringify([{ url: "/hytale-records/", title: "x", savedAt: 1 }]) },
		});
		assert.deepEqual(await opacity(desktop.page), ["0", "1"], "unsaved hidden, saved shown at rest");
		await desktop.dispose();

		const { page, dispose } = await open({
			render: home({ member: true }),
			viewport: { width: 390, height: 800 },
			hasTouch: true,
		});
		assert.deepEqual(await opacity(page), ["1", "1"]);
		await dispose();
	});
});

describe("« Most read »", () => {
	before(launch);
	after(close);

	it("lists the #top posts in the order of their #top-N tags", async () => {
		const { page, dispose } = await open();
		const titles = await page.locator(".top__item .tile__title").allTextContents();
		assert.deepEqual(titles, [
			"Overwatch est-il en train de renaître ?",
			"Anglais ou français, quelle est la véritable VO de Clair Obscur : Expedition 33 ?",
			"Rockstar persiste à ne pas proposer de VF pour GTA VI et c’est un problème",
			"Mon top des jeux auquel j’ai joué en 2025",
			"Bluesky peut-il devenir le Twitter de demain ?",
		]);
		await dispose();
	});

	it("is absent when no post carries #top", async () => {
		const { page, dispose } = await open({ render: home({ site: { top: false } }) });
		assert.equal(await page.locator(".top").count(), 0);
		await dispose();
	});
});

describe("rows by tag", () => {
	before(launch);
	after(close);

	const rows = page =>
		page.$$eval(".row", sections =>
			sections.map(s => [s.className.match(/row--(\w+)/)[1], s.querySelector("h2").textContent.trim()]),
		);

	it("follow the theme's sequence of forms with the most used tags", async () => {
		const { page, dispose } = await open();
		assert.deepEqual(await rows(page), [
			["shelf", "Jeux vidéo"],
			["tags", "Tags"],
			["posters", "VF"],
			["list", "Actualité"],
			["banner", "Anime"],
			["feature", "Informatique"],
		]);
		await dispose();
	});

	it("use the tags pinned in the settings, and drop a row whose tag does not exist", async () => {
		const custom = {
			home_row_1: "jeux-video",
			home_row_2: "anime",
			home_row_3: "actualites",
			home_row_4: "none",
			home_row_5: "dossiers",
		};
		const { page, dispose } = await open({ render: home({ custom }) });
		assert.deepEqual(await rows(page), [
			["shelf", "Jeux vidéo"],
			["tags", "Tags"],
			["posters", "Anime"],
			["list", "Actualité"],
			["feature", "Dossier"],
		]);
		await dispose();
	});
});

describe("one wording for the same things", () => {
	before(launch);
	after(close);

	it("empties the saved list with the same button label on the home and on « Mes favoris »", async () => {
		const homeList = await open({ render: home({ member: true, locale: "fr" }) });
		const onHome = await homeList.page.locator("[data-list-clear]").textContent();
		await homeList.dispose();
		const saved = await open({ render: template("page-favoris", { member: true, locale: "fr" }) });
		const onSaved = await saved.page.locator("[data-saved-clear]").textContent();
		await saved.dispose();
		assert.equal(onHome, "Tout retirer");
		assert.equal(onSaved, onHome);
	});

	it("calls the tags « Tags » on the home, in the header and in the banner", async () => {
		const { page, dispose } = await open({ render: home({ locale: "fr", custom: { home_row_4: "ia" } }) });
		assert.equal(await page.locator(".row--tags h2").textContent(), "Tags");
		assert.equal(await page.locator("nav.nav-pills").getAttribute("aria-label"), "Tags");
		assert.match(await page.locator(".banner__kicker").innerText(), /^Tag\s*·\s*\d+ articles$/);
		await dispose();
	});
});

describe("« Derniers articles » list", () => {
	before(launch);
	after(close);

	it("labels the list of the next posts with its own name, not a button's", async () => {
		const { page, dispose } = await open({ render: home({ locale: "fr" }) });
		assert.equal(await page.locator(".latest__list").getAttribute("aria-label"), "Autres articles récents");
		await dispose();
	});

	it("says « Aucun article » instead of showing an empty section on a site without posts", async () => {
		const none = s => {
			s.posts = [];
		};
		const { page, dispose } = await open({ render: home({ locale: "fr", site: { adjust: none } }) });
		assert.equal(await page.locator(".latest .latest__empty").textContent(), "Aucun article");
		assert.equal(await page.locator(".latest__grid").count(), 0);
		await dispose();

		const listing = await open({ render: paged(2, { locale: "fr", site: { adjust: none } }) });
		assert.equal(await listing.page.locator(".post-grid .latest__empty").textContent(), "Aucun article");
		await listing.dispose();
	});
});

describe("rows with only some tags pinned", () => {
	before(launch);
	after(close);

	it("never show a pinned tag twice: the row that would fall back on it is left out", async () => {
		// « Anime » is the 4th most used tag: pinned for the first row, it must not fill the 4th row too
		const custom = { home_row_1: "anime" };
		const { page, dispose } = await open({ render: home({ custom }) });
		const rows = await page.$$eval(".row", sections =>
			sections.map(s => [s.className.match(/row--(\w+)/)[1], s.querySelector("h2").textContent.trim()]),
		);
		assert.deepEqual(rows, [
			["shelf", "Anime"],
			["tags", "Tags"],
			["posters", "VF"],
			["list", "Actualité"],
			["feature", "Informatique"],
		]);
		const ids = await page.$$eval("[id^=row-]", els => els.map(e => e.id));
		assert.equal(new Set(ids).size, ids.length, `ids ${ids.join()}`);
		await dispose();
	});
});

describe("tags without posts", () => {
	before(launch);
	after(close);

	// Only the three first tags keep their posts: the six most used tags then hold three empty ones
	const emptyTags = s => {
		for (const tag of s.tags.filter(t => t.visibility === "public").slice(3)) tag.count = { posts: 0 };
	};
	const withPosts = ["Actualité", "Jeux vidéo", "VF"].sort();

	it("stay out of the « Tags » tiles, the discover panel and the About page", async () => {
		const { page, dispose } = await open({ render: home({ site: { adjust: emptyTags } }) });
		assert.deepEqual(
			(await page.$$eval(".tag-grid .tag-tile__name", names => names.map(n => n.textContent.trim()))).sort(),
			withPosts,
			"home tiles",
		);
		const discover = await page.$$eval(".discover__tag", links => links.map(a => a.textContent.trim()));
		assert.deepEqual(discover.slice(0, 3).sort(), withPosts);
		assert.equal(discover.length % 3, 0, "only the tags with posts, in each of the two panels");
		assert.ok(discover.length > 0 && discover.every(name => withPosts.includes(name)), discover.join());
		await dispose();

		const about = await open({ render: template("page-a-propos", { site: { adjust: emptyTags } }) });
		assert.deepEqual(
			(await about.page.$$eval(".about-rubric__name", names => names.map(n => n.textContent.trim()))).sort(),
			withPosts,
		);
		await about.dispose();
	});
});

describe("home layout", () => {
	before(launch);
	after(close);

	it("does not overflow horizontally on a phone", async () => {
		for (const member of [false, true]) {
			const { page, dispose } = await open({
				render: home({ member }),
				viewport: { width: 390, height: 800 },
				storage: { "attibling-progress": JSON.stringify(PROGRESS) },
			});
			await page.waitForTimeout(100);
			const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
			assert.ok(scrollWidth <= 390, `page is ${scrollWidth}px wide in a 390px viewport (member: ${member})`);
			await dispose();
		}
	});

	it("shows « Latest posts » as a lead card and six rows as tall as it", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		const box = await page.evaluate(() => {
			const lead = document.querySelector(".lead").getBoundingClientRect();
			const list = document.querySelector(".latest__list").getBoundingClientRect();
			return { rows: document.querySelectorAll(".latest__list li").length, lead: lead.height, list: list.height };
		});
		assert.equal(box.rows, 6);
		assert.ok(Math.abs(box.lead - box.list) < 2, `lead ${box.lead}px, list ${box.list}px`);
		await dispose();
	});

	it("writes « Page 2 sur N » and « 1 sur 6: titre » in French, with the number in the sentence", async () => {
		const { page, dispose } = await open({ render: paged(2, { locale: "fr" }) });
		assert.match(await page.locator(".pagination__status").textContent(), /^Page 2 sur \d+$/);
		assert.match(await page.locator(".page-heading__note").textContent(), /^Page 2 sur \d+$/);
		await dispose();
		const hero = await open({ render: home({ locale: "fr" }) });
		assert.match(await hero.page.locator("[data-hero-dot] .sr-only").first().textContent(), /^1 sur 6: \S/);
		await hero.dispose();
	});

	it("shows page 2 and after as a plain grid without the hero", async () => {
		const { page, dispose } = await open({ render: paged(2) });
		assert.equal(await page.locator("[data-hero]").count(), 0);
		assert.equal(await page.locator("h1").textContent(), "All posts");
		assert.equal(await page.locator(".post-grid > li").count(), 7);
		assert.equal(await page.locator(".pagination a[rel=prev]").getAttribute("href"), "/");
		await dispose();
	});
});

describe("shelf alignment", () => {
	before(launch);
	after(close);

	// The shelf's padding is the container's margin: it must follow the width the page really has, not the
	// window's (100vw counts the scrollbar: ~15 px of misalignment with classic scrollbars)
	const edges = page =>
		page.evaluate(() => {
			const shelf = document.querySelector(".row--shelf");
			const container = shelf.querySelector(".container");
			const style = getComputedStyle(container);
			const box = container.getBoundingClientRect();
			const tile = shelf.querySelector(".shelf__item").getBoundingClientRect();
			return {
				scrollbar: innerWidth - document.documentElement.clientWidth,
				contentStart: box.left + parseFloat(style.paddingLeft),
				contentEnd: box.right - parseFloat(style.paddingRight),
				tileStart: tile.left,
				tileEnd: tile.right,
			};
		});

	// The container's margin only exceeds the gutter once the window is wider than 1440 px (--page-max)
	it("starts the first tile at the container's content edge with classic scrollbars", async () => {
		for (const width of [1440, 1600, 1920]) {
			const { page, dispose } = await open({ viewport: { width, height: 900 }, classicScrollbars: true });
			const e = await edges(page);
			assert.ok(e.scrollbar > 0, `scrollbars take room (${e.scrollbar} px)`);
			assert.ok(
				Math.abs(e.tileStart - e.contentStart) < 0.5,
				`${width}px: tile at ${e.tileStart}, container at ${e.contentStart}`,
			);
			await dispose();
		}
	});

	it("ends it at the container's content edge in a right-to-left language", async () => {
		const { page, dispose } = await open({
			render: home({ locale: "ar" }),
			viewport: { width: 1600, height: 900 },
			classicScrollbars: true,
		});
		assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
		const e = await edges(page);
		assert.ok(Math.abs(e.tileEnd - e.contentEnd) < 0.5, `tile ends at ${e.tileEnd}, container at ${e.contentEnd}`);
		await dispose();
	});
});
