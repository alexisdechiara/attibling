import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { article, LONG_HTML, SUMMARY_CARD, AI_SUMMARY_CARD, REVIEW_CARD } from "./support/article.js";

// What the series box shows: visible rows (number and title, or « ⋯ n parties »), the count, the bar,
// and the previous / next links of the box and of the end line
const series = page =>
	page.evaluate(() => {
		const box = document.querySelector("[data-series]");
		if (!box) return null;
		const visible = el => el.checkVisibility();
		const rows = [...box.querySelectorAll("[data-series-list] > li")].filter(visible).map(li => {
			if (li.querySelector(".series__more")) return li.textContent.trim();
			if (li.matches(".series__upcoming")) return li.textContent.trim();
			return `${li.dataset.part}${li.matches(".series__item--current") ? "*" : ""}`;
		});
		const links = root =>
			[...root.querySelectorAll(".series-step__link")].filter(visible).map(a => a.getAttribute("aria-label"));
		const bar = box.querySelector(".series__bar");
		return {
			name: box.querySelector("[data-series-name]").textContent,
			count: box.querySelector(".series__count-long").textContent,
			bar: Math.round(parseFloat(getComputedStyle(bar).backgroundSize)),
			rows,
			box: links(box),
			line: links(document.querySelector("[data-series-line]")),
			all: box.querySelector("[data-series-all]").getAttribute("href"),
		};
	});

describe("series", () => {
	before(launch);
	after(close);

	it("lists a short series in full, with the previous and next parts", async () => {
		const { page, dispose } = await open({
			render: article({ series: { published: 4, current: 2, description: "Construire son homelab" } }),
		});
		const s = await series(page);
		assert.equal(s.name, "Construire son homelab");
		assert.equal(s.count, "Partie 2 sur 4");
		assert.equal(s.bar, 50, "progress bar at 2 / 4");
		assert.deepEqual(s.rows, ["1", "2*", "3", "4"]);
		assert.deepEqual(s.box, [
			"Partie précédente : Jour 1 — partie de la série",
			"Partie suivante : Jour 3 — partie de la série",
		]);
		assert.deepEqual(s.line, s.box, "the same at the end of the article");
		assert.equal(s.all, "http://theme.test/archives/?tag=hash-serie-test", "the Archives page filtered by the series");
		assert.equal(await page.locator(".series__item--current").getAttribute("aria-current"), "page");
		await dispose();
	});

	it("has no previous part on the first part and no next part on the last", async () => {
		const first = await open({ render: article({ series: { published: 4, current: 1 } }) });
		const a = await series(first.page);
		assert.deepEqual([a.box.length, a.line.length], [1, 1]);
		assert.match(a.box[0], /^Partie suivante : Jour 2/);
		await first.dispose();

		const last = await open({ render: article({ series: { published: 4, current: 4 } }) });
		const b = await series(last.page);
		assert.equal(b.count, "Partie 4 sur 4");
		assert.match(b.box[0], /^Partie précédente : Jour 3/);
		assert.deepEqual([b.box.length, b.line.length], [1, 1]);
		await last.dispose();
	});

	it("takes the planned total from the tag description, and condenses a long series being published", async () => {
		const { page, dispose } = await open({
			render: article({
				series: { published: 12, current: 12, description: "Calendrier de l’Avent 2025 · total: 24" },
			}),
		});
		const s = await series(page);
		assert.equal(s.name, "Calendrier de l’Avent 2025");
		assert.equal(s.count, "Partie 12 sur 24");
		assert.equal(s.bar, 50);
		assert.deepEqual(s.rows, ["1", "9 parties", "11", "12*", "12 parties à venir"]);
		assert.deepEqual(s.box.length, 1, "no next part yet");

		// « ⋯ 9 parties » unfolds them and moves the focus to the first one
		await page.locator(".series__more").click();
		const open1 = await series(page);
		assert.deepEqual(open1.rows, [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12*",
			"12 parties à venir",
		]);
		assert.equal(await page.evaluate(() => document.activeElement.closest("li").dataset.part), "2");
		await dispose();
	});

	it("condenses a long finished series around the current part; each « ⋯ » unfolds its parts", async () => {
		const { page, dispose } = await open({ render: article({ series: { published: 24, current: 12 } }) });
		const s = await series(page);
		assert.equal(s.count, "Partie 12 sur 24");
		assert.deepEqual(s.rows, ["1", "9 parties", "11", "12*", "13", "10 parties", "24"]);
		await page.locator(".series__more").first().click();
		await page.locator(".series__more").first().click();
		assert.equal((await series(page)).rows.length, 24);
		await dispose();
	});

	it("shows nothing for a post without series or alone in its series", async () => {
		const none = await open({ render: article() });
		assert.equal(await series(none.page), null);
		assert.equal(await none.page.locator("[data-series-line]").count(), 0);
		await none.dispose();
		const alone = await open({ render: article({ series: { published: 1, current: 1 } }) });
		assert.equal(await series(alone.page), null);
		await alone.dispose();
	});
});

describe("« En bref »", () => {
	before(launch);
	after(close);

	const summary = page =>
		page.evaluate(() => {
			const shown = el => Boolean(el) && el.checkVisibility();
			const block = document.querySelector(".en-bref:not([hidden])");
			const teaser = document.querySelector("[data-summary-teaser]");
			return {
				shown: shown(block),
				inIntro: Boolean(block?.closest("[data-article-intro]")),
				label: block?.getAttribute("aria-label") || null,
				title: block ? getComputedStyle(block, "::before").content : null,
				source: block ? getComputedStyle(block, "::after").content : null,
				points: block ? [...block.querySelectorAll("li")].map(li => li.textContent.trim()) : [],
				teaser: shown(teaser) ? teaser.innerText.replace(/\s+/g, " ").trim() : null,
			};
		});

	it("shows members the author's numbered points above the text, without needing the script to style them", async () => {
		const { page, dispose } = await open({ render: article({ member: true, html: SUMMARY_CARD + LONG_HTML }) });
		const s = await summary(page);
		assert.equal(s.shown, true);
		assert.equal(s.inIntro, true);
		assert.equal(s.label, "En bref");
		assert.equal(s.title, '"En bref"');
		assert.match(s.source, /Résumé de l’auteur/);
		assert.equal(s.points.length, 3);
		assert.equal(s.teaser, null);
		await dispose();
	});

	it("gives visitors a teaser with « S'abonner » and « Se connecter » instead, and only when the post has a summary", async () => {
		const withSummary = await open({ render: article({ html: SUMMARY_CARD + LONG_HTML }) });
		const s = await summary(withSummary.page);
		assert.equal(s.shown, false);
		assert.equal(s.teaser, "En bref Résumé réservé aux abonnés. S'abonner Se connecter");
		await withSummary.dispose();

		const without = await open({ render: article() });
		assert.equal((await summary(without.page)).teaser, null);
		await without.dispose();
	});

	it("shows the summary to visitors too when the theme setting summary_for_visitors is on", async () => {
		const { page, dispose } = await open({
			render: article({ html: SUMMARY_CARD + LONG_HTML, custom: { summary_for_visitors: true } }),
		});
		const s = await summary(page);
		assert.equal(s.shown, true);
		assert.equal(s.teaser, null);
		await dispose();
	});

	it("labels an AI summary as such, and prefers the author's own when there are both", async () => {
		const ai = await open({ render: article({ member: true, html: AI_SUMMARY_CARD + LONG_HTML }) });
		assert.match((await summary(ai.page)).source, /Résumé généré par IA/);
		await ai.dispose();

		const both = await open({ render: article({ member: true, html: AI_SUMMARY_CARD + SUMMARY_CARD + LONG_HTML }) });
		const s = await summary(both.page);
		assert.match(s.source, /Résumé de l’auteur/);
		assert.equal(s.points.length, 3);
		assert.equal(await both.page.locator(".en-bref[data-source=ia]").isVisible(), false);
		await both.dispose();
	});
});

describe("fiche de test", () => {
	before(launch);
	after(close);

	it("styles the review card: score box, strengths and weaknesses, verdict; an empty part is left out", async () => {
		const html = LONG_HTML + REVIEW_CARD.replace("<dd>Action-RPG</dd>", "<dd></dd>");
		const { page, dispose } = await open({ render: article({ html }) });
		const card = await page.evaluate(() => {
			const el = document.querySelector(".fiche-test");
			const note = el.querySelector(".fiche-test__note").getBoundingClientRect();
			const plus = el.querySelector(".fiche-test__plus").getBoundingClientRect();
			const moins = el.querySelector(".fiche-test__moins").getBoundingClientRect();
			const shown = s => el.querySelector(s).checkVisibility();
			return {
				noteRight: Math.round(el.getBoundingClientRect().right - note.right),
				sideBySide: Math.abs(plus.top - moins.top) < 2 && moins.left > plus.left,
				genre: [shown("dt:nth-of-type(2)"), shown("dd:nth-of-type(2)")],
				background: getComputedStyle(el).backgroundColor,
			};
		});
		assert.equal(card.noteRight, 32, "score box in the top right corner");
		assert.equal(card.sideBySide, true);
		assert.deepEqual(card.genre, [false, false], "empty « Genre » left out");
		assert.equal(card.background, "rgb(255, 255, 255)");
		await page.setViewportSize({ width: 390, height: 844 });
		const stacked = await page.evaluate(() => {
			const plus = document.querySelector(".fiche-test__plus").getBoundingClientRect();
			const moins = document.querySelector(".fiche-test__moins").getBoundingClientRect();
			return moins.top >= plus.bottom - 1;
		});
		assert.equal(stacked, true, "one column on phones");
		await dispose();
	});

	it("adds Review structured data only when the card gives a score", async () => {
		const { page, dispose } = await open({ render: article({ html: LONG_HTML + REVIEW_CARD }) });
		const data = JSON.parse(await page.locator("script[data-review-jsonld]").textContent());
		assert.equal(data["@type"], "Review");
		assert.deepEqual(data.itemReviewed, { "@type": "CreativeWork", name: "Jeu Fictif 2077" });
		assert.deepEqual(data.reviewRating, { "@type": "Rating", ratingValue: 8.5, bestRating: 10, worstRating: 0 });
		assert.equal(data.author.name, "Alexis De Chiara");
		assert.equal(data.reviewBody, "Un excellent jeu, à quelques détails près.");
		await dispose();

		const noScore = REVIEW_CARD.replace('<p class="fiche-test__note"><strong>8,5</strong>/10</p>', "");
		const other = await open({ render: article({ html: LONG_HTML + noScore }) });
		assert.equal(await other.page.locator("script[data-review-jsonld]").count(), 0);
		await other.dispose();
	});
});
