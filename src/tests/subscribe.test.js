// « S'abonner » and « Se connecter » lead to the theme's subscription page (partials/subscribe-href.hbs,
// src/js/portal-links.js), and the page itself (partials/pages/subscribe.hbs, src/js/newsletter.js):
// name and e-mail, polite validation, the sign-in state, a surface that follows the light / dark mode.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { home, template, DEFAULT_CUSTOM } from "./support/pages.js";
import { article } from "./support/article.js";

const NEWSLETTER = [{ id: "page-nl", title: "Newsletter", slug: "newsletter", url: "/newsletter/" }];
const PHONE = { width: 390, height: 844 };

// Every « S'abonner » / « Se connecter » of a page: [selector, href, data-portal]
const links = page =>
	page.evaluate(() =>
		[
			".site-header__subscribe",
			".mobile-menu__footer a",
			".hero__subscribe",
			".promo__subscribe",
			".promo__signin a",
			".summary-teaser .button",
			".summary-teaser__login",
			".saved-visitor__actions a",
			".about-follow__subscribe",
		].flatMap(sel =>
			[...document.querySelectorAll(sel)].map(a => [sel, a.getAttribute("href"), a.getAttribute("data-portal")]),
		),
	);

describe("« S'abonner » and « Se connecter » destinations", () => {
	before(launch);
	after(close);

	it("lead to the page with the slug newsletter without any setting, never to Portal", async () => {
		const seen = [];
		for (const render of [
			home({ pages: NEWSLETTER }),
			{ ...article({ pages: NEWSLETTER, html: '<ol class="en-bref"><li>Un point.</li></ol><p>Texte.</p>' }) },
			template("page-favoris", { pages: NEWSLETTER }),
			template("page-a-propos", { pages: NEWSLETTER }),
		]) {
			const { page, dispose } = await open({ render });
			for (const [sel, href, portal] of await links(page)) {
				seen.push(sel);
				assert.equal(portal, null, `${sel}: no data-portal`);
				const signin = [".promo__signin a", ".summary-teaser__login"].includes(sel);
				const either = sel === ".saved-visitor__actions a"; // « S'abonner » and « Se connecter »
				const expected = either
					? /^\/newsletter\/#(inscription|connexion)$/
					: signin
						? /^\/newsletter\/#connexion$/
						: /^\/newsletter\/#inscription$/;
				// The promo's « Se connecter » is a Portal link of partials/home/, rerouted by portal-links.js
				assert.match(href.replace("http://theme.test", ""), expected, `${sel}: ${href}`);
			}
			const saved = await page.$$eval(".saved-visitor__actions a", as => as.map(a => a.getAttribute("href")));
			if (saved.length) assert.deepEqual(saved, ["/newsletter/#inscription", "/newsletter/#connexion"]);
			const portalLinks = await page
				.locator('a[data-portal="signup"], a[data-portal="signin"], a[href*="#/portal/sign"]')
				.count();
			assert.equal(portalLinks, 0, "no Portal sign-up / sign-in link left");
			await dispose();
		}
		for (const sel of [
			".site-header__subscribe",
			".mobile-menu__footer a",
			".hero__subscribe",
			".promo__subscribe",
			".promo__signin a",
			".summary-teaser .button",
			".summary-teaser__login",
			".saved-visitor__actions a",
			".about-follow__subscribe",
		]) {
			assert.ok(seen.includes(sel), `${sel} was checked`);
		}
	});

	it("the setting subscribe_url wins, then the pages abonnement / subscribe, then Portal as the last resort", async () => {
		const header = async render => {
			const { page, dispose } = await open({ render });
			const link = await page.evaluate(() => {
				const a = document.querySelector(".site-header__subscribe");
				return [a.getAttribute("href"), a.getAttribute("data-portal"), a.hasAttribute("data-subscribe-page")];
			});
			await dispose();
			return link;
		};
		assert.deepEqual(
			await header(home({ pages: NEWSLETTER, custom: { ...DEFAULT_CUSTOM, subscribe_url: "/rejoindre/" } })),
			["/rejoindre/#inscription", null, true],
		);
		assert.deepEqual(
			await header(home({ pages: [{ id: "p", title: "Abonnement", slug: "abonnement", url: "/abonnement/" }] })),
			["/abonnement/#inscription", null, true],
		);
		assert.deepEqual(
			await header(home({ pages: [{ id: "p", title: "Subscribe", slug: "subscribe", url: "/subscribe/" }] })),
			["/subscribe/#inscription", null, true],
		);
		assert.deepEqual(
			await header(home({ pages: [{ id: "p", title: "À propos", slug: "a-propos", url: "/a-propos/" }] })),
			["#/portal/signup", "signup", false],
			"no subscription page: Portal, so the button still works",
		);
	});

	it("a Portal link typed in a post goes to the page too; the account link keeps Portal", async () => {
		const { page, dispose } = await open({
			render: article({
				member: false,
				pages: NEWSLETTER,
				html: '<p><a href="#/portal/signup">Abonnez-vous</a> ou <a href="#/portal/signin" data-portal="signin">connectez-vous</a>.</p><p><a href="#/portal/account">Compte</a></p>',
			}),
		});
		const hrefs = await page.$$eval(".gh-content a", as =>
			as.map(a => [a.getAttribute("href"), a.getAttribute("data-portal")]),
		);
		assert.deepEqual(hrefs, [
			["http://theme.test/newsletter/#inscription", null],
			["http://theme.test/newsletter/#connexion", null],
			["#/portal/account", null],
		]);
		await dispose();
	});

	it("clicking « S'abonner » in the header lands on the form, its first field focused", async () => {
		for (const viewport of [{ width: 1440, height: 900 }, PHONE]) {
			const { page, dispose } = await open({
				render: home({ pages: NEWSLETTER }),
				viewport,
				pages: { "/newsletter/": template("page-newsletter", { pages: NEWSLETTER }) },
			});
			if (viewport.width < 700) {
				await page.locator("[data-menu-button]").click();
				await page.locator(".mobile-menu__footer a").click();
			} else {
				await page.locator(".site-header__subscribe").click();
			}
			await page.waitForURL("**/newsletter/#inscription");
			assert.equal(await waitFor(() => page.evaluate(() => document.activeElement?.id)), "subscribe-name");
			assert.equal(await page.evaluate(() => window.scrollY), 0);
			assert.equal(await page.locator("iframe").count(), 0);
			await dispose();
		}
	});
});

describe("subscription page", () => {
	before(launch);
	after(close);

	const fr = options => ({ ...template("page-newsletter", { pages: NEWSLETTER, ...options }), locale: "fr" });

	it("asks for the name (optional) then the e-mail address, with labels and autocomplete", async () => {
		const { page, dispose } = await open({ render: fr() });
		const fields = await page.$$eval("[data-subscribe-form] input", inputs =>
			inputs.map(i => ({
				id: i.id,
				type: i.type,
				autocomplete: i.autocomplete,
				required: i.required,
				hook: i.hasAttribute("data-members-name") ? "name" : i.hasAttribute("data-members-email") ? "email" : null,
				label: document.querySelector(`label[for="${i.id}"]`)?.textContent.replace(/\s+/g, " ").trim(),
			})),
		);
		assert.deepEqual(fields, [
			{
				id: "subscribe-name",
				type: "text",
				autocomplete: "name",
				required: false,
				hook: "name",
				label: "Votre nom (facultatif)",
			},
			{
				id: "subscribe-email",
				type: "email",
				autocomplete: "email",
				required: true,
				hook: "email",
				label: "Votre adresse e-mail",
			},
		]);
		await dispose();
	});

	it("checks the address politely before Ghost: a message under the field, focus, nothing sent", async () => {
		const { page, dispose } = await open({ render: fr() });
		await page.evaluate(() => {
			window.__sent = 0;
			// Stands for Ghost's own handler on the form
			document.querySelector("[data-subscribe-form]").addEventListener("submit", e => {
				e.preventDefault();
				window.__sent++;
			});
		});
		const state = () =>
			page.evaluate(() => {
				const form = document.querySelector("[data-subscribe-form]");
				const email = form.querySelector("#subscribe-email");
				const error = form.querySelector(".subscribe-form__error");
				return {
					sent: window.__sent,
					error: error.offsetParent ? error.innerText.trim() : null,
					invalid: email.getAttribute("aria-invalid"),
					focus: document.activeElement.id,
				};
			});
		await page.locator("[data-subscribe-form] button[type=submit]").click();
		assert.deepEqual(await state(), {
			sent: 0,
			error: "Veuillez saisir votre adresse e-mail",
			invalid: "true",
			focus: "subscribe-email",
		});
		await page.locator("#subscribe-email").fill("pas-une-adresse");
		await page.keyboard.press("Enter");
		assert.deepEqual(await state(), {
			sent: 0,
			error: "Veuillez entrer une adresse e-mail valide",
			invalid: "true",
			focus: "subscribe-email",
		});
		await page.locator("#subscribe-name").fill("Alex");
		await page.locator("#subscribe-email").fill("alex@example.com");
		assert.equal((await state()).error, null, "the message goes once the address is right");
		await page.locator("[data-subscribe-form] button[type=submit]").click();
		const sent = await state();
		assert.deepEqual([sent.sent, sent.error, sent.invalid], [1, null, null], "a valid address goes to Ghost");
		await dispose();
	});

	it("shows Ghost's form states: loading, success (focused), error", async () => {
		for (const selector of ["[data-subscribe-form]", "[data-signin-form]"]) {
			const { page, dispose } = await open({ render: fr() });
			if (selector === "[data-signin-form]") await page.locator("[data-subscribe-switch]").first().click();
			const state = cls =>
				page.evaluate(
					([sel, c]) => {
						const form = document.querySelector(sel);
						form.className = `subscribe-form ${c}`;
						const visible = s => Boolean(form.querySelector(s)?.offsetParent);
						return {
							spinner: visible(".subscribe-form__spinner"),
							fields: visible(".subscribe-form__fields"),
							success: visible(".subscribe-form__success"),
							error: visible(".subscribe-form__error"),
						};
					},
					[selector, cls],
				);
			assert.deepEqual(await state(""), { spinner: false, fields: true, success: false, error: false });
			assert.deepEqual(await state("loading"), { spinner: true, fields: true, success: false, error: false });
			assert.deepEqual(await state("success"), { spinner: false, fields: false, success: true, error: false });
			assert.ok(
				await waitFor(() => page.evaluate(() => document.activeElement?.hasAttribute("data-form-success"))),
				`${selector}: the success message gets the focus`,
			);
			assert.deepEqual(await state("error"), { spinner: false, fields: true, success: false, error: true });
			await dispose();
		}
	});

	it("has a sign-in state (#connexion) with Ghost's sign-in form, and switches back", async () => {
		const { page, dispose } = await open({
			render: home({ pages: NEWSLETTER }),
			pages: { "/newsletter/": fr() },
		});
		await page.goto("http://theme.test/newsletter/#connexion");
		const view = () =>
			page.evaluate(() => ({
				signup: Boolean(document.querySelector("[data-subscribe-panel=signup]").offsetParent),
				signin: Boolean(document.querySelector("[data-subscribe-panel=signin]").offsetParent),
				h1: [...document.querySelectorAll("h1")].filter(h => h.offsetParent).map(h => h.textContent.trim()),
				focus: document.activeElement.id,
			}));
		assert.deepEqual(await waitFor(async () => ((await view()).focus === "signin-email" ? view() : null)), {
			signup: false,
			signin: true,
			h1: ["Se connecter à Geekly"],
			focus: "signin-email",
		});
		assert.equal(
			await page.locator('form[data-members-form="signin"] input[data-members-email][type=email]').count(),
			1,
		);
		await page.locator("[data-subscribe-panel=signin] [data-subscribe-switch]").click();
		assert.deepEqual(await waitFor(async () => ((await view()).focus === "subscribe-name" ? view() : null)), {
			signup: true,
			signin: false,
			h1: ["S'abonner à Geekly"],
			focus: "subscribe-name",
		});
		await page.locator("[data-subscribe-panel=signup] [data-subscribe-switch]").click();
		assert.equal((await view()).signin, true);
		await dispose();
	});

	it("shows the sign-in state without JavaScript too (CSS :target)", async () => {
		const { page, dispose } = await open({ render: home({ pages: NEWSLETTER }), pages: { "/newsletter/": fr() } });
		await page.route("**/assets/js/newsletter.js", route => route.abort());
		await page.goto("http://theme.test/newsletter/#connexion");
		assert.equal(await page.locator("[data-subscribe-panel=signin]").isVisible(), true);
		assert.equal(await page.locator("[data-subscribe-panel=signup]").isVisible(), false);
		await dispose();
	});

	it("follows the light and dark mode: page surface, AA text, no forced dark band", async () => {
		const colours = {};
		for (const mode of ["light", "dark"]) {
			const { page, dispose } = await open({ render: fr(), storage: { theme: mode } });
			const view = await page.evaluate(() => {
				const rgb = v =>
					v
						.match(/[\d.]+/g)
						.slice(0, 3)
						.map(Number);
				const lum = ([r, g, b]) => {
					const c = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
					return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
				};
				const ratio = (a, b) => {
					const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
					return (x + 0.05) / (y + 0.05);
				};
				const bg = getComputedStyle(document.documentElement).backgroundColor;
				const hero = getComputedStyle(document.querySelector(".subscribe-hero"));
				const min = [
					".subscribe-hero__title",
					".subscribe-hero__lead",
					".subscribe-field__label",
					".subscribe-field__optional",
					".subscribe-form__hint",
					".subscribe-hero__switch",
					".subscribe-hero__switch a",
					".subscribe-benefit__title",
					".subscribe-benefit__text",
					".subscribe-hero__tools-title",
				].map(s => [s, Math.round(ratio(getComputedStyle(document.querySelector(s)).color, bg) * 100) / 100]);
				const input = getComputedStyle(document.querySelector("#subscribe-email"));
				return {
					bg,
					heroBg: hero.backgroundColor,
					scheme: hero.colorScheme,
					min,
					input: ratio(input.color, input.backgroundColor),
				};
			});
			colours[mode] = view.bg;
			assert.equal(view.heroBg, "rgba(0, 0, 0, 0)", `${mode}: the section shows the page surface`);
			if (mode === "light") assert.notEqual(view.scheme, "dark", "light: not forced dark");
			for (const [sel, r] of view.min) assert.ok(r >= 4.5, `${mode} ${sel}: ${r}:1`);
			assert.ok(view.input >= 4.5, `${mode}: field text ${view.input}`);
			await dispose();
		}
		assert.equal(colours.light, "rgb(244, 245, 247)");
		assert.equal(colours.dark, "rgb(11, 12, 15)");
	});

	it("has no closing call to action any more", async () => {
		const { page, dispose } = await open({ render: fr() });
		assert.equal(await page.locator(".subscribe-cta, [data-subscribe-jump]").count(), 0);
		assert.equal(await page.getByText("Prêt à vous abonner").count(), 0);
		assert.equal(await page.locator("[data-members-form]").count(), 2, "one sign-up and one sign-in form");
		await dispose();
	});

	it("gives each feature a title on one line and its text on two lines at most, without clamping the French copy", async () => {
		for (const width of [390, 768, 1024, 1440]) {
			const { page, dispose } = await open({ render: fr(), viewport: { width, height: 900 } });
			const items = await page.$$eval(".subscribe-benefit", list =>
				list.map(li => {
					const title = li.querySelector(".subscribe-benefit__title");
					const text = li.querySelector(".subscribe-benefit__text");
					const line = el => parseFloat(getComputedStyle(el).lineHeight);
					return {
						name: title.textContent,
						titleLines: Math.round(title.getBoundingClientRect().height / line(title)),
						titleCut: title.scrollWidth > title.clientWidth,
						textLines: Math.round(text.scrollHeight / line(text)),
						clamp: getComputedStyle(text).webkitLineClamp,
					};
				}),
			);
			assert.ok(items.length >= 5);
			for (const item of items) {
				assert.equal(item.titleLines, 1, `${width}px ${item.name}: title on one line`);
				assert.equal(item.titleCut, false, `${width}px ${item.name}: title not cut`);
				assert.ok(item.textLines <= 2, `${width}px ${item.name}: ${item.textLines} lines of text`);
				assert.equal(item.clamp, "2", "the clamp stays as a guard");
			}
			await dispose();
		}
	});

	it("members: account (Portal), sign out, same surface", async () => {
		const { page, dispose } = await open({ render: fr({ member: true }), storage: { theme: "dark" } });
		const view = await page.evaluate(() => ({
			forms: document.querySelectorAll("[data-members-form]").length,
			email: document.querySelector(".subscribe-member__text strong")?.textContent,
			account: document.querySelector('.subscribe-member a[data-portal="account"]')?.textContent.trim(),
			signout: Boolean(document.querySelector(".subscribe-member [data-members-signout]")),
			heroBg: getComputedStyle(document.querySelector(".subscribe-hero")).backgroundColor,
		}));
		assert.deepEqual(view, {
			forms: 0,
			email: "reader@example.com",
			account: "Gérer mon compte",
			signout: true,
			heroBg: "rgba(0, 0, 0, 0)",
		});
		await dispose();
	});
});
