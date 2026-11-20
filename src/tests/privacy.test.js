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
		}));
		assert.deepEqual(info, {
			modal: true,
			label: "Cookies et confidentialité",
			focusInside: true,
			switches: ["Contenus intégrés", "Afficher les contenus de YouTube sans clic"],
		});
		await page.keyboard.press("Escape");
		await panel(page).waitFor({ state: "hidden" });
		assert.equal(await button.evaluate(el => el === document.activeElement), true);
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
		await waitFor(() =>
			panel(page)
				.locator("[data-privacy-live]")
				.textContent()
				.then(t => t.length > 0),
		);
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
		assert.equal(await page.evaluate(() => document.activeElement.className), "privacy-stored__clear");
		await page.locator("[data-stored-clear]").click();
		await page.locator("[data-stored-empty]").waitFor({ state: "visible" });
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

	it("lets the common analytics services through the embeds' policy only in that mode", async () => {
		for (const [mode, expected] of [
			["None", false],
			["Banner", true],
		]) {
			const { page, dispose } = await open({ render: article({ custom: custom(mode) }) });
			const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content");
			assert.equal(/googletagmanager/.test(csp), expected, mode);
			assert.doesNotMatch(csp, /youtube|twitter/);
			await dispose();
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
		const info = await page.evaluate(() => {
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
				height: document.documentElement.scrollHeight,
			};
		});
		assert.deepEqual(info, {
			afterSkipLink: true,
			focusInside: false,
			labelled: "Votre accord, si vous le souhaitez",
			position: "fixed",
			bottomGap: 16,
			narrow: true,
			text: true,
			height,
		});
		// « Tout refuser » and « Tout accepter »: same size, same look
		const [refuse, accept] = await notice(page)
			.locator(".consent-notice__choice")
			.evaluateAll(buttons =>
				buttons.map(b => {
					const s = getComputedStyle(b);
					const r = b.getBoundingClientRect();
					return {
						w: Math.round(r.width),
						h: Math.round(r.height),
						bg: s.backgroundColor,
						fg: s.color,
						size: s.fontSize,
					};
				}),
			);
		assert.deepEqual(refuse, accept);
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
		assert.deepEqual(
			{ ...record, at: typeof record.at },
			{ analytics: true, embeds: true, other: true, v: 2, at: "number" },
		);
		await page.reload({ waitUntil: "load" });
		await page.waitForTimeout(300);
		assert.equal(await notice(page).count(), 0, "not asked again");
		assert.equal(await page.evaluate(() => window.__gatedRuns), 1);
		await dispose();
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
		assert.equal(await panel(page).locator("[data-consent-signal]").isVisible(), true);
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

describe("privacy: one answer for embedded content (default consent_notice = Notice)", () => {
	before(launch);
	after(close);

	const notice = page => page.locator("[data-consent-notice]");
	const youtube = /youtube/;
	const settle = locator => locator.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));

	it("the facade says why the video is hidden and carries the consent; nothing is loaded before", async () => {
		const { page, dispose, requests } = await open({ render: article({ html: LONG }) });
		const facade = page.locator("[data-embed-facade]");
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
			note: "Ce contenu vient de YouTube. Il est masqué parce que vous n’avez pas accepté les contenus intégrés : l’afficher envoie votre adresse IP à YouTube, qui peut déposer des cookies ou d’autres traceurs.",
			always: false,
			manage: true,
		});
		assert.equal(requests.filter(u => youtube.test(new URL(u).host)).length, 0);
		await dispose();
	});

	it("asks once on a page with an embed, naming the service; « Tout accepter » loads every embed, here and next time", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG + YOUTUBE_CARD }), viewport: WIDE });
		await page.locator("[data-embed-facade]").first().waitFor();
		assert.equal(await notice(page).count(), 0, "not on arrival");
		await page.mouse.wheel(0, 700);
		await notice(page).waitFor({ state: "visible" });
		assert.equal(await notice(page).locator("h2").textContent(), "Contenus d’autres sites");
		assert.match(
			await notice(page).locator("[data-consent-body]").textContent(),
			/^Cette page intègre des contenus d’autres sites \(YouTube\)\. Acceptez pour les afficher sans clic\.$/,
		);
		await notice(page).getByRole("button", { name: "Tout accepter" }).click();
		await waitFor(() =>
			page
				.locator("iframe[data-embed-frame]")
				.count()
				.then(n => n === 2),
		);
		assert.equal(await page.locator("[data-embed-facade]").count(), 0);
		assert.equal(await notice(page).count(), 0);
		await page.reload({ waitUntil: "load" });
		await waitFor(() =>
			page
				.locator("iframe[data-embed-frame]")
				.count()
				.then(n => n === 2),
		);
		await page.mouse.wheel(0, 700);
		await page.waitForTimeout(300);
		assert.equal(await notice(page).count(), 0, "answered");
		await dispose();
	});

	it("« Tout refuser » leaves the facades as they are: one click shows only that embed, and nothing is kept", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG + YOUTUBE_CARD }) });
		await page.mouse.wheel(0, 700);
		await notice(page).getByRole("button", { name: "Tout refuser" }).click();
		assert.equal(await page.locator("[data-embed-facade].embed-facade--ask").count(), 2);
		await page.locator("[data-embed-facade] [data-embed-load]").first().click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		assert.equal(await page.locator("[data-embed-facade]").count(), 1, "the other one still waits");
		assert.equal(await stored(page, "attibling-embeds"), null);
		await page.reload({ waitUntil: "load" });
		await page.locator("[data-embed-facade]").first().waitFor();
		await page.mouse.wheel(0, 700);
		await page.waitForTimeout(300);
		assert.deepEqual([await page.locator("iframe[data-embed-frame]").count(), await notice(page).count()], [0, 0]);
		await dispose();
	});

	it("« Accepter et afficher » on an embed accepts embedded content: this one plays, the others follow, the notice goes", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG + YOUTUBE_CARD }) });
		await page.mouse.wheel(0, 700);
		await notice(page).waitFor({ state: "visible" });
		await page.locator("[data-embed-facade] [data-embed-accept]").first().click();
		await waitFor(() =>
			page
				.locator("iframe[data-embed-frame]")
				.count()
				.then(n => n === 2),
		);
		assert.equal(JSON.parse(await stored(page, "attibling-consent")).embeds, true);
		assert.equal(await notice(page).count(), 0);
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
		assert.equal(await page.locator("iframe[data-embed-frame]").count(), 0, "YouTube stays behind its facade");
		// « Tout accepter » in the panel: every service on again
		await openPanel(page);
		await panel(page).getByRole("button", { name: "Tout accepter" }).click();
		assert.equal(await stored(page, "attibling-embeds"), null);
		assert.equal(await panel(page).locator('[data-provider="youtube"]').isChecked(), true);
		await page.locator("iframe[data-embed-frame]").waitFor({ state: "attached" });
		await dispose();
	});

	for (const [scheme, accept] of [
		["light", { bg: "rgb(18, 20, 24)", fg: "rgb(255, 255, 255)" }],
		["dark", { bg: "rgb(242, 243, 245)", fg: "rgb(11, 12, 15)" }],
	]) {
		it(`« Tout accepter » is solid ink, « Tout refuser » an outlined button of the same size (${scheme})`, async () => {
			const { page, dispose } = await open({ render: article({ html: LONG }), colorScheme: scheme, viewport: PHONE });
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
			// The article's « back to the top » button moves above the notice across the bottom
			const [button, card] = await page.evaluate(() => [
				document.querySelector(".progress-button").getBoundingClientRect().bottom,
				document.querySelector("[data-consent-notice]").getBoundingClientRect().top,
			]);
			assert.ok(button <= card, `back to the top (${button}) above the notice (${card})`);
			await dispose();
		});
	}

	it("respects Global Privacy Control: no notice, the facades still ask, one click still works", async () => {
		const { page, dispose } = await open({
			render: article({ html: LONG }),
			initScript: () => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }),
		});
		await page.locator("[data-embed-facade].embed-facade--ask").waitFor();
		await page.mouse.wheel(0, 700);
		await page.waitForTimeout(400);
		assert.equal(await notice(page).count(), 0);
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
		await page
			.locator("[data-consent-notice]")
			.waitFor({ state: "attached", timeout: 15000 })
			.catch(() => {});
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
