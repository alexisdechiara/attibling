// Reference document (partials/pages/document.hbs: page-mentions-legales.hbs, custom-document.hbs) and
// what it shares with the generic page (page.hbs): table of contents, last-updated date, measure,
// phones, print. And the list of what the theme keeps in the browser, which the author guide and the
// proposed legal notice must keep in step with the code.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, close, open } from "./support/harness.js";
import { template } from "./support/pages.js";
import { STORAGE } from "../js/privacy/registry.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

// A legal notice as the author pastes it (Markdown card: headings, a <dl>, a table, lists, links)
const HTML = `
<p>GEEKLY est un blog personnel. Cette page dit qui le publie, qui l'héberge, ce qu'il fait de vos données et comment me contacter, avec assez de mots pour remplir plusieurs lignes de la colonne de lecture.</p>
<h2 id="editeur-du-site">Éditeur du site</h2>
<dl><dt>Éditeur et directeur de la publication</dt><dd>Alexis De Chiara</dd><dt>Contact</dt><dd><a href="mailto:contact@example.com">contact@example.com</a></dd></dl>
<h2 id="hebergement">Hébergement</h2>
<p>Le site fonctionne avec <a href="https://ghost.org/?ref=example.com">Ghost</a>, voir aussi <a href="https://example.com/">https://example.com</a>.</p>
<h2 id="donnees-personnelles">Données personnelles</h2>
<h3 id="qui-est-responsable">Qui est responsable</h3>
<p>Le responsable du traitement de vos données est l'éditeur.</p>
<h3 id="vos-droits">Vos droits</h3>
<ul><li>accéder à vos données ;</li><li>les faire corriger ou supprimer ;</li></ul>
<h2 id="stockage">Ce que le site garde dans votre navigateur</h2>
<table><thead><tr><th>Nom</th><th>Pour qui</th><th>À quoi il sert</th><th>Durée</th></tr></thead>
<tbody><tr><td><code>attibling-promo-closed</code></td><td>visiteurs</td><td>Ne plus afficher l'encart d'abonnement de l'accueil après l'avoir fermé</td><td>Jusqu'à l'effacement des données du site</td></tr></tbody></table>
${"<p>Un paragraphe de plus pour que la page défile au-delà de la hauteur de l'écran, comme une vraie page de mentions légales.</p>".repeat(12)}
`;

const legal = (options = {}) =>
	template("page-mentions-legales", {
		...options,
		post: { html: HTML, custom_excerpt: "Qui publie GEEKLY.", ...options.post },
	});

describe("reference document", () => {
	before(launch);
	after(close);

	it("keeps the page's enhancements when a gallery image has no width and height", async () => {
		const gallery = `<figure class="kg-card kg-gallery-card"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/src/tests/fixtures/pixel.svg" alt=""></div></div></div></figure>`;
		for (const render of [
			legal({ post: { html: gallery + HTML } }),
			template("page", { post: { html: gallery + HTML } }),
		]) {
			const { page, errors, dispose } = await open({ render, viewport: WIDE });
			await page.waitForSelector(".table-scroll");
			if (render.template !== "page") await page.waitForSelector("[data-document-toc]:not([hidden]) .toc-link");
			assert.equal(await page.locator(".kg-gallery-image img.js-zoomable").count(), 1);
			assert.deepEqual(
				errors.map(error => error.message),
				[],
			);
			await dispose();
		}
	});

	it("keeps the page's other enhancements when one of them fails, and still reports the error", async () => {
		const frame = '<iframe width="640" height="360" src="about:blank"></iframe>';
		const { page, errors, dispose } = await open({
			render: legal({ post: { html: frame + HTML } }),
			viewport: WIDE,
			initScript: () => {
				HTMLIFrameElement.prototype.getAttribute = () => {
					throw new Error("broken embed");
				};
			},
		});
		await page.waitForSelector("[data-document-toc]:not([hidden]) .toc-link");
		assert.equal(await page.locator(".table-scroll").count(), 1);
		assert.deepEqual(
			errors.map(error => error.message),
			["broken embed"],
		);
		// dispose() fails a test on any page error: this one is the point of the test
		errors.length = 0;
		await dispose();
	});

	it("builds a table of contents from the h2 and h3, sticky beside the text on wide screens", async () => {
		const { page, dispose } = await open({ render: legal(), viewport: WIDE });
		await page.waitForSelector("[data-document-toc]:not([hidden]) .toc-link");
		const links = await page.$$eval("[data-document-toc] .toc-link", els => els.map(a => a.getAttribute("href")));
		assert.deepEqual(links, [
			"#editeur-du-site",
			"#hebergement",
			"#donnees-personnelles",
			"#qui-est-responsable",
			"#vos-droits",
			"#stockage",
		]);
		const state = await page.evaluate(() => {
			const toc = document.querySelector("[data-document-toc]");
			const nav = toc.querySelector(".document-toc__nav");
			const text = document.querySelector("[data-document-content]").getBoundingClientRect();
			return {
				open: toc.open,
				sticky: getComputedStyle(toc).position,
				summary: getComputedStyle(toc.querySelector("summary")).display,
				beside: nav.getBoundingClientRect().left >= text.right,
			};
		});
		assert.deepEqual(state, { open: true, sticky: "sticky", summary: "none", beside: true });
		// It stays in view while the reader scrolls through the text
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
		const top = await page.evaluate(() => document.querySelector(".document-toc__nav").getBoundingClientRect().top);
		assert.ok(top >= 0 && top < 200, `table of contents at ${Math.round(top)} px from the top after scrolling`);
		// The copy-link button of articles on each heading of the text
		assert.equal(await page.locator("[data-document-content] > :is(h2, h3) .heading-link").count(), 6);
		await dispose();
	});

	it("shows the table of contents as a closed « Sommaire » disclosure on phones", async () => {
		const { page, dispose } = await open({ render: legal({ locale: "fr" }), viewport: PHONE });
		await page.waitForSelector("[data-document-toc]:not([hidden])");
		const toc = page.locator("[data-document-toc]");
		assert.equal(await toc.evaluate(el => el.open), false);
		const summary = toc.locator("summary");
		assert.equal((await summary.textContent()).trim(), "Sommaire");
		assert.ok((await summary.boundingBox()).height >= 44, "44 px target");
		await summary.click();
		assert.equal(await toc.evaluate(el => el.open), true);
		// A link chosen closes it again
		await toc.locator('.toc-link[href="#vos-droits"]').click();
		assert.equal(await toc.evaluate(el => el.open), false);
		await dispose();
	});

	it("has no table of contents with fewer than two headings", async () => {
		const { page, dispose } = await open({
			render: legal({ post: { html: "<h2 id='seul'>Seul titre</h2><p>Texte.</p>" } }),
			viewport: WIDE,
		});
		await page.waitForSelector("[data-document-print]:not([hidden])");
		assert.equal(await page.locator("[data-document-toc]").isHidden(), true);
		await dispose();
	});

	it("shows the date of the last update and a print button", async () => {
		const { page, dispose } = await open({ render: legal({ locale: "fr" }), viewport: WIDE });
		const time = page.locator(".document__updated time");
		assert.equal(await time.getAttribute("datetime"), "2026-03-14");
		assert.match(await page.locator(".document__updated").textContent(), /^Dernière mise à jour le\s+14 mars 2026$/);
		const print = page.locator("[data-document-print]");
		await print.waitFor({ state: "visible" });
		assert.equal((await print.textContent()).trim(), "Imprimer");
		await page.evaluate(() => (window.print = () => (window.__printed = true)));
		await print.click();
		assert.equal(await page.evaluate(() => window.__printed), true);
		await dispose();
	});

	it("the « Document » template renders the same page for any slug", async () => {
		const { page, dispose } = await open({ render: { ...legal(), template: "custom-document" }, viewport: WIDE });
		assert.equal(await page.locator("[data-document] h1").textContent(), "Mentions légales");
		assert.equal(await page.locator("h1").count(), 1);
		await dispose();
	});

	// Pages are set in Onest, about 0.45 em per character of French text on average: 60 to 75 characters
	// per line is 27 to 33.5 em of the text size. (The tests do not load web fonts; see the local Ghost
	// measures in the report of the header and footer feedback.)
	it("keeps the text at a reading measure on wide screens, for documents and ordinary pages", async () => {
		for (const render of [legal(), template("page", { post: { html: HTML } })]) {
			const { page, dispose } = await open({ render, viewport: WIDE });
			const ems = await page.evaluate(() => {
				const p = document.querySelector(".page-content > p");
				return p.getBoundingClientRect().width / parseFloat(getComputedStyle(p).fontSize);
			});
			assert.ok(ems >= 27 && ems <= 33.5, `${render.template}: ${ems.toFixed(1)} em`);
			await dispose();
		}
	});

	it("does not scroll sideways at 390 px: a table with a header row stacks, another scrolls in its own box", async () => {
		const bare =
			"<table><tbody><tr><td><code>attibling-promo-closed</code></td><td>visiteurs</td><td>Ne plus afficher l'encart d'abonnement de l'accueil après l'avoir fermé</td><td>Jusqu'à l'effacement des données du site</td></tr></tbody></table>";
		for (const render of [legal(), template("page", { post: { html: HTML + bare } })]) {
			const { page, dispose } = await open({ render, viewport: PHONE });
			await page.waitForSelector(".table-scroll");
			assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0);
			const boxes = await page.$$eval(".table-scroll", els =>
				els.map(el => {
					const cell = el.querySelector("td:nth-child(3)");
					return {
						stacked: el.classList.contains("table-scroll--stack"),
						overflows: el.scrollWidth > el.clientWidth,
						focusable: el.tabIndex === 0,
						label: cell.dataset.label || null,
						role: cell.getAttribute("role"),
					};
				}),
			);
			assert.deepEqual(
				boxes[0],
				{ stacked: true, overflows: false, focusable: false, label: "À quoi il sert", role: "cell" },
				render.template,
			);
			if (boxes[1]) {
				assert.deepEqual(boxes[1], { stacked: false, overflows: true, focusable: true, label: null, role: null });
			}
			await dispose();
		}
	});

	it("prints the title, the date and the text only, with the address of external links", async () => {
		for (const render of [legal(), template("page", { post: { html: HTML } })]) {
			const { page, dispose } = await open({ render, viewport: WIDE });
			assert.equal(await page.locator('link[rel="stylesheet"][media="print"][href*="css/print.css"]').count(), 1);
			await page.waitForSelector(".gh-content a[data-print-href]");
			await page.emulateMedia({ media: "print" });
			const printed = await page.evaluate(() => {
				const shown = sel => [...document.querySelectorAll(sel)].some(el => el.getClientRects().length > 0);
				const ghost = document.querySelector('.gh-content a[href^="https://ghost.org"]');
				const plain = document.querySelector('.gh-content a[href="https://example.com/"]');
				return {
					header: shown(".site-header"),
					footer: shown(".site-footer"),
					skip: shown(".skip-link"),
					toc: shown("[data-document-toc]"),
					print: shown("[data-document-print]"),
					headingLinks: shown(".heading-link"),
					title: shown("main h1"),
					text: shown(".page-content > p"),
					background: getComputedStyle(document.body).backgroundColor,
					after: getComputedStyle(ghost, "::after").content,
					plainAfter: getComputedStyle(plain, "::after").content,
				};
			});
			assert.deepEqual(
				printed,
				{
					header: false,
					footer: false,
					skip: false,
					toc: false,
					print: false,
					headingLinks: false,
					title: true,
					text: true,
					background: "rgb(255, 255, 255)",
					after: '" (https://ghost.org/)"',
					plainAfter: "none",
				},
				render.template,
			);
			await dispose();
		}
	});
});

// --- What the theme keeps in the browser --------------------------------------------------------------
// One source of truth, src/js/privacy/registry.js: every localStorage / sessionStorage key the theme's
// code uses (src/js, templates) must be declared there, and every key declared as the theme's must still
// be used. The registry feeds the « Cookies et confidentialité » page (partials/privacy/stored.hbs: one
// row per key, in the same order) and the author guide's table « Ce que le thème garde dans le
// navigateur »; the proposed legal notice points to that page instead of copying the table.

const walk = dir =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === "tests" ? [] : walk(full);
		return /\.(js|hbs)$/.test(entry.name) ? [full] : [];
	});

const storageKeysInCode = () => {
	const files = [
		...walk(path.join(ROOT, "src/js")).filter(f => !f.endsWith(path.join("privacy", "registry.js"))),
		...walk(path.join(ROOT, "partials")),
		...fs
			.readdirSync(ROOT)
			.filter(f => f.endsWith(".hbs"))
			.map(f => path.join(ROOT, f)),
	];
	const keys = new Set();
	for (const file of files) {
		const source = fs.readFileSync(file, "utf8");
		const constants = Object.fromEntries(
			[...source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']([^"']+)["']/g)].map(m => [m[1], m[2]]),
		);
		for (const [, arg] of source.matchAll(/(?:local|session)Storage\.(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)) {
			const literal = arg.trim().match(/^["']([^"']+)["']$/);
			if (literal) keys.add(literal[1]);
			else if (constants[arg.trim()]) keys.add(constants[arg.trim()]);
			// A helper taking the key as a parameter (store.js read/write): the file's *_KEY constants
			else for (const [name, value] of Object.entries(constants)) if (name.endsWith("KEY")) keys.add(value);
		}
	}
	return keys;
};

// Rows of the guide's table: | `key` | storage | set by | …
const guideRows = () => {
	const guide = fs.readFileSync(path.join(ROOT, "docs/guide-auteur.md"), "utf8");
	const start = guide.indexOf("### Ce que le thème garde dans le navigateur");
	assert.ok(start > 0, "the guide has the section « Ce que le thème garde dans le navigateur »");
	const section = guide.slice(start, guide.indexOf("\n### ", start + 10));
	return [...section.matchAll(/^\| `([^`]+)` \| ([^|]+) \| ([^|]+) \|/gm)].map(m => ({
		key: m[1],
		storage: m[2].trim(),
		by: m[3].trim(),
	}));
};

const BY = { theme: "thème", ghost: "Ghost" };
const STORAGE_NAME = { local: "localStorage", session: "sessionStorage" };

describe("what the theme keeps in the browser", () => {
	it("every storage key in the code is declared in the registry, and nothing else", () => {
		const code = storageKeysInCode();
		const theme = STORAGE.filter(entry => entry.by === "theme").map(entry => entry.key);
		assert.ok(code.has("theme") && code.has("attibling-saved"), "the scan finds the known keys");
		assert.deepEqual([...code].sort(), [...theme].sort(), "src/js/privacy/registry.js = keys used by the theme");
		assert.equal(new Set(STORAGE.map(e => e.key)).size, STORAGE.length, "no key declared twice");
	});

	it("the author guide's table lists the registry, row for row", () => {
		assert.deepEqual(
			guideRows(),
			STORAGE.map(entry => ({ key: entry.key, storage: STORAGE_NAME[entry.storage], by: BY[entry.by] })),
			"docs/guide-auteur.md, « Ce que le thème garde dans le navigateur »",
		);
	});

	it("the page « Cookies et confidentialité » renders one row per key of the registry", () => {
		const partial = fs.readFileSync(path.join(ROOT, "partials/privacy/stored.hbs"), "utf8");
		const rows = [...partial.matchAll(/data-storage-key="([^"]+)"/g)].map(m => m[1]);
		assert.deepEqual(
			rows,
			STORAGE.map(entry => entry.key),
			"partials/privacy/stored.hbs",
		);
	});

	it("the proposed legal notice points to the cookies page instead of copying its tables", () => {
		const proposal = fs.readFileSync(path.join(ROOT, "docs/mentions-legales-proposition.md"), "utf8");
		const text = proposal.slice(
			proposal.indexOf("<!-- Texte à coller"),
			proposal.indexOf("<!-- Fin du texte à coller"),
		);
		assert.match(text, /\]\(https:\/\/geekly\.blog\/cookies\/\)/);
		for (const entry of STORAGE) assert.ok(!text.includes(`| \`${entry.key}\` |`), `${entry.key} copied in the notice`);
	});
});
