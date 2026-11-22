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
		// Hardening: no plugin content, no <base> pointing elsewhere
		assert.match(csp, /; object-src 'none'; base-uri 'self'$/);
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

	it("load an X post through X's own frame, never X's script in the site's frame, at the height X gives", async () => {
		const { page, requests, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		// X's frame, as it answers (it says its height in a message to the page that framed it)
		await page.route("https://platform.twitter.com/**", route =>
			route.fulfill({
				contentType: "text/html",
				body: `<body style="margin:0"><div style="height:480px">post</div><script>parent.postMessage(JSON.stringify({ "twttr.embed": { method: "twttr.private.resize", params: [{ width: 550, height: 480 }] } }), "*")</script></body>`,
			}),
		);
		await page.locator('[data-provider="x"] [data-embed-load]').click();
		const frame = page.locator("iframe[data-embed-frame]");
		await frame.waitFor();
		const inside = await waitFor(() =>
			frame.evaluate(f => {
				const doc = f.contentDocument;
				const player = doc?.querySelector("iframe");
				return (
					player && {
						src: player.src,
						scripts: [...doc.querySelectorAll("script[src]")].length,
						quote: !!doc.querySelector("blockquote"),
					}
				);
			}),
		);
		assert.deepEqual(inside, {
			src: "https://platform.twitter.com/embed/Tweet.html?id=2021734851636797553&dnt=true&theme=light&lang=en",
			scripts: 0,
			quote: false,
		});
		assert.ok(!requests.some(url => url.includes("widgets.js")), "X's script is never requested");
		assert.ok(
			await waitFor(async () => (await frame.evaluate(f => f.offsetHeight)) >= 480),
			"the frame takes X's height",
		);
		await dispose();
	});

	it("give a generic title (« YouTube video ») a title in the page's language", async () => {
		const card = title =>
			`<figure class="kg-card kg-embed-card"><iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" title="${title}"></iframe></figure>`;
		const vimeo =
			'<figure class="kg-card kg-embed-card"><iframe width="640" height="360" src="https://player.vimeo.com/video/1" title="vimeo video player"></iframe></figure>';
		const { page, dispose } = await open({
			render: facadeOnly({ html: card("YouTube video") + card("YouTube") + vimeo + card("Une vraie vidéo") }),
		});
		const shown = await page.$$eval("[data-embed-facade]", list =>
			list.map(f => [f.querySelector("[data-embed-title]")?.textContent, f.getAttribute("aria-label")]),
		);
		assert.deepEqual(shown, [
			["Vidéo YouTube", "Contenu de YouTube — Vidéo YouTube"],
			["Vidéo YouTube", "Contenu de YouTube — Vidéo YouTube"],
			["Vidéo Vimeo", "Contenu de Vimeo — Vidéo Vimeo"],
			["Une vraie vidéo", "Contenu de YouTube — Une vraie vidéo"],
		]);
		await page.locator("[data-embed-load]").first().click();
		assert.equal(
			await page.locator("iframe[data-embed-frame]").getAttribute("title"),
			"Contenu de YouTube — Vidéo YouTube",
		);
		await dispose();
	});

	it("print a line with what the embed is and its address, before it, shown or not", async () => {
		const { page, dispose } = await open({ render: facadeOnly({ html: HTML }) });
		const lines = () =>
			page.$$eval(".embed-print", list =>
				list.map(p => (p.getClientRects().length ? p.textContent.replace(/\s+/g, " ").trim() : null)),
			);
		await page.locator('[data-provider="youtube"] [data-embed-load]').click();
		await page.locator("iframe[data-embed-frame]").waitFor();
		assert.deepEqual(await lines(), [null, null, null], "nothing on screen");
		await page.emulateMedia({ media: "print" });
		assert.deepEqual(await lines(), [
			"Contenu de YouTube — Un revenu inconditionnel ? (https://www.youtube.com/watch?v=_jGbRsxHi7Q&t=12)",
			"Contenu de X (https://twitter.com/quelqu_un/status/2021734851636797553?ref_src=twsrc%5Etfw)",
			"Contenu de embed.example.org (https://embed.example.org/widget?id=1)",
		]);
		// No address printed twice (the print sheet adds it after other external links)
		const after = await page.$eval(".embed-print a", a => getComputedStyle(a, "::after").content);
		assert.equal(after, "none");
		await dispose();
	});

	it("listen for the frames' messages once, however many embeds are loaded", async () => {
		const { page, dispose } = await open({
			render: facadeOnly({ html: HTML }),
			initScript: () => {
				window.__messageListeners = 0;
				const add = window.addEventListener;
				window.addEventListener = function (type, ...rest) {
					if (type === "message") window.__messageListeners++;
					return add.call(this, type, ...rest);
				};
			},
		});
		await page.route("https://platform.twitter.com/**", route =>
			route.fulfill({ contentType: "text/html", body: "<body>x</body>" }),
		);
		const listeners = () => page.evaluate(() => window.__messageListeners);
		const before = await listeners();
		for (const provider of ["youtube", "x"]) {
			await page.locator(`[data-provider="${provider}"] [data-embed-load]`).click();
			await page.locator("iframe[data-embed-frame]").last().waitFor();
		}
		assert.equal(await page.locator("iframe[data-embed-frame]").count(), 2);
		assert.ok((await listeners()) - before <= 0, "no listener added per embed");
		await dispose();
	});

	it("never let an embed push the article down: only a finite height, at most 4000 px", async () => {
		// A scripted embed (its script runs in the frame page, next to the relay) and an X frame, each
		// claiming a huge height, as a number and as a string
		const SCRIPTED =
			'<figure class="kg-card kg-embed-card"><blockquote class="other-post">A post</blockquote><script async src="https://embed.example.org/embed.js"></script></figure>';
		const { page, dispose } = await open({ render: facadeOnly({ html: SCRIPTED + X_CARD }) });
		await page.route("https://embed.example.org/**", route =>
			route.fulfill({
				contentType: "text/javascript",
				body: `parent.postMessage({ attiblingEmbed: { height: "1e6" } }, "*");
					document.body.append(Object.assign(document.createElement("div"), { style: "height:10000000px" }));
					parent.postMessage({ attiblingEmbed: { height: 1e7 } }, "*");
					parent.postMessage({ attiblingEmbed: { height: Infinity } }, "*");`,
			}),
		);
		await page.route("https://platform.twitter.com/**", route =>
			route.fulfill({
				contentType: "text/html",
				body: `<body style="margin:0"><script>
					const say = h => parent.postMessage(JSON.stringify({ "twttr.embed": { method: "twttr.private.resize", params: [{ width: 550, height: h }] } }), "*");
					say("1e6"); say(1e7);
				</script></body>`,
			}),
		);
		await page.locator('[data-embed-facade]:not([data-provider="x"]) [data-embed-load]').first().click();
		await page.locator('[data-provider="x"] [data-embed-load]').click();
		const frames = page.locator("iframe[data-embed-frame]");
		await waitFor(() => frames.count().then(n => n === 2));
		await page.waitForTimeout(800);
		const heights = await frames.evaluateAll(list => list.map(f => f.offsetHeight));
		for (const height of heights) assert.ok(height > 0 && height <= 4000, `frame height ${height}`);
		// The X player in the frame page is bounded too (its own message, "1e6" refused)
		const inner = await frames.nth(1).evaluate(f => f.contentDocument?.querySelector("iframe")?.style.height);
		assert.equal(inner, "4000px");
		assert.ok((await page.evaluate(() => document.documentElement.scrollHeight)) < 20000, "the page keeps its length");
		await dispose();
	});

	it("run any other scripted embed in a sandbox, cut off from the site, its markup and script kept", async () => {
		const SCRIPTED =
			'<figure class="kg-card kg-embed-card"><blockquote class="other-post">A post</blockquote><script async src="https://embed.example.org/embed.js"></script></figure>';
		const { page, dispose } = await open({ render: facadeOnly({ html: SCRIPTED }) });
		// A signed-in member (Ghost's session cookie) and the members API, which answers only with it
		await page.context().addCookies([{ name: "ghost-members-ssr", value: "1", url: SITE, sameSite: "Lax" }]);
		await page.route(`${SITE}/members/api/member/`, route =>
			route.fulfill(
				/ghost-members-ssr/.test(route.request().headers().cookie || "")
					? { status: 200, contentType: "application/json", body: '{"email":"member@example.org"}' }
					: { status: 401, body: "" },
			),
		);
		// The provider's script tries to reach the site: its pages, storage, cookies, the member's account
		await page.route("https://embed.example.org/**", route =>
			route.fulfill({
				contentType: "text/javascript",
				body: `(async () => {
					const tries = {};
					const attempt = async (name, fn) => { try { tries[name] = String(await fn()); } catch { tries[name] = "blocked"; } };
					await attempt("parent", () => parent.document.title);
					await attempt("top", () => top.location.href);
					await attempt("consent", () => parent.attiblingConsent.set({ analytics: true, embeds: true, other: true }));
					await attempt("parentStorage", () => parent.localStorage.getItem("attibling-consent"));
					await attempt("storage", () => localStorage.getItem("attibling-saved"));
					await attempt("cookie", () => document.cookie);
					await attempt("member", () => fetch("/members/api/member/", { credentials: "include" }).then(r => r.status));
					document.body.dataset.tries = JSON.stringify(tries);
					document.body.append(Object.assign(document.createElement("div"), { style: "height:300px" }));
				})();`,
			}),
		);
		await page.locator("[data-embed-load]").click();
		const frame = page.locator("iframe[data-embed-frame]");
		await frame.waitFor();
		assert.match(await frame.getAttribute("sandbox"), /allow-scripts/);
		assert.doesNotMatch(await frame.getAttribute("sandbox"), /allow-same-origin/);
		const inner = page.frames().find(f => f.url().includes("/assets/html/embed.html"));
		const tries = await waitFor(() => inner.evaluate(() => document.body.dataset.tries));
		const { member, ...others } = JSON.parse(tries);
		assert.deepEqual(others, {
			parent: "blocked",
			top: "blocked",
			consent: "blocked",
			parentStorage: "blocked",
			storage: "blocked",
			cookie: "blocked",
		});
		assert.equal(await page.evaluate(() => localStorage.getItem("attibling-consent")), null, "no consent written");
		assert.notEqual(member, "200", "the members API does not answer the provider's script as the member");
		assert.equal(await inner.evaluate(() => !!document.querySelector("blockquote.other-post")), true);
		assert.ok(
			await waitFor(async () => (await frame.evaluate(f => f.offsetHeight)) >= 300),
			"the frame takes its height",
		);
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

	it("link « Voir sur SoundCloud » to a SoundCloud web address only", async () => {
		const frame = url =>
			`<figure class="kg-card kg-embed-card"><iframe width="100%" height="166" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe></figure>`;
		const html =
			frame("https://soundcloud.com/artist/track") + frame("javascript:alert(1)") + frame("https://evil.example/");
		const { page, dispose } = await open({ render: facadeOnly({ html }) });
		await page.locator("[data-embed-facade]").first().waitFor();
		assert.deepEqual(await page.$$eval("[data-embed-open]", links => links.map(a => a.getAttribute("href"))), [
			"https://soundcloud.com/artist/track",
			"https://soundcloud.com/",
			"https://soundcloud.com/",
		]);
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
