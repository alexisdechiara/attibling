import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, SITE } from "./support/harness.js";
import { article } from "./support/article.js";
import { template } from "./support/pages.js";

// Third-party embeds as Ghost writes them in the post HTML (embed cards, an HTML card)
export const YOUTUBE_CARD =
	'<figure class="kg-card kg-embed-card kg-card-hascaption"><iframe width="200" height="113" src="https://www.youtube.com/embed/_jGbRsxHi7Q?start=12&amp;feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="" title="Un revenu inconditionnel ?"></iframe><figcaption>Une légende</figcaption></figure>';
export const X_CARD =
	'<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="fr" dir="ltr">Le texte de la publication.</p>— Une personne (@quelqu_un) <a href="https://twitter.com/quelqu_un/status/2021734851636797553?ref_src=twsrc%5Etfw">February 11, 2026</a></blockquote>\n<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>';
const OTHER_FRAME =
	'<iframe style="width:100%;min-height:400px;" src="https://embed.example.org/widget?id=1" frameborder="0"></iframe>';
const LOCAL_CARD =
	'<figure class="kg-card kg-embed-card"><iframe class="local" width="640" height="480" src="about:blank"></iframe></figure>';
const HTML = `<p>Intro.</p>${YOUTUBE_CARD}<p>Milieu.</p>${X_CARD}<p>Encore.</p>${OTHER_FRAME}${LOCAL_CARD}<p>Fin.</p>`;

// The facade on its own, one click per embed (setting consent_notice = None); with the consent notice
// (the default) the facade asks for consent itself: src/tests/privacy.test.js
const facadeOnly = (options = {}) => article({ ...options, custom: { ...options.custom, consent_notice: "None" } });
const THIRD_PARTY = /youtube|twitter|x\.com|example\.org|ytimg|doubleclick/;
const thirdParty = requests => requests.filter(url => THIRD_PARTY.test(new URL(url).host));

// What each facade shows
const facades = page =>
	page.$$eval("[data-embed-facade]", els =>
		els.map(el => ({
			provider: el.dataset.provider,
			label: el.querySelector("[data-embed-load]").textContent.trim(),
			title: el.querySelector("[data-embed-title]")?.textContent.trim() || null,
			note: el.querySelector("[data-embed-note]").textContent.trim(),
			always: el.querySelector("[data-embed-always]").closest("label").textContent.trim(),
			link: el.querySelector("[data-embed-open]").href,
			linkTarget: el.querySelector("[data-embed-open]").target,
			quote: !!el.querySelector("blockquote"),
			ratio: Math.round((el.offsetWidth / el.querySelector("[data-embed-poster]").offsetHeight) * 100) / 100,
		})),
	);

describe("third-party embeds", () => {
	before(launch);
	after(close);

	it("send no request to the provider before the reader asks: a CSP blocks them, a facade stands in", async () => {
		const { page, requests, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		await waitFor(() =>
			page
				.locator("[data-embed-facade]")
				.count()
				.then(n => n === 3),
		);
		await page.waitForTimeout(300);
		assert.deepEqual(thirdParty(requests), []);
		const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content");
		assert.match(csp, /frame-src 'self'/);
		assert.match(csp, /script-src 'self' 'unsafe-inline'[^;]* https:\/\/cdn\.jsdelivr\.net/);
		assert.doesNotMatch(csp, /youtube|twitter/);
		const [youtube, x, other] = await facades(page);
		assert.deepEqual(
			{ ...youtube, ratio: undefined },
			{
				provider: "youtube",
				label: "Afficher la vidéo YouTube",
				title: "Un revenu inconditionnel ?",
				note: "L’afficher charge ce contenu depuis YouTube, qui reçoit alors votre adresse IP et peut déposer des cookies ou d’autres traceurs.",
				always: "Toujours afficher les contenus de YouTube",
				link: "https://www.youtube.com/watch?v=_jGbRsxHi7Q&t=12",
				linkTarget: "_blank",
				quote: false,
				ratio: undefined,
			},
		);
		assert.ok(Math.abs(youtube.ratio - 200 / 113) < 0.05, `16:9 poster, got ${youtube.ratio}`);
		assert.equal(x.provider, "x");
		assert.equal(x.label, "Afficher la publication X");
		assert.equal(x.link, "https://twitter.com/quelqu_un/status/2021734851636797553?ref_src=twsrc%5Etfw");
		assert.equal(x.quote, true, "the post's text stays readable without loading anything");
		assert.equal(other.provider, "embed.example.org");
		assert.equal(other.label, "Afficher le contenu de embed.example.org");
		// The caption stays, the site's own frame is left alone
		assert.equal(await page.locator("figcaption", { hasText: "Une légende" }).count(), 1);
		assert.equal(await page.locator("iframe.local").count(), 1);
		await dispose();
	});

	it("load YouTube in privacy-enhanced mode on click, with autoplay, and move the focus into the player", async () => {
		const { page, requests, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		const button = page.locator('[data-provider="youtube"] [data-embed-load]');
		await button.click();
		const frame = page.locator("iframe[data-embed-frame]");
		await frame.waitFor();
		assert.match(await frame.getAttribute("src"), /^\/assets\/html\/embed\.html/);
		assert.equal(await frame.getAttribute("title"), "Contenu de YouTube — Un revenu inconditionnel ?");
		const inner = await waitFor(() =>
			frame.evaluate(f => {
				const player = f.contentDocument?.querySelector("iframe");
				return player && { src: player.src, allow: player.allow, focused: f.contentDocument.activeElement === player };
			}),
		);
		assert.equal(inner.src, "https://www.youtube-nocookie.com/embed/_jGbRsxHi7Q?start=12&autoplay=1");
		assert.match(inner.allow, /autoplay/);
		assert.match(inner.allow, /fullscreen/);
		assert.equal(await page.evaluate(() => document.activeElement?.matches("iframe[data-embed-frame]")), true);
		assert.equal(inner.focused, true);
		const contacted = thirdParty(requests).map(url => new URL(url).host);
		assert.ok(contacted.includes("www.youtube-nocookie.com"), contacted.join());
		assert.ok(!contacted.includes("www.youtube.com"), "never the youtube.com player");
		// Same ratio as the facade, caption kept
		const ratio = await frame.evaluate(f => f.offsetWidth / f.offsetHeight);
		assert.ok(Math.abs(ratio - 200 / 113) < 0.05, `player ratio ${ratio}`);
		assert.equal(await page.locator("figcaption", { hasText: "Une légende" }).count(), 1);
		await dispose();
	});

	it("load an X post with its script inside the site's own frame", async () => {
		const { page, requests, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		await page.locator('[data-provider="x"] [data-embed-load]').click();
		const frame = page.locator("iframe[data-embed-frame]");
		await frame.waitFor();
		const inside = await waitFor(() =>
			frame.evaluate(f => {
				const doc = f.contentDocument;
				const script = doc?.querySelector("script[src]");
				return (
					script && {
						script: script.src,
						quote: !!doc.querySelector("blockquote.twitter-tweet"),
						base: doc.querySelector("base")?.target,
					}
				);
			}),
		);
		assert.deepEqual(inside, { script: "https://platform.twitter.com/widgets.js", quote: true, base: "_blank" });
		assert.ok(thirdParty(requests).some(url => url.startsWith("https://platform.twitter.com/widgets.js")));
		await dispose();
	});

	it("remember « always show » per provider, load it at once next time, and let the reader take it back", async () => {
		const { page, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		const youtube = page.locator('[data-provider="youtube"]');
		await youtube.locator("[data-embed-always]").check();
		await youtube.locator("[data-embed-load]").click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("attibling-embeds"))), {
			youtube: true,
		});

		await page.reload({ waitUntil: "load" });
		const frame = page.locator("iframe[data-embed-frame]");
		await frame.waitFor();
		const src = await waitFor(() => frame.evaluate(f => f.contentDocument?.querySelector("iframe")?.src));
		assert.equal(src, "https://www.youtube-nocookie.com/embed/_jGbRsxHi7Q?start=12", "no autoplay without a click");
		assert.equal(await page.locator("[data-embed-facade]").count(), 2, "the other providers still wait");
		const stop = page.locator("[data-embed-stop]");
		assert.equal((await stop.textContent()).trim(), "Ne plus afficher automatiquement les contenus de YouTube");
		await stop.click();
		// Taken back: kept behind its facade, even if « Contenus intégrés » is accepted later
		assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("attibling-embeds"))), {
			youtube: false,
		});
		await dispose();
	});

	it("keep the blocked frames out of sight without JavaScript, with a sentence instead", async () => {
		const { page, requests, dispose } = await open({ render: facadeOnly({ html: HTML }), javaScriptEnabled: false });
		assert.deepEqual(thirdParty(requests), []);
		const state = await page.evaluate(() => {
			const frame = document.querySelector('iframe[src*="youtube"]');
			return {
				display: getComputedStyle(frame).display,
				message: getComputedStyle(frame.closest("figure"), "::before").content,
				local: getComputedStyle(document.querySelector("iframe.local")).display,
			};
		});
		assert.equal(state.display, "none");
		assert.match(state.message, /JavaScript/);
		assert.equal(state.local, "block");
		await dispose();
	});

	it("work on pages too", async () => {
		const { page, requests, dispose } = await open({ render: template("page", { post: { html: YOUTUBE_CARD } }) });
		await page.locator("[data-embed-facade]").waitFor();
		assert.deepEqual(thirdParty(requests), []);
		await dispose();
	});

	it("load directly, as Ghost writes them, when the setting embed_consent is off", async () => {
		const { page, requests, dispose } = await open({
			render: article({ html: HTML, custom: { embed_consent: false } }),
		});
		await page.waitForTimeout(300);
		assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0);
		assert.equal(await page.locator("[data-embed-facade]").count(), 0);
		assert.ok(thirdParty(requests).some(url => url.startsWith("https://www.youtube.com/embed/")));
		await dispose();
	});

	it("leave pages without third-party embeds alone (no CSP outside posts and pages, no extra script)", async () => {
		const home = await open();
		assert.equal(await home.page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0);
		await home.dispose();
		const plain = await open({ render: article() });
		await plain.page.waitForTimeout(300);
		assert.ok(!plain.requests.some(url => /embeds/.test(url)), "the embeds module is not downloaded");
		assert.equal(new URL(SITE).host, "theme.test");
		await plain.dispose();
	});
});
