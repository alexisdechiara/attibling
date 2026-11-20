// Privacy (src/js/privacy/, partials/privacy/): nothing on arrival by default, the footer's « Cookies et
// confidentialité » panel, the page of that name, the embeds' contextual consent, Plausible's opt-out,
// « Reprendre la lecture » off, and the fallback consent mode (setting consent_notice: Notice, Banner).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, SITE } from "./support/harness.js";
import { article, ARTICLE_CUSTOM } from "./support/article.js";
import { home, template, DEFAULT_CUSTOM } from "./support/pages.js";
import { STORAGE } from "../js/privacy/registry.js";

// A YouTube embed as Ghost writes it (as in embeds.test.js)
const YOUTUBE_CARD =
	'<figure class="kg-card kg-embed-card"><iframe width="200" height="113" src="https://www.youtube.com/embed/_jGbRsxHi7Q?feature=oembed" frameborder="0" allowfullscreen="" title="Une vidéo"></iframe></figure>';
const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };
const PLAUSIBLE = '<script defer data-domain="example.com" src="https://analytics.example.org/js/script.js"></script>';
// A script the owner gated (Code injection): it counts its runs
const GATED =
	'<script type="text/plain" data-consent="analytics">window.__gatedRuns = (window.__gatedRuns || 0) + 1;</script>';
const LONG = `<p>Intro.</p>${YOUTUBE_CARD}${"<p>Un paragraphe pour que la page défile bien au-delà de l’écran.</p>".repeat(40)}`;
const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000;

const panel = page => page.locator("dialog[data-privacy-panel]");
const openPanel = async page => {
	await page.locator(".site-footer [data-privacy-open]").click();
	await panel(page).waitFor({ state: "visible" });
};
const stored = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
// Waits for a condition, and fails when it does not come
const until = async (fn, message) => assert.ok(await waitFor(fn), message);
// What has the focus (a short description)
const focused = page =>
	page.evaluate(() => {
		const el = document.activeElement;
		return el === document.body
			? "BODY"
			: `${el.tagName}${el.id ? `#${el.id}` : ""} ${el.textContent.trim().slice(0, 40)}`;
	});
// A second gated script, of the kind « other »
const GATED_OTHER =
	'<template data-consent="other"><script>window.__otherRuns = (window.__otherRuns || 0) + 1;</script></template>';

describe("privacy: nothing without something to ask", () => {
	before(launch);
	after(close);

	// Default settings (consent_notice = Notice): a page with no embed and no gated script never shows it
	for (const [name, render] of [
		["home, visitor", () => home()],
		["home, member", () => home({ member: true })],
		["article without embeds, visitor", () => article()],
		["article without embeds, member", () => article({ member: true })],
	]) {
		it(`shows no consent notice, banner or panel with the default settings (${name})`, async () => {
			const { page, dispose, storageWrites } = await open({ render: render(), viewport: PHONE });
			await page.clock.install();
			await page.reload({ waitUntil: "load" });
			await page.mouse.wheel(0, 2000);
			await page.clock.fastForward(13000);
			await page.waitForTimeout(200);
			const state = await page.evaluate(() => ({
				mode: document.documentElement.dataset.consent ?? null,
				notice: document.querySelectorAll("[data-consent-notice]").length,
				dialogOpen: !!document.querySelector("dialog[open]"),
			}));
			assert.deepEqual(state, { mode: "notice", notice: 0, dialogOpen: false });
			const written = (await storageWrites()).map(([key]) => key);
			for (const key of ["attibling-consent", "attibling-privacy", "plausible_ignore"])
				assert.ok(!written.includes(key), `${key} written on arrival`);
			// The footer's way in is there, quietly
			const link = page.locator(".site-footer [data-privacy-open]");
			assert.equal(await link.isVisible(), true);
			assert.match((await link.textContent()).trim(), /^(Cookies and privacy|Cookies et confidentialité)$/);
			await dispose();
		});
	}

	it("never asks with consent_notice = None: embeds keep their one-click facade, gated scripts stay off", async () => {
		const { page, dispose } = await open({
			render: article({ html: LONG, custom: { ...ARTICLE_CUSTOM, consent_notice: "None" } }),
			bodyStart: GATED,
		});
		await page.locator("[data-embed-facade]").waitFor();
		await page.mouse.wheel(0, 2000);
		await page.waitForTimeout(500);
		assert.deepEqual(
			await page.evaluate(() => [
				document.querySelectorAll("[data-consent-notice], #consent-notice").length,
				window.__gatedRuns ?? 0,
				document.documentElement.dataset.consent ?? null,
			]),
			[0, 0, null],
		);
		await dispose();
	});
});

describe("privacy: the preferences panel", () => {
	before(launch);
	after(close);

	it("opens from the footer as a labelled modal dialog, closes with Escape, focus back on the button", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }), viewport: WIDE });
		const button = page.locator(".site-footer [data-privacy-open]");
		assert.equal(await button.evaluate(el => el.tagName), "BUTTON", "no page: a button");
		await button.focus();
		await page.keyboard.press("Enter");
		await panel(page).waitFor({ state: "visible" });
		const info = await panel(page).evaluate(dialog => ({
			modal: dialog.matches(":modal"),
			label: document.getElementById(dialog.getAttribute("aria-labelledby"))?.textContent.trim(),
			focusInside: dialog.contains(document.activeElement),
			switches: [...dialog.querySelectorAll('input[role="switch"]')]
				.filter(i => i.checkVisibility())
				.map(i => i.closest("label").querySelector(".privacy-switch__label").textContent.trim()),
			groups: [...dialog.querySelectorAll("fieldset")]
				.filter(f => f.checkVisibility())
				.map(f => f.querySelector("legend").textContent.trim()),
		}));
		// One « Contenus intégrés » group: the switch for all of them, then the services one by one
		assert.deepEqual(info, {
			modal: true,
			label: "Cookies et confidentialité",
			focusInside: true,
			switches: ["Tous les contenus intégrés", "YouTube"],
			groups: ["Contenus intégrés", "Service par service"],
		});
		// Each switch is named by its label alone, its help is its description
		const all = panel(page).getByRole("switch", { name: "Tous les contenus intégrés", exact: true });
		assert.equal(await all.count(), 1);
		assert.match(await all.getAttribute("aria-describedby"), /^privacy-hint-/);
		assert.equal(
			await page.evaluate(id => document.getElementById(id).textContent, await all.getAttribute("aria-describedby")),
			"Les vidéos et publications d’autres sites, affichées sans clic.",
		);
		assert.equal(await panel(page).getByRole("switch", { name: "YouTube", exact: true }).count(), 1);
		await page.keyboard.press("Escape");
		await panel(page).waitFor({ state: "hidden" });
		await until(() => button.evaluate(el => el === document.activeElement), "focus back on the footer's button");
		await dispose();
	});

	it("turning « Tous les contenus intégrés » on or off sets every service the same way, and says what appeared", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }) });
		await page.locator("[data-embed-facade]").waitFor();
		await openPanel(page);
		const all = panel(page).locator('[data-consent-category="embeds"]');
		const youtube = panel(page).locator('[data-provider="youtube"]');
		await youtube.check();
		assert.deepEqual([await all.isChecked(), await youtube.isChecked()], [false, true], "an exception, before");
		await all.check();
		await all.uncheck();
		// Off: no service left on, the switches cannot disagree
		assert.equal(await stored(page, "attibling-embeds"), null);
		assert.equal(await youtube.isChecked(), false);
		await page.reload({ waitUntil: "load" });
		await page.locator("[data-embed-facade]").waitFor();
		await openPanel(page);
		await panel(page).locator('[data-consent-category="embeds"]').check();
		await page.locator("iframe[data-embed-frame]").waitFor({ state: "attached" });
		// (Polite region of the open panel: « Choix enregistré », then what appeared behind it)
		await until(
			() =>
				panel(page)
					.locator("[data-privacy-live]")
					.textContent()
					.then(t => t.includes("Affichés sur cette page : les contenus de YouTube.")),
			"the embed that appeared is announced",
		);
		await dispose();
	});

	it("is a link to the « Cookies et confidentialité » page when the site has one (and without JavaScript)", async () => {
		const pages = [{ id: "p-c", title: "Cookies", slug: "cookies", url: "/cookies/" }];
		const { page, dispose } = await open({ render: home({ pages }) });
		const link = page.locator(".site-footer a[data-privacy-open]");
		assert.equal(await link.getAttribute("href"), "/cookies/");
		await link.click();
		await panel(page).waitFor({ state: "visible" });
		assert.equal(await panel(page).locator(".privacy-panel__more").getAttribute("href"), "/cookies/");
		await dispose();

		const nojs = await open({ render: home({ pages }), javaScriptEnabled: false });
		assert.equal(await nojs.page.locator(".site-footer a[data-privacy-open]").isVisible(), true);
		await nojs.dispose();
		const none = await open({ render: home(), javaScriptEnabled: false });
		assert.equal(await none.page.locator(".site-footer__privacy").isVisible(), false, "nothing to offer");
		await none.dispose();
	});

	it("« show without a click » per service: on loads the embed at once and next time, off brings the facade back", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }) });
		await page.locator("[data-embed-facade]").waitFor();
		// « Gérer mes choix » under the embed opens the same panel
		await page.locator("[data-embed-facade] [data-privacy-open]").click();
		await panel(page).waitFor({ state: "visible" });
		const toggle = panel(page).locator('[data-provider="youtube"]');
		assert.equal(await toggle.isChecked(), false);
		await toggle.check();
		assert.deepEqual(JSON.parse(await stored(page, "attibling-embeds")), { youtube: true });
		await page.locator("iframe[data-embed-frame]").waitFor({ state: "attached" });
		assert.equal(await page.locator("[data-embed-facade]").count(), 0, "loaded at once, behind the panel");

		await page.reload({ waitUntil: "load" });
		await page.locator("iframe[data-embed-frame]").waitFor();
		assert.equal(await page.locator("[data-embed-facade]").count(), 0, "shown without a click");
		await openPanel(page);
		await panel(page).locator('[data-provider="youtube"]').uncheck();
		assert.deepEqual(JSON.parse(await stored(page, "attibling-embeds")), { youtube: false });
		await page.reload({ waitUntil: "load" });
		await page.locator("[data-embed-facade]").waitFor();
		assert.equal(await page.locator("iframe[data-embed-frame]").count(), 0);
		await dispose();
	});

	it("offers Plausible's own opt-out when the page loads Plausible, and only then", async () => {
		const { page, dispose } = await open({ render: home(), bodyStart: PLAUSIBLE });
		await openPanel(page);
		const toggle = panel(page).locator("[data-plausible-toggle]");
		assert.equal(await toggle.isVisible(), true);
		assert.equal(await toggle.isChecked(), true, "counted by default");
		await toggle.uncheck();
		assert.equal(await stored(page, "plausible_ignore"), "true");
		await toggle.check();
		assert.equal(await stored(page, "plausible_ignore"), null);
		await dispose();

		const without = await open({ render: home() });
		await openPanel(without.page);
		assert.equal(await panel(without.page).locator("[data-plausible-toggle]").isVisible(), false);
		await without.dispose();
	});

	it("lets a member turn « Reprendre la lecture » off: the list is cleared and nothing more is written", async () => {
		const progress = JSON.stringify([{ url: "/autre/", title: "Autre", progress: 0.4, updatedAt: 1 }]);
		const { page, dispose } = await open({
			// (No embed here: the harness's storage seeding cannot run in a blocked frame)
			render: article({ member: true }),
			storage: { "attibling-progress": progress },
		});
		await openPanel(page);
		const toggle = panel(page).locator("[data-privacy-progress]");
		assert.equal(await toggle.isChecked(), true, "on by default");
		await toggle.uncheck();
		assert.equal(await stored(page, "attibling-progress"), null);
		assert.deepEqual(JSON.parse(await stored(page, "attibling-privacy")), { progress: false });
		await page.keyboard.press("Escape");
		await page.mouse.wheel(0, 3000);
		await page.waitForTimeout(1500);
		await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
		assert.equal(await stored(page, "attibling-progress"), null, "scrolling records nothing");
		// The display settings show the same choice
		await page.locator("[data-reading-button]").click();
		assert.equal(await page.locator('[data-reading-settings] input[name="progress"][value="off"]').isChecked(), true);
		// (The panel may still be sliding in: the radio is clicked from the page)
		await page.locator('[data-reading-settings] input[name="progress"][value="on"]').evaluate(input => input.click());
		assert.equal(await stored(page, "attibling-privacy"), null);
		await dispose();
	});

	it("keeps the keyboard inside the panel (the page behind is inert), on phones too", async () => {
		const { page, dispose } = await open({ render: article({ member: true, html: LONG }), viewport: PHONE });
		await openPanel(page);
		const outside = [];
		for (let i = 0; i < 30; i++) {
			await page.keyboard.press("Tab");
			const inside = await page.evaluate(() => !!document.activeElement.closest("dialog[data-privacy-panel]"));
			if (!inside) outside.push(await page.evaluate(() => document.activeElement.outerHTML.slice(0, 80)));
		}
		// (Past its last control, the browser's own toolbar may take the focus: <body>, never the page)
		assert.deepEqual(
			outside.filter(html => !html.startsWith("<body")),
			[],
			"focus never reaches the page",
		);
		await panel(page).evaluate(d => Promise.all(d.getAnimations().map(a => a.finished)));
		const sheet = await panel(page).boundingBox();
		assert.equal(Math.round(sheet.y + sheet.height), PHONE.height, "a bottom sheet on phones");
		await dispose();
	});

	it("clears the member's lists when they sign out with the site's link", async () => {
		const saved = JSON.stringify([{ url: "/a/", title: "A", savedAt: 1 }]);
		const { page, dispose } = await open({
			render: template("page-cookies", { member: true, locale: "fr" }),
			storage: { "attibling-saved": saved, theme: "dark" },
		});
		const signout = page.locator("[data-privacy-page] [data-members-signout]");
		await signout.evaluate(a => a.addEventListener("click", e => e.preventDefault()));
		await signout.click();
		assert.deepEqual(
			await page.evaluate(() => [localStorage.getItem("attibling-saved"), localStorage.getItem("theme")]),
			[null, "dark"],
		);
		await dispose();
	});

	it("ties the member's lists to that member: another member, or nobody (Portal's sign-out), clears them first", async () => {
		const saved = JSON.stringify([{ url: "/a/", title: "A", savedAt: 1 }]);
		const reading = JSON.stringify({ size: "l" });
		const other = home({ member: true });
		other.member = { ...other.member, uuid: "member-2" };
		const { page, dispose } = await open({
			render: home({ member: true }),
			storage: { "attibling-saved": saved, "attibling-reading": reading, theme: "dark" },
			pages: { "/other/": other, "/visitor/": home() },
		});
		const keys = () =>
			page.evaluate(() =>
				["attibling-saved", "attibling-reading", "attibling-member", "theme"].map(k => localStorage.getItem(k)),
			);
		const [keptSaved, keptReading, mark, theme] = await keys();
		assert.deepEqual([keptSaved, keptReading, theme], [saved, reading, "dark"], "lists kept before go to this member");
		assert.match(mark, /^[0-9a-z]+$/);
		assert.ok(!mark.includes("member-1"), "a fingerprint, not the member's id");
		// The same member again: nothing changes
		await page.reload();
		assert.deepEqual(await keys(), [saved, reading, mark, "dark"]);
		// Another member signs in on this browser: the first member's lists and settings are gone
		await page.goto(`${SITE}/other/`);
		const [s2, r2, mark2] = await keys();
		assert.deepEqual([s2, r2], [null, null]);
		assert.ok(mark2 && mark2 !== mark);
		assert.equal(await page.locator("[data-member-lists]:not([hidden]) a[href='/a/']").count(), 0);
		// Signed out elsewhere (Portal, expired session): the next page clears them too
		await page.evaluate(s => localStorage.setItem("attibling-saved", s), saved);
		await page.goto(`${SITE}/visitor/`);
		assert.deepEqual(await keys(), [null, null, null, "dark"]);
		await dispose();
	});

	it("clears the site's data from the panel, and says so", async () => {
		const { page, dispose } = await open({
			render: home(),
			storage: { theme: "dark", "attibling-promo-closed": "1", "attibling-embeds": '["x"]' },
		});
		await openPanel(page);
		const count = panel(page).locator("[data-privacy-count]");
		assert.match(await count.textContent(), /keeps 3 items/);
		await panel(page).locator("[data-privacy-clear]").click();
		assert.equal(await count.textContent(), "This site keeps nothing in this browser.");
		assert.deepEqual(
			await page.evaluate(() => [localStorage.getItem("theme"), localStorage.getItem("attibling-embeds")]),
			[null, null],
		);
		await until(
			() =>
				panel(page)
					.locator("[data-privacy-live]")
					.textContent()
					.then(t => t.length > 0),
			"announced",
		);
		await dispose();
	});

	it("asks before clearing a member's lists, saying what would be lost (panel and page), and only then", async () => {
		const saved = JSON.stringify([
			{ url: "/a/", title: "A", savedAt: 1 },
			{ url: "/b/", title: "B", savedAt: 2 },
		]);
		const progress = JSON.stringify([{ url: "/c/", title: "C", progress: 0.4, updatedAt: 1 }]);
		for (const [where, render, button] of [
			["panel", () => home({ member: true }), "[data-privacy-clear]"],
			["page", () => template("page-cookies", { member: true, locale: "fr" }), "[data-stored-clear]"],
		]) {
			const { page, dispose } = await open({
				render: render(),
				storage: { "attibling-saved": saved, "attibling-progress": progress, theme: "dark" },
				lang: where === "page" ? "fr" : "en",
			});
			if (where === "panel") await openPanel(page);
			const messages = [];
			let accept = false;
			page.on("dialog", dialog => {
				messages.push(dialog.message());
				return accept ? dialog.accept() : dialog.dismiss();
			});
			const clear = page.locator(button).first();
			await clear.click();
			assert.equal(messages.length, 1, where);
			assert.match(
				messages[0],
				where === "panel"
					? /your “Read later” list \(2 posts\) and your “Continue reading” list \(1 post\)/
					: /votre liste « À lire plus tard » \(2 articles\) et votre liste « Reprendre la lecture » \(un article\)/,
			);
			assert.equal(await stored(page, "attibling-saved"), saved, `${where}: kept when cancelled`);
			accept = true;
			await clear.click();
			assert.deepEqual(
				await page.evaluate(() => [localStorage.getItem("attibling-saved"), localStorage.getItem("theme")]),
				[null, null],
			);
			await dispose();
		}
		// The whole sentence, right in French with one list as with two
		for (const [storage, lists] of [
			[{ "attibling-saved": saved }, "votre liste « À lire plus tard » (2 articles)"],
			[
				{ "attibling-saved": saved, "attibling-progress": progress },
				"votre liste « À lire plus tard » (2 articles) et votre liste « Reprendre la lecture » (un article)",
			],
		]) {
			const { page, dispose } = await open({
				render: template("page-cookies", { member: true, locale: "fr" }),
				storage,
				lang: "fr",
			});
			let message;
			page.on("dialog", dialog => ((message = dialog.message()), dialog.dismiss()));
			await page.locator("[data-stored-clear]").first().click();
			assert.equal(
				message,
				`Cela efface aussi ${lists}. Ces données ne sont gardées que dans ce navigateur et ne pourront pas être récupérées. Effacer quand même ?`,
			);
			await dispose();
		}
		// Nothing of value: no question
		const { page, dispose } = await open({ render: home(), storage: { theme: "dark" } });
		let asked = 0;
		page.on("dialog", dialog => (asked++, dialog.accept()));
		await openPanel(page);
		await panel(page).locator("[data-privacy-clear]").click();
		assert.deepEqual([asked, await stored(page, "theme")], [0, null]);
		await dispose();
	});
});

describe("privacy: the « Cookies et confidentialité » page", () => {
	before(launch);
	after(close);

	const cookies = (options = {}) =>
		template("page-cookies", {
			locale: "fr",
			...options,
			post: { html: "<h2 id='en-bref'>En bref</h2><p>Le texte de l’auteur.</p>" },
		});

	it("appends what this browser holds, with « Effacer » per item and « Tout effacer »", async () => {
		const { page, dispose } = await open({
			render: cookies(),
			storage: { theme: "dark", "attibling-embeds": '["youtube","x"]', "autre-cle": "1" },
			viewport: WIDE,
		});
		const held = page.locator("[data-privacy-held]");
		await held.waitFor();
		const rows = () =>
			held.locator("tbody tr").evaluateAll(trs => trs.map(tr => [...tr.cells].slice(0, 3).map(c => c.textContent)));
		assert.deepEqual(await rows(), [
			["theme", "Le mode clair, sombre ou automatique choisi avec le bouton de l’en-tête", "dark"],
			[
				"attibling-embeds",
				"Les services (YouTube, X…) réglés un par un : affichés sans clic, ou gardés derrière leur encadré",
				"youtube, x",
			],
			["autre-cle", "Non décrit par le thème (ajouté par un autre script)", "1"],
		]);
		await held.locator('tr[data-held-key="theme"] button').click();
		assert.equal(await stored(page, "theme"), null);
		assert.equal(await held.locator("tbody tr").count(), 2);
		// The focus moves with the click itself (the list is drawn again at once): the next row's button
		assert.equal(await page.evaluate(() => document.activeElement.closest("tr")?.dataset.heldKey), "attibling-embeds");
		await page.locator("[data-stored-clear]").click();
		await page.locator("[data-stored-empty]").waitFor({ state: "visible" });
		assert.equal(await page.evaluate(() => document.activeElement.matches("[data-stored-empty]")), true);
		assert.equal(await held.isVisible(), false);
		assert.equal(await page.evaluate(() => localStorage.length), 0);
		// The switches of the page list every embed service
		assert.ok((await page.locator("[data-privacy-page] [data-privacy-providers] [data-provider]").count()) >= 10);
		await dispose();
	});

	it("lists everything the site may keep (rendered by the theme), in the table of contents, readable on phones", async () => {
		const { page, dispose } = await open({ render: cookies(), viewport: PHONE });
		await page.locator("[data-document-toc]:not([hidden])").waitFor();
		const keys = await page.$$eval("[data-storage-key]", rows => rows.map(r => r.dataset.storageKey));
		assert.deepEqual(
			keys,
			STORAGE.map(e => e.key),
		);
		const toc = await page.$$eval("[data-document-toc] .toc-link", links => links.map(a => a.getAttribute("href")));
		assert.deepEqual(toc.slice(0, 4), ["#en-bref", "#privacy-now", "#privacy-choices", "#privacy-all"]);
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0);
		assert.match(await page.locator(".privacy-page__cookie").textContent(), /n’êtes pas connecté/);
		await dispose();

		const member = await open({ render: cookies({ member: true }) });
		assert.equal(await member.page.locator("[data-privacy-page] [data-members-signout]").count(), 1);
		await member.dispose();
	});

	it("says for whom and how long, as the registry does (src/js/privacy/registry.js audience, lifetime)", async () => {
		const { page, dispose } = await open({
			render: template("page-cookies", { post: { html: "<p>Texte.</p>" } }),
		});
		const rows = await page.$$eval("[data-storage-key]", trs =>
			trs.map(tr => [tr.dataset.storageKey, tr.cells[2].textContent.trim(), tr.cells[4].textContent.trim()]),
		);
		const FOR = { all: "everyone", visitors: "visitors", members: "members" };
		const LIFETIME = {
			session: /^Until the tab is closed$/,
			"six-months": /^6 months, then asked again$/,
			none: /^None$/,
			"until-cleared": /^Until (?!the tab is closed).*(clear|take it back)/,
		};
		for (const entry of STORAGE) {
			const [, audience, lifetime] = rows.find(([key]) => key === entry.key);
			assert.equal(audience, FOR[entry.audience], `${entry.key}: for whom`);
			assert.match(lifetime, LIFETIME[entry.lifetime], `${entry.key}: how long`);
		}
		await dispose();
	});

	for (const viewport of [WIDE, { width: 768, height: 1024 }, PHONE]) {
		it(`fits its tables in the reading column, as stacked rows: nothing to scroll (${viewport.width} px)`, async () => {
			const { page, dispose } = await open({
				render: cookies(),
				storage: { theme: "dark", "attibling-embeds": '{"youtube":true}' },
				viewport,
			});
			await page.locator("[data-privacy-held]").waitFor();
			const boxes = await page.$$eval("[data-privacy-page] .table-scroll", els =>
				els.map(el => ({
					over: el.scrollWidth - el.clientWidth,
					head: getComputedStyle(el.querySelector("thead")).position,
					// « Durée » (or « Contenu ») read next to its name, inside the column
					inside: [...el.querySelectorAll("td")].every(
						td => td.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1,
					),
				})),
			);
			assert.deepEqual(boxes, [
				{ over: 0, head: "absolute", inside: true },
				{ over: 0, head: "absolute", inside: true },
			]);
			await dispose();
		});
	}

	it("is also the « Privacy » template and the slug confidentialite", async () => {
		for (const name of ["custom-privacy", "page-confidentialite"]) {
			const { page, dispose } = await open({ render: { ...cookies(), template: name } });
			assert.equal(await page.locator("[data-document] [data-privacy-page]").count(), 1, name);
			await dispose();
		}
	});
});

describe("privacy: fallback consent mode (setting consent_notice)", () => {
	before(launch);
	after(close);

	const custom = mode => ({ ...ARTICLE_CUSTOM, consent_notice: mode });
	const notice = page => page.locator("[data-consent-notice]");

	const csp = async settings => {
		const { page, dispose } = await open({ render: article({ custom: { ...ARTICLE_CUSTOM, ...settings } }) });
		const policy = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content");
		await dispose();
		return policy;
	};

	it("keeps the embeds' policy of None by default: the analytics / ads hosts only with « Consent tools » on", async () => {
		const none = await csp({ consent_notice: "None" });
		assert.equal(await csp({ consent_notice: "Notice" }), none, "default Notice = None");
		assert.equal(await csp({ consent_notice: "Banner" }), none, "Banner = None");
		assert.equal(await csp({ consent_notice: "None", consent_tools: true }), none, "the setting needs a consent mode");
		assert.doesNotMatch(none, /googletagmanager|facebook|hotjar/);
		for (const mode of ["Notice", "Banner"]) {
			const open = await csp({ consent_notice: mode, consent_tools: true });
			assert.match(open, /script-src [^;]*https:\/\/www\.googletagmanager\.com/, mode);
			assert.match(open, /frame-src [^;]*https:\/\/\*\.doubleclick\.net/, mode);
			assert.doesNotMatch(open, /youtube|twitter/);
		}
	});

	it("« Notice »: nothing on arrival, a card after a little scrolling, out of the way; the gated script waits", async () => {
		const { page, dispose } = await open({
			render: article({ custom: custom("Notice"), html: LONG }),
			bodyStart: GATED,
		});
		await page.waitForTimeout(400);
		assert.equal(await notice(page).count(), 0, "not on arrival");
		assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0);
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		await page.mouse.wheel(0, 600);
		await notice(page).waitFor({ state: "visible" });
		await notice(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
		const info = await page.evaluate(before => {
			const el = document.querySelector("[data-consent-notice]");
			const box = el.getBoundingClientRect();
			return {
				afterSkipLink: el.previousElementSibling?.classList.contains("skip-link"),
				focusInside: el.contains(document.activeElement),
				labelled: document.getElementById(el.getAttribute("aria-labelledby"))?.textContent,
				position: getComputedStyle(el).position,
				bottomGap: Math.round(window.innerHeight - box.bottom),
				narrow: box.width <= 420,
				text: el.querySelector("[data-consent-body]").textContent.includes("mesure d’audience"),
				// Nothing moves: the page only grows at its end, by the room the notice takes
				grown:
					document.documentElement.scrollHeight - before ===
					parseFloat(document.documentElement.style.getPropertyValue("--consent-notice-space")),
			};
		}, height);
		assert.deepEqual(info, {
			afterSkipLink: true,
			focusInside: false,
			labelled: "Votre accord, si vous le souhaitez",
			position: "fixed",
			bottomGap: 16,
			narrow: true,
			text: true,
			grown: true,
		});
		// « Tout refuser » and « Tout accepter »: same size, same row, same type, 44 px at least
		const buttons = await notice(page)
			.locator(".consent-refuse, .consent-accept")
			.evaluateAll(list =>
				list.map(b => {
					const s = getComputedStyle(b);
					const r = b.getBoundingClientRect();
					return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), size: s.fontSize };
				}),
			);
		assert.equal(buttons.length, 2);
		assert.deepEqual(buttons[0], buttons[1]);
		assert.ok(buttons[0].h >= 44, `${buttons[0].h} px high`);
		await dispose();
	});

	it("asks only for the kinds waiting on the page, stores an answer for those only; a kind added later is asked", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
		});
		await notice(page).waitFor({ state: "visible" });
		assert.match(await notice(page).locator("[data-consent-body]").textContent(), /: audience measurement\.$/);
		await notice(page).getByRole("button", { name: "Accept all" }).click();
		const record = JSON.parse(await stored(page, "attibling-consent"));
		assert.deepEqual(Object.keys(record).sort(), ["analytics", "at", "v"], "nothing stored for what was not asked");
		await dispose();

		// A page with a tool of another kind: the card comes back, for that kind only
		const next = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED + GATED_OTHER,
			storage: { "attibling-consent": JSON.stringify(record) },
		});
		await notice(next.page).waitFor({ state: "visible" });
		assert.match(await notice(next.page).locator("[data-consent-body]").textContent(), /: other services\.$/);
		assert.deepEqual(
			await next.page.evaluate(() => [window.__gatedRuns ?? 0, window.__otherRuns ?? 0]),
			[1, 0],
			"the analytics script runs, the other waits",
		);
		await notice(next.page).getByRole("button", { name: "Refuse all" }).click();
		assert.deepEqual(
			(({ analytics, other, embeds }) => ({ analytics, other, embeds }))(
				JSON.parse(await stored(next.page, "attibling-consent")),
			),
			{ analytics: true, other: false, embeds: undefined },
		);
		await next.dispose();
	});

	it("keeps the answer for the page when the browser refuses to store it", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
			initScript: () => {
				Storage.prototype.setItem = () => {
					throw new DOMException("blocked", "SecurityError");
				};
			},
		});
		await notice(page).waitFor({ state: "visible" });
		await notice(page).getByRole("button", { name: "Accept all" }).click();
		assert.equal(await notice(page).count(), 0);
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1, "it runs on this page");
		await dispose();
	});

	for (const [name, record] of [
		["another version", { analytics: true, v: 99, at: Date.now() }],
		["no version", { analytics: true, at: Date.now() }],
		["a date in the future", { analytics: true, v: 1, at: Date.now() + 7 * 864e5 }],
	]) {
		it(`asks again when the stored answer has ${name}`, async () => {
			const { page, dispose } = await open({
				render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
				bodyStart: GATED,
				storage: { "attibling-consent": JSON.stringify(record) },
			});
			await notice(page).waitFor({ state: "visible" });
			assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0);
			await dispose();
		});
	}

	it("takes Do Not Track as a refusal, as Global Privacy Control", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
			initScript: () => Object.defineProperty(Navigator.prototype, "doNotTrack", { get: () => "1" }),
		});
		await page.waitForLoadState("load");
		await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
		assert.deepEqual(
			await page.evaluate(() => [
				document.querySelectorAll("[data-consent-notice]").length,
				window.__gatedRuns ?? 0,
				window.attiblingConsent.get("analytics"),
			]),
			[0, 0, false],
		);
		await dispose();
	});

	for (const viewport of [WIDE, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
		for (const mode of ["Notice", "Banner"]) {
			it(`never leaves the focused element under the ${mode.toLowerCase()} (${viewport.width} px)`, async () => {
				const { page, dispose } = await open({
					render: article({
						custom: custom(mode),
						html: `${"<p>Un paragraphe avec <a href='/x/'>un lien</a>.</p>".repeat(60)}`,
					}),
					bodyStart: GATED,
					viewport,
				});
				await page.mouse.wheel(0, 600);
				await notice(page).waitFor({ state: "visible" });
				await notice(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
				const hidden = [];
				for (let i = 0; i < 40; i++) {
					await page.keyboard.press("Tab");
					const state = await page.evaluate(() => {
						const el = document.activeElement;
						const card = document.querySelector("[data-consent-notice]");
						if (!card || card.contains(el) || el === document.body) return null;
						const box = el.getBoundingClientRect();
						const top = card.getBoundingClientRect().top;
						return box.bottom > top + 1 ? `${el.tagName} ${Math.round(box.bottom)} > ${Math.round(top)}` : null;
					});
					if (state) hidden.push(state);
				}
				assert.deepEqual(hidden, []);
				await dispose();
			});
		}
	}

	it("gives the focus back after an answer: where it was, else the main content, never <body>", async () => {
		// From the notice's own buttons (the keyboard user reaches it right after the skip link)
		for (const answer of ["Accept all", "Refuse all", "Close and continue without accepting", "Escape"]) {
			const { page, dispose } = await open({
				render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
				bodyStart: GATED,
			});
			await notice(page).waitFor({ state: "visible" });
			if (answer === "Escape") {
				await notice(page).getByRole("button", { name: "Refuse all" }).focus();
				await page.keyboard.press("Escape");
			} else {
				await notice(page).getByRole("button", { name: answer }).focus();
				await page.keyboard.press("Enter");
			}
			assert.equal(await notice(page).count(), 0, answer);
			assert.match(await focused(page), /^MAIN#main/, answer);
			await page.keyboard.press("Tab");
			assert.notEqual(await focused(page), "BODY", `${answer}: the next Tab goes on in the page`);
			await dispose();
		}
		// From the panel opened by the notice's link: the link is gone when the panel closes
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
		});
		await notice(page).waitFor({ state: "visible" });
		await notice(page).getByRole("button", { name: "Cookies and privacy" }).click();
		await panel(page).waitFor({ state: "visible" });
		await panel(page).getByRole("button", { name: "Accept all" }).click();
		assert.equal(await notice(page).count(), 0, "answered in the panel");
		await page.keyboard.press("Escape");
		await panel(page).waitFor({ state: "hidden" });
		await until(() => focused(page).then(f => f.startsWith("MAIN#main")), "focus on the main content");
		await dispose();
	});

	it("« Notice » also comes after 12 seconds without scrolling", async () => {
		const { page, dispose } = await open({
			render: article({ custom: custom("Notice"), html: LONG }),
			bodyStart: GATED,
		});
		await page.clock.install();
		await page.reload({ waitUntil: "load" });
		await page.clock.fastForward(11000);
		assert.equal(await notice(page).count(), 0);
		await page.clock.fastForward(2000);
		await notice(page).waitFor({ state: "visible" });
		await dispose();
	});

	it("« Banner »: at once, across the bottom; accept runs the gated script, and the answer is kept", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
			viewport: WIDE,
		});
		await notice(page).waitFor({ state: "visible" });
		await notice(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
		const box = await notice(page).boundingBox();
		assert.equal(
			Math.round(box.width),
			1440 - (await page.evaluate(() => 1440 - document.documentElement.clientWidth)),
		);
		assert.equal(Math.round(box.y + box.height), 900);
		await notice(page).getByRole("button", { name: "Accept all" }).click();
		assert.equal(await notice(page).count(), 0);
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1, "runs at once, on this page");
		const record = JSON.parse(await stored(page, "attibling-consent"));
		// Only the kind it asked about (the page's gated script): « analytics »
		assert.deepEqual({ ...record, at: typeof record.at }, { analytics: true, v: 1, at: "number" });
		await page.reload({ waitUntil: "load" });
		await page.waitForTimeout(300);
		assert.equal(await notice(page).count(), 0, "not asked again");
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1);
		await dispose();
	});

	it("keeps room for the notice at the end of the page: the last footer links scroll above it (WCAG 2.4.11)", async () => {
		for (const mode of ["Banner", "Notice"]) {
			const { page, dispose } = await open({
				render: article({ custom: custom(mode), html: LONG }),
				bodyStart: GATED,
				viewport: { width: 390, height: 844 },
			});
			if (mode === "Notice") await page.mouse.wheel(0, 600);
			await notice(page).waitFor({ state: "visible" });
			await notice(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
			// Every control of the footer, focused in turn from the keyboard's point of view (scrolled into
			// view as the browser does on focus): none under the notice
			const hidden = await page.evaluate(() => {
				const top = document.querySelector("[data-consent-notice]").getBoundingClientRect().top;
				return [...document.querySelectorAll("footer :is(a, button)")]
					.filter(el => el.getClientRects().length)
					.filter(el => {
						el.focus();
						el.scrollIntoView({ block: "nearest" });
						return el.getBoundingClientRect().bottom > top + 0.5;
					})
					.map(el => el.textContent.trim());
			});
			assert.deepEqual(hidden, [], mode);
			await dispose();
		}
	});

	it("refusing (or closing) keeps the script off, on this page and the next; withdrawing in the panel", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
		});
		await notice(page).waitFor({ state: "visible" });
		await notice(page).getByRole("button", { name: "Close and continue without accepting" }).click();
		assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0);
		assert.equal(JSON.parse(await stored(page, "attibling-consent")).analytics, false);
		await page.reload({ waitUntil: "load" });
		await page.waitForTimeout(300);
		assert.equal(await notice(page).count(), 0);
		assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0);
		// The panel: accept one category, then take it back
		await openPanel(page);
		const analytics = panel(page).locator('[data-consent-category="analytics"]');
		await analytics.check();
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1);
		await analytics.uncheck();
		assert.equal(JSON.parse(await stored(page, "attibling-consent")).analytics, false);
		await page.reload({ waitUntil: "load" });
		assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0);
		await dispose();
	});

	it("asks again after six months", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
		});
		const start = Date.now();
		await page.clock.install({ time: start });
		await page.reload({ waitUntil: "load" });
		await notice(page).getByRole("button", { name: "Refuse all" }).click();
		await page.clock.setSystemTime(start + SIX_MONTHS - 60000);
		await page.reload({ waitUntil: "load" });
		await page.waitForTimeout(300);
		assert.equal(await notice(page).count(), 0, "still within six months");
		await page.clock.setSystemTime(start + SIX_MONTHS + 60000);
		await page.reload({ waitUntil: "load" });
		await notice(page).waitFor({ state: "visible" });
		await dispose();
	});

	it("takes Global Privacy Control as a refusal: no notice, the script stays off, the panel says why", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
			initScript: () => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }),
		});
		await page.waitForTimeout(400);
		assert.equal(await notice(page).count(), 0);
		assert.equal(
			await page.evaluate(() => [window.__gatedRuns ?? 0, window.attiblingConsent.get("analytics")]).then(String),
			"0,false",
		);
		await openPanel(page);
		// Said once, in the first group (« Services facultatifs »)
		assert.deepEqual(
			await panel(page)
				.locator("[data-consent-signal]")
				.evaluateAll(notes => notes.map(n => n.checkVisibility())),
			[true, false],
		);
		await panel(page).getByRole("button", { name: "Accept all" }).click();
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1, "the reader may still accept");
		await dispose();
	});

	it("shows nothing in that mode either when no script waits for an answer", async () => {
		const { page, dispose } = await open({ render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }) });
		await page.waitForTimeout(400);
		assert.equal(await notice(page).count(), 0);
		await dispose();
	});

	it("is reachable from the keyboard right after the skip link, and Escape refuses", async () => {
		const { page, dispose } = await open({
			render: home({ custom: { ...DEFAULT_CUSTOM, consent_notice: "Banner" } }),
			bodyStart: GATED,
		});
		await notice(page).waitFor({ state: "visible" });
		await page.keyboard.press("Tab"); // skip link
		await page.keyboard.press("Tab"); // the link in the sentence, then the two answers
		assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Cookies and privacy");
		await page.keyboard.press("Tab");
		assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Refuse all");
		await page.keyboard.press("Escape");
		assert.equal(await notice(page).count(), 0);
		assert.equal(JSON.parse(await stored(page, "attibling-consent")).analytics, false);
		await dispose();
	});
});

describe("privacy: embedded content asks in place (default consent_notice = Notice)", () => {
	before(launch);
	after(close);

	const notice = page => page.locator("[data-consent-notice]");
	const youtube = /youtube/;
	const settle = locator => locator.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
	const frames = page => page.locator("iframe[data-embed-frame]").count();
	// No card, whatever the reader does: scrolls, waits past the notice's 12 seconds
	const noCard = async page => {
		await page.mouse.wheel(0, 900);
		await page.clock.fastForward(13000);
		await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
		return (await notice(page).count()) === 0;
	};

	it("the facade is the only request: it says what showing sends and what accepting does; nothing loads before", async () => {
		const { page, dispose, requests } = await open({ render: article({ html: LONG + YOUTUBE_CARD }) });
		await page.clock.install();
		await page.reload({ waitUntil: "load" });
		const facade = page.locator("[data-embed-facade]").first();
		await facade.waitFor();
		const info = await facade.evaluate(el => ({
			ask: el.classList.contains("embed-facade--ask"),
			accept:
				el.querySelector("[data-embed-accept]").checkVisibility() &&
				el.querySelector("[data-embed-accept]").textContent.trim(),
			only: el.querySelector("[data-embed-load]").textContent.trim(),
			note: el.querySelector("[data-embed-note]").textContent.trim(),
			always: el.querySelector(".embed-facade__always").checkVisibility(),
			manage: !!el.querySelector("[data-privacy-open]"),
		}));
		assert.deepEqual(info, {
			ask: true,
			accept: "Accepter et afficher",
			only: "Afficher seulement celui-ci",
			note: "Ce contenu vient de YouTube : l’afficher envoie votre adresse IP à YouTube, qui peut déposer des cookies ou d’autres traceurs. « Accepter et afficher » affiche désormais tous les contenus intégrés du site sans clic.",
			always: false,
			manage: true,
		});
		// A named group; the buttons say which content, and are described by the note
		assert.equal(await page.getByRole("group", { name: "Contenu de YouTube — Une vidéo" }).count(), 2);
		const only = facade.getByRole("button", { name: "Afficher seulement celui-ci (Contenu de YouTube — Une vidéo)" });
		assert.equal(await only.count(), 1);
		assert.equal(
			await only.evaluate(b =>
				document.getElementById(b.getAttribute("aria-describedby")).matches("[data-embed-note]"),
			),
			true,
		);
		assert.equal(await noCard(page), true, "no consent card on a page with embeds");
		assert.equal(
			await page.evaluate(() => document.getElementById("consent-notice") !== null),
			true,
			"(the mode is on)",
		);
		assert.equal(requests.filter(u => youtube.test(new URL(u).host)).length, 0);
		await dispose();
	});

	it("never brings the card or the banner for embeds, in both modes", async () => {
		for (const mode of ["Notice", "Banner"]) {
			const { page, dispose } = await open({
				render: article({ html: LONG, custom: { ...ARTICLE_CUSTOM, consent_notice: mode } }),
			});
			await page.clock.install();
			await page.reload({ waitUntil: "load" });
			await page.locator("[data-embed-facade].embed-facade--ask").waitFor();
			assert.equal(await noCard(page), true, mode);
			await dispose();
		}
	});

	it("« Accepter et afficher » answers for embedded content only: this one plays, the others follow, here and next time", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG + YOUTUBE_CARD }), bodyStart: GATED });
		await page.locator("[data-embed-facade] [data-embed-accept]").first().click();
		await until(() => frames(page).then(n => n === 2), "both embeds loaded");
		const record = JSON.parse(await stored(page, "attibling-consent"));
		assert.deepEqual({ ...record, at: typeof record.at }, { embeds: true, v: 1, at: "number" }, "embeds only");
		assert.equal(await page.evaluate(() => window.__gatedRuns ?? 0), 0, "the gated script still waits");
		// The other embed, which appeared without a click, is announced
		await until(
			() =>
				page
					.locator("[data-embed-live]")
					.textContent()
					.then(t => t === "Affichés sur cette page : les contenus de YouTube."),
			"announced",
		);
		await page.reload({ waitUntil: "load" });
		await until(() => frames(page).then(n => n === 2), "shown without a click next time");
		assert.equal(await page.locator("[data-embed-facade]").count(), 0);
		await dispose();
	});

	it("« Afficher seulement celui-ci » shows only that embed, and keeps nothing", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG + YOUTUBE_CARD }) });
		await page.locator("[data-embed-facade] [data-embed-load]").first().click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		assert.equal(await page.locator("[data-embed-facade]").count(), 1, "the other one still waits");
		assert.deepEqual([await stored(page, "attibling-embeds"), await stored(page, "attibling-consent")], [null, null]);
		await page.reload({ waitUntil: "load" });
		await page.locator("[data-embed-facade]").first().waitFor();
		assert.equal(await frames(page), 0);
		await dispose();
	});

	it("keeps one truth: accepting turns every service on, a service turned off in the panel stays off", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }) });
		await page.locator("[data-embed-facade] [data-embed-accept]").click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		await openPanel(page);
		const category = panel(page).locator('[data-consent-category="embeds"]');
		const service = panel(page).locator('[data-provider="youtube"]');
		assert.deepEqual([await category.isChecked(), await service.isChecked()], [true, true]);
		await service.uncheck();
		assert.deepEqual(JSON.parse(await stored(page, "attibling-embeds")), { youtube: false });
		assert.equal(await category.isChecked(), true, "the category's answer is kept");
		await page.reload({ waitUntil: "load" });
		await page.locator("[data-embed-facade]").waitFor();
		assert.equal(await frames(page), 0, "YouTube stays behind its facade");
		// « Tous les contenus intégrés » turned on again: every service on again
		await openPanel(page);
		await panel(page).locator('[data-consent-category="embeds"]').uncheck();
		await panel(page).locator('[data-consent-category="embeds"]').check();
		assert.equal(await stored(page, "attibling-embeds"), null);
		assert.equal(await panel(page).locator('[data-provider="youtube"]').isChecked(), true);
		await page.locator("iframe[data-embed-frame]").waitFor({ state: "attached" });
		await dispose();
	});

	it("keeps the answer for the page when the browser refuses to store it", async () => {
		const { page, dispose } = await open({
			render: article({ html: LONG + YOUTUBE_CARD }),
			initScript: () => {
				Storage.prototype.setItem = () => {
					throw new DOMException("blocked", "SecurityError");
				};
			},
		});
		await page.locator("[data-embed-facade] [data-embed-accept]").first().click();
		await until(() => frames(page).then(n => n === 2), "both embeds loaded");
		await dispose();
	});

	// The card, for a gated script on a post: same ink, same size; the « back to the top » button on phones
	for (const [scheme, accept] of [
		["light", { bg: "rgb(18, 20, 24)", fg: "rgb(255, 255, 255)" }],
		["dark", { bg: "rgb(242, 243, 245)", fg: "rgb(11, 12, 15)" }],
	]) {
		it(`« Tout accepter » is solid ink, « Tout refuser » an outlined button of the same size (${scheme})`, async () => {
			const { page, dispose } = await open({
				render: article({ html: LONG }),
				bodyStart: GATED,
				colorScheme: scheme,
				viewport: PHONE,
			});
			await page.mouse.wheel(0, 700);
			await notice(page).waitFor({ state: "visible" });
			await settle(notice(page));
			const [refuse, yes] = await notice(page)
				.locator(".consent-refuse, .consent-accept")
				.evaluateAll(buttons =>
					buttons.map(b => {
						const s = getComputedStyle(b);
						const r = b.getBoundingClientRect();
						return {
							tag: b.tagName,
							bg: s.backgroundColor,
							fg: s.color,
							border: s.borderTopColor,
							borderWidth: s.borderTopWidth,
							h: Math.round(r.height),
							w: Math.round(r.width),
							top: Math.round(r.top),
							size: s.fontSize,
						};
					}),
				);
			assert.deepEqual({ bg: yes.bg, fg: yes.fg }, accept);
			assert.equal(refuse.bg, "rgba(0, 0, 0, 0)");
			assert.equal(refuse.border, accept.bg, "outlined in the same ink");
			assert.equal(refuse.fg, accept.bg);
			assert.equal(refuse.borderWidth, "2px");
			assert.deepEqual(
				[refuse.tag, refuse.h, refuse.w, refuse.top, refuse.size],
				["BUTTON", yes.h, yes.w, yes.top, yes.size],
			);
			assert.ok(yes.h >= 44, `${yes.h} px high`);
			// The article's « back to the top » button does not land on the page above the card: it waits
			assert.equal(
				await page.evaluate(() => getComputedStyle(document.querySelector(".progress-button")).visibility),
				"hidden",
			);
			await notice(page).getByRole("button", { name: "Tout refuser" }).click();
			assert.equal(
				await page.evaluate(() => getComputedStyle(document.querySelector(".progress-button")).visibility),
				"visible",
			);
			await dispose();
		});
	}

	it("respects Global Privacy Control: the facades still ask, one click still works", async () => {
		const { page, dispose } = await open({
			render: article({ html: LONG }),
			initScript: () => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }),
		});
		await page.locator("[data-embed-facade].embed-facade--ask").waitFor();
		await page.locator("[data-embed-facade] [data-embed-load]").click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		await dispose();
	});
});

describe("privacy: Google Consent Mode v2", () => {
	before(launch);
	after(close);

	const GOOGLE_TAG =
		'<script type="text/plain" data-consent="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>' +
		'<script type="text/plain" data-consent="analytics">window.__tagRanAfter = JSON.stringify(window.dataLayer.map(a => [...a]));</script>';
	const consentCalls = page =>
		page.evaluate(() => (window.dataLayer || []).map(a => [...a]).filter(a => a[0] === "consent" || a[0] === "set"));

	it("sets every Google consent type to denied before any Google tag, then updates it from the answer", async () => {
		const { page, dispose } = await open({ render: home(), bodyStart: GOOGLE_TAG });
		const before = await consentCalls(page);
		assert.deepEqual(before, [
			[
				"consent",
				"default",
				{
					analytics_storage: "denied",
					ad_storage: "denied",
					ad_user_data: "denied",
					ad_personalization: "denied",
					personalization_storage: "denied",
					functionality_storage: "granted",
					security_storage: "granted",
					wait_for_update: 500,
				},
			],
			["set", "ads_data_redaction", true],
		]);
		assert.equal(await page.evaluate(() => window.__tagRanAfter ?? null), null, "the tag waits");
		await page.evaluate(() => window.attiblingConsent.set({ analytics: true, embeds: false, other: false }));
		const after = await consentCalls(page);
		assert.deepEqual(after.at(-1), [
			"consent",
			"update",
			{
				analytics_storage: "granted",
				ad_storage: "denied",
				ad_user_data: "denied",
				ad_personalization: "denied",
				personalization_storage: "denied",
			},
		]);
		// The gated tag ran after the update
		const seen = JSON.parse(await page.evaluate(() => window.__tagRanAfter));
		assert.equal(seen.at(-1)[1], "update");
		await dispose();
	});

	it("emits nothing Google-related when the page has no Google tag", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG }), bodyStart: GATED });
		await page.locator("[data-embed-facade]").waitFor();
		assert.deepEqual(await page.evaluate(() => [typeof window.dataLayer, typeof window.gtag]), [
			"undefined",
			"undefined",
		]);
		await dispose();
	});
});
