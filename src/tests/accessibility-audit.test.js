// Fixes of the accessibility audit (WCAG 2.2 AA): modal phone panels, reflow at 320 px, Ghost's
// members-only call to action, series labels, titles and headings, contrast and forced colours.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, sleep } from "./support/harness.js";
import { home, paged, template } from "./support/pages.js";
import { article, MEMBER } from "./support/article.js";

const PHONE = { width: 390, height: 844 };

const withoutPopover = () => {
	for (const name of ["popover", "showPopover", "hidePopover", "togglePopover"]) delete HTMLElement.prototype[name];
	for (const name of ["popoverTargetElement", "popoverTargetAction"]) delete HTMLButtonElement.prototype[name];
};

// Presses Tab `times` times and returns where the focus went each time: inside the panel, on the
// <body> (the end of the tab order: next stop the browser's own controls), or elsewhere on the page
const tabTrail = async (page, selector, times) => {
	const trail = [];
	for (let i = 0; i < times; i++) {
		await page.keyboard.press("Tab");
		trail.push(
			await page.evaluate(sel => {
				const el = document.activeElement;
				if (!el || el === document.body) return "body";
				return el.closest(sel) ? "panel" : `page: ${el.outerHTML.slice(0, 80)}`;
			}, selector),
		);
	}
	return trail;
};

const inertCount = page => page.evaluate(() => document.querySelectorAll("[inert]:not([data-hero-slide])").length);

// WCAG relative luminance contrast of two CSS colours (resolved by a canvas)
const contrast = (page, a, b) =>
	page.evaluate(
		([x, y]) => {
			const rgb = color => {
				const ctx = document.createElement("canvas").getContext("2d");
				ctx.fillStyle = color;
				ctx.fillRect(0, 0, 1, 1);
				return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
			};
			const lum = c =>
				c
					.map(v => v / 255)
					.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
					.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
			const [l1, l2] = [lum(rgb(x)), lum(rgb(y))];
			return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		},
		[a, b],
	);

describe("accessibility audit: modal panels on phones", () => {
	before(launch);
	after(close);

	for (const initScript of [null, withoutPopover]) {
		it(`keeps the focus in the phone menu until it closes${initScript ? " (no Popover API)" : ""}`, async () => {
			const { page, dispose } = await open({ viewport: PHONE, initScript });
			const button = page.locator("[data-menu-button]");
			await button.focus();
			await page.keyboard.press("Enter");
			assert.equal(
				await waitFor(() => page.evaluate(() => document.activeElement.hasAttribute("data-menu-close"))),
				true,
			);
			assert.equal(await page.locator("[data-mobile-menu]").getAttribute("role"), "dialog");
			assert.equal(await page.locator("[data-mobile-menu]").getAttribute("aria-label"), "Menu");
			const trail = await tabTrail(page, "[data-mobile-menu]", 30);
			assert.deepEqual(
				trail.filter(t => t.startsWith("page")),
				[],
				"Tab never reaches the page hidden under the sheet",
			);
			assert.ok(trail.filter(t => t === "panel").length >= 10, "Tab goes through the sheet");
			assert.ok((await inertCount(page)) > 0, "the page is inert");

			await page.keyboard.press("Escape");
			assert.equal(
				await waitFor(() => page.evaluate(() => document.activeElement.hasAttribute("data-menu-button"))),
				true,
				"focus back on the menu button",
			);
			assert.equal(await inertCount(page), 0, "the page is released");
			await dispose();
		});
	}

	it("keeps the focus in the display settings sheet on phones, not in the popover on wide screens", async () => {
		const { page, dispose } = await open({ render: article({ member: true }), viewport: PHONE, hasTouch: true });
		const gear = page.locator("[data-reading-button]");
		await gear.focus();
		await page.keyboard.press("Enter");
		await page.waitForFunction(() => document.querySelector("[data-reading-settings]").matches(":popover-open"));
		assert.equal(await waitFor(() => page.evaluate(() => document.activeElement.id)), "reading-theme");
		assert.equal(await page.locator("[data-reading-settings]").getAttribute("aria-modal"), "true");
		const trail = await tabTrail(page, "[data-reading-settings]", 45);
		assert.deepEqual(
			trail.filter(t => t.startsWith("page")),
			[],
			"Tab never reaches the article under the sheet",
		);
		await page.keyboard.press("Escape");
		assert.equal(
			await waitFor(() => page.evaluate(() => document.activeElement.matches("[data-reading-button]"))),
			true,
			"focus back on the gear",
		);
		assert.equal(await inertCount(page), 0);
		assert.equal(await page.locator("[data-reading-settings]").getAttribute("aria-modal"), null);
		await dispose();

		const wide = await open({ render: article({ member: true }), viewport: { width: 1440, height: 900 } });
		await wide.page.locator("[data-reading-button]").click();
		await wide.page.waitForFunction(() => document.querySelector("[data-reading-settings]").matches(":popover-open"));
		assert.equal(await inertCount(wide.page), 0, "beside the page: a non-modal popover");
		await wide.dispose();
	});
});

describe("accessibility audit: reflow", () => {
	before(launch);
	after(close);

	const cases = {
		"home, visitor": home(),
		"home, member": home({ member: true }),
		"post, visitor": article(),
		"post, member (settings gear)": article({ member: true }),
		tag: template("tag"),
	};
	for (const [name, render] of Object.entries(cases)) {
		it(`fits a 320 px screen without scrolling sideways (${name})`, async () => {
			const { page, dispose } = await open({ render, viewport: { width: 320, height: 700 } });
			const fit = await page.evaluate(() => ({
				page: document.documentElement.scrollWidth,
				bar: document.querySelector(".site-header__bar").scrollWidth,
				menu: Math.round(document.querySelector("[data-menu-button]").getBoundingClientRect().right),
			}));
			assert.ok(fit.page <= 320, `page ${fit.page}px wide`);
			assert.ok(fit.bar <= 320, `header bar ${fit.bar}px wide`);
			assert.ok(fit.menu <= 320, `menu button ends at ${fit.menu}px`);
			// What left the bar is in the menu sheet
			await page.locator("[data-menu-button]").click();
			assert.equal(
				await page.locator("[data-mobile-menu] .mobile-menu__footer :is(.button)").first().isVisible(),
				true,
			);
			await dispose();
		});
	}

	it("keeps « Subscribe » in the bar from 375 px", async () => {
		const { page, dispose } = await open({ viewport: { width: 375, height: 700 } });
		assert.equal(await page.locator(".site-header__subscribe").isVisible(), true);
		assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375);
		await dispose();
	});
});

// A members-only post as Ghost gives it to a reader without access: html is the public preview only
const restricted = ({ visibility = "members", member = false, tiers = [], pages } = {}) => {
	const render = article({
		member,
		html: "<p>Le début de l’article, public.</p>",
		...(pages ? { pages } : {}),
	});
	Object.assign(render.context.post, { access: false, visibility, tiers });
	if (member) render.member = { ...MEMBER };
	return render;
};

describe("accessibility audit: members-only call to action", () => {
	before(launch);
	after(close);

	const cta = page =>
		page.evaluate(() => {
			const box = document.querySelector("[data-members-cta]");
			if (!box) return null;
			const links = [...box.querySelectorAll("a")].map(a => ({
				text: a.textContent.trim(),
				href: a.getAttribute("href"),
				color: getComputedStyle(a).color,
				background: getComputedStyle(a).backgroundColor,
			}));
			return {
				lang: document.documentElement.lang,
				preview: document.querySelector("[data-article-content] > p")?.textContent,
				title: box.querySelector("h2").textContent.replace(/\s+/g, " ").trim(),
				text: box.textContent.replace(/\s+/g, " ").trim(),
				links,
				inlineStyles: box.querySelectorAll("[style]").length,
				ghostBox: document.querySelectorAll(".gh-post-upgrade-cta").length,
				surface: getComputedStyle(box).backgroundColor,
				inToc: [...document.querySelectorAll("[data-toc-list] a")].some(a => /réservé/.test(a.textContent)),
			};
		});

	it("is the theme's box, in French, under the public preview", async () => {
		const { page, dispose } = await open({
			render: restricted({ pages: [{ id: "n", title: "Newsletter", slug: "newsletter", url: "/newsletter/" }] }),
		});
		const box = await cta(page);
		assert.equal(box.preview, "Le début de l’article, public.");
		assert.equal(box.ghostBox, 0, "not Ghost's default box");
		assert.equal(box.inlineStyles, 0, "no inline colours (Ghost's accent)");
		assert.equal(box.title, "Cet article est réservé aux abonnés");
		assert.match(box.text, /Déjà abonné \? Se connecter$/);
		assert.deepEqual(
			box.links.map(l => [l.text, l.href]),
			[
				["S'abonner", "/newsletter/#inscription"],
				["Se connecter", "/newsletter/#connexion"],
			],
		);
		assert.equal(box.inToc, false, "its heading is not a section of the table of contents");
		await dispose();
	});

	for (const colorScheme of ["light", "dark"]) {
		it(`has AA contrast for its button and link (${colorScheme})`, async () => {
			const { page, dispose } = await open({ render: restricted(), colorScheme });
			const box = await cta(page);
			const [button, link] = box.links;
			assert.ok((await contrast(page, button.color, button.background)) >= 4.5, "button text");
			assert.ok((await contrast(page, link.color, box.surface)) >= 4.5, "sign-in link");
			await dispose();
		});
	}

	it("sends a visitor to Portal for a paid post, and a member without access to the plans", async () => {
		const visitor = await open({ render: restricted({ visibility: "paid" }) });
		const a = await cta(visitor.page);
		assert.equal(a.title, "Cet article est réservé aux abonnés payants");
		assert.equal(a.links[0].href, "#/portal/signup");
		await visitor.dispose();

		const member = await open({
			render: restricted({ visibility: "tiers", member: true, tiers: [{ name: "Or" }, { name: "Platine" }] }),
		});
		const b = await cta(member.page);
		assert.equal(b.title, "Cet article est réservé aux abonnés de ces offres : Or et Platine");
		assert.deepEqual(
			b.links.map(l => [l.text, l.href]),
			[["Changer d’abonnement", "#/portal/account/plans"]],
		);
		await member.dispose();
	});
});

describe("accessibility audit: names, titles and headings", () => {
	before(launch);
	after(close);

	it("names the series links after their visible label, and the two series landmarks differently", async () => {
		const { page, dispose } = await open({
			render: article({ series: { published: 4, current: 2, description: "Construire son homelab" } }),
		});
		const result = await page.evaluate(() => ({
			links: [...document.querySelectorAll(".series-step__link")]
				.filter(a => a.checkVisibility())
				.map(a => [a.querySelector(".series-step__label").textContent, a.getAttribute("aria-label")]),
			// Landmarks exposed now (the closed menu sheet's are not)
			navs: [...document.querySelectorAll("nav")]
				.filter(nav => nav.checkVisibility())
				.map(
					nav =>
						nav.getAttribute("aria-label") ||
						document.getElementById(nav.getAttribute("aria-labelledby"))?.textContent.replace(/\s+/g, " ").trim(),
				),
		}));
		for (const [label, name] of result.links) assert.ok(name.startsWith(label), `« ${name} » starts with « ${label} »`);
		assert.equal(new Set(result.navs).size, result.navs.length, `unique landmark names: ${result.navs}`);
		await dispose();
	});

	it("titles the 404 page « Page non trouvée »", async () => {
		const { page, dispose } = await open({ render: template("error-404", { locale: "fr" }) });
		assert.match(await page.title(), /^Page non trouvée - /);
		await dispose();
	});

	it("gives the tiles of home page 2 h2 titles under the h1", async () => {
		const { page, dispose } = await open({ render: paged(2) });
		const levels = await page.$$eval("main :is(h1, h2, h3)", els => els.map(el => el.tagName));
		assert.equal(levels[0], "H1");
		assert.ok(levels.length > 2 && levels.slice(1).every(l => l === "H2"), levels.join(" "));
		await dispose();
	});
});

describe("accessibility audit: contrast, forced colours, obscured focus", () => {
	before(launch);
	after(close);

	it("draws form fields with a border of at least 3:1 on the light page", async () => {
		const { page, dispose } = await open({ colorScheme: "light" });
		const [border, bg] = await page.evaluate(() => {
			const cs = getComputedStyle(document.documentElement);
			return [cs.getPropertyValue("--color-border-strong"), getComputedStyle(document.body).backgroundColor];
		});
		assert.ok((await contrast(page, border.trim(), bg)) >= 3);
		await dispose();
	});

	it("frames the current navigation item in forced colours", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		await page.emulateMedia({ forcedColors: "active" });
		const outline = await page.$eval(".site-nav [aria-current=page]", a => getComputedStyle(a).outlineStyle);
		assert.equal(outline, "solid");
		await dispose();
	});

	it("puts the second tag over the header image on a dark pill", async () => {
		const { page, dispose } = await open({ render: article() });
		const link = await page.$eval(".article-header__tag-link", a => ({
			color: getComputedStyle(a).color,
			background: getComputedStyle(a).backgroundColor,
		}));
		// The pill over a white pixel: the worst case
		const over = await page.evaluate(({ background }) => {
			const [r, g, b, alpha] = background.match(/[\d.]+/g).map(Number);
			const mix = c => Math.round(c * alpha + 255 * (1 - alpha));
			return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
		}, link);
		assert.ok((await contrast(page, link.color, over)) >= 4.5, `${link.color} on ${over}`);
		await dispose();
	});

	it("scrolls a focused control near the bottom above the « back to top » button", async () => {
		const { page, dispose } = await open({
			render: article({
				html: `${"<p>Texte.</p>".repeat(60)}<p><a href="/x/">Un lien</a></p>${"<p>Fin.</p>".repeat(30)}`,
			}),
		});
		// Scrolled into view at the bottom edge, as the browser does when Tab reaches it
		const [link, button] = await page.evaluate(() => {
			const a = document.querySelector('[data-article-content] a[href="/x/"]');
			a.scrollIntoView({ block: "end", behavior: "instant" });
			return [a.getBoundingClientRect().bottom, document.querySelector(".progress-button").getBoundingClientRect().top];
		});
		assert.ok(link + 6 <= button, `link ends at ${link}, its ring above the button at ${button}`);
		await dispose();
	});

	it("hides the hero dot's title preview on Escape", async () => {
		const { page, dispose } = await open({ viewport: { width: 1440, height: 900 } });
		// The first dot is the current one (no preview); Tab reaches the second without showing its slide
		await page.locator("[data-hero-dot]").nth(0).focus();
		await page.keyboard.press("Tab");
		const dot = page.locator("[data-hero-dot]").nth(1);
		assert.equal(await dot.evaluate(d => d === document.activeElement && !d.hasAttribute("aria-current")), true);
		const preview = () => dot.evaluate(d => getComputedStyle(d.querySelector(".hero__dot-preview")).opacity);
		await sleep(300);
		assert.equal(await preview(), "1", "shown on keyboard focus");
		await page.keyboard.press("Escape");
		await sleep(300);
		assert.equal(await preview(), "0", "hidden on Escape");
		await dispose();
	});
});
