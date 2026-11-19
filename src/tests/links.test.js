// Links in the text of posts and pages (src/css/article/links.css) and the « Style des liens » display
// setting: « Couleur » by default (accent colour, no underline at rest, underlined on hover and keyboard
// focus), « Soulignés » as the alternative (the text colour, underlined).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { article, LONG_HTML } from "./support/article.js";
import { template, DEFAULT_CUSTOM } from "./support/pages.js";

const LINKED = '<p>Un paragraphe avec <a href="/x/">un lien</a> au milieu de la phrase.</p>';
const HTML = LINKED + LONG_HTML;
const THEMES = ["geekly", "desert", "ink", "forest"];
const MODES = ["light", "dark"];

// The link of the first paragraph: its colour, underline, and its contrast with the page and the text
const linkIn = (page, selector = ".gh-content p a") =>
	page.evaluate(sel => {
		const rgb = value =>
			value
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
		const a = document.querySelector(sel);
		const s = getComputedStyle(a);
		const text = getComputedStyle(a.parentElement).color;
		const bg = getComputedStyle(document.documentElement).backgroundColor;
		const accent = getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--color-accent");
		const probe = document.createElement("span");
		probe.style.color = accent;
		document.body.append(probe);
		const accentColour = getComputedStyle(probe).color;
		probe.remove();
		return {
			colour: s.color,
			accent: accentColour,
			text,
			line: s.textDecorationLine,
			thickness: s.textDecorationThickness,
			onPage: Math.round(ratio(s.color, bg) * 100) / 100,
			onText: Math.round(ratio(s.color, text) * 100) / 100,
		};
	}, selector);

const settings = (theme, links) =>
	JSON.stringify({ ...(theme === "geekly" ? {} : { theme }), ...(links ? { links } : {}) });

describe("links in the text", () => {
	before(launch);
	after(close);

	it("« Couleur » by default: accent colour, no underline at rest, underline on hover and keyboard focus, four themes light and dark", async () => {
		const ratios = {};
		for (const theme of THEMES) {
			for (const mode of MODES) {
				const { page, dispose } = await open({
					render: article({ member: true, html: HTML }),
					storage: { theme: mode, "attibling-reading": settings(theme) },
				});
				const where = `${theme} ${mode}`;
				const rest = await linkIn(page);
				assert.equal(rest.line, "none", `${where}: no underline at rest`);
				assert.equal(rest.colour, rest.accent, `${where}: the accent colour`);
				assert.notEqual(rest.colour, rest.text, `${where}: not the text colour`);
				assert.ok(rest.onPage >= 4.5, `${where}: ${rest.onPage}:1 on the page`);
				ratios[where] = rest.onText;
				await page.locator(".gh-content p a").first().hover();
				assert.equal((await linkIn(page)).line, "underline", `${where}: underlined on hover`);
				await page.mouse.move(0, 0);
				await page.keyboard.press("Tab");
				await page.evaluate(() => document.querySelector(".gh-content p a").focus());
				assert.equal((await linkIn(page)).line, "underline", `${where}: underlined on keyboard focus`);
				await dispose();
			}
		}
		// Colour against the body text (documented in docs/guide-auteur.md): under 3:1 by design
		console.log("link / text contrast:", JSON.stringify(ratios));
	});

	it("« Soulignés »: the text colour with an underline, thicker on hover, four themes light and dark", async () => {
		for (const theme of THEMES) {
			for (const mode of MODES) {
				const { page, dispose } = await open({
					render: article({ member: true, html: HTML }),
					storage: { theme: mode, "attibling-reading": settings(theme, "underline") },
				});
				const where = `${theme} ${mode}`;
				const rest = await linkIn(page);
				assert.equal(rest.line, "underline", `${where}: underlined`);
				assert.equal(rest.colour, rest.text, `${where}: the text colour`);
				await page.locator(".gh-content p a").first().hover();
				const hover = await linkIn(page);
				assert.ok(parseFloat(hover.thickness) > parseFloat(rest.thickness), `${where}: thicker on hover`);
				await dispose();
			}
		}
	});

	it("the choice is saved, applied before the first paint, and ignored for visitors", async () => {
		const member = await open({ render: article({ member: true, html: HTML }) });
		await member.page.locator("[data-reading-button]").click();
		await member.page.locator('input[name="links"][value="underline"]').check({ force: true });
		assert.equal(
			await member.page.evaluate(() => JSON.parse(localStorage.getItem("attibling-reading")).links),
			"underline",
		);
		await member.page.reload();
		assert.equal(await member.page.evaluate(() => document.documentElement.dataset.readingLinks), "underline");
		assert.equal((await linkIn(member.page)).line, "underline");
		assert.equal(
			await member.page.locator('input[name="links"][value="underline"]').isChecked(),
			true,
			"the panel shows it",
		);
		// Back to « Couleur »: nothing stays stored for the default
		await member.page.locator("[data-reading-button]").click();
		await member.page.locator('input[name="links"][value="color"]').check({ force: true });
		assert.equal(await member.page.evaluate(() => localStorage.getItem("attibling-reading")), null);
		assert.equal((await linkIn(member.page)).line, "none");
		await member.dispose();

		const visitor = await open({
			render: article({ html: HTML }),
			storage: { "attibling-reading": settings("geekly", "underline") },
		});
		const seen = await linkIn(visitor.page);
		assert.equal(seen.line, "none");
		assert.equal(seen.colour, seen.accent);
		await visitor.dispose();
	});

	it("pages follow the same rule, and a member's « Soulignés » too", async () => {
		for (const name of ["page", "page-a-propos"]) {
			const visitor = await open({ render: template(name, { post: { html: LINKED } }) });
			const rest = await linkIn(visitor.page);
			assert.deepEqual([rest.line, rest.colour === rest.accent], ["none", true], `${name}: colour, no underline`);
			await visitor.dispose();

			const member = await open({
				render: template(name, {
					member: true,
					post: { html: LINKED },
					custom: { ...DEFAULT_CUSTOM, reading_settings: true },
				}),
				storage: { "attibling-reading": settings("geekly", "underline") },
			});
			const underlined = await linkIn(member.page);
			assert.deepEqual(
				[underlined.line, underlined.colour === underlined.text],
				["underline", true],
				`${name}: the member's choice`,
			);
			await member.dispose();
		}
	});
});
