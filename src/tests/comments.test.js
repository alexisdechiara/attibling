// Ghost's native comments on the article page (post.hbs, src/js/article/comments.js): comments-ui (~250 KB
// from jsDelivr) loads only when the reader gets near the comments, or at once when the address or a link
// targets them, from Ghost's own {{comments}} output kept inert in a <template>.
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { article, LONG_HTML } from "./support/article.js";
import { COMMENTS_UI } from "./support/ghost.js";

// What comments-ui 1.6 does when its script runs (umd/comments-ui.min.js): it reads document.currentScript,
// draws in the script's previous sibling when its id is ghost-comments-root (else it creates one), adds a
// frame 400 px high and empty, sizes it to a skeleton (its content box data-loaded="false"), then, the
// comments fetched, to the comments (data-loaded="true"). The fake keeps the dataset it was given.
const FAKE_COMMENTS_UI = `(() => {
	const script = document.currentScript;
	let root = script.previousElementSibling;
	if (!root || root.id !== "ghost-comments-root") {
		root = document.createElement("div");
		root.id = "ghost-comments-root";
		script.before(root);
	}
	const frame = document.createElement("iframe");
	frame.title = "comments-frame";
	frame.setAttribute("style", "width: 100%; height: 400px;");
	frame.srcdoc = '<section data-testid="content-box" data-loaded="false">Comments</section>';
	root.append(frame);
	window.__commentsUi = { dataset: { ...script.dataset }, inRoot: root.parentElement.classList.contains("js-native-comments"), runs: (window.__commentsUi?.runs || 0) + 1 };
	setTimeout(() => frame.setAttribute("style", "width: 100%; height: 150px;"), 300);
	setTimeout(() => {
		frame.contentDocument.querySelector("section").dataset.loaded = "true";
		frame.setAttribute("style", "width: 100%; height: 300px;");
	}, 900);
})();`;

const PHONE = { width: 390, height: 700 };
const LONG = LONG_HTML + LONG_HTML + LONG_HTML;
const uiRequests = requests => requests.filter(url => url === COMMENTS_UI).length;

const openArticle = (options = {}) => {
	const { render = {}, ...rest } = options;
	return open({
		render: article({ html: LONG, ...render }),
		viewport: PHONE,
		commentsUi: { delay: 100, script: FAKE_COMMENTS_UI },
		...rest,
	});
};

const toComments = page =>
	page.evaluate(async () => {
		const section = document.querySelector("[data-comments]");
		for (let y = 0; y < section.offsetTop; y += 500) {
			window.scrollTo(0, y);
			await new Promise(resolve => setTimeout(resolve, 20));
		}
		section.scrollIntoView();
	});

describe("article page: comments", () => {
	before(launch);
	after(close);

	it("does not load comments-ui while the reader is far from the comments", async () => {
		const { page, requests, dispose } = await openArticle();
		const far = await page.evaluate(
			() => document.querySelector("[data-comments]").getBoundingClientRect().top / innerHeight,
		);
		assert.ok(far > 3.5, `the comments start ${far.toFixed(1)} screens down`);
		await page.waitForTimeout(600);
		assert.equal(uiRequests(requests), 0, "comments-ui not requested at load");
		assert.equal(await page.locator("[data-comments]").getAttribute("data-comments"), "waiting");
		await dispose();
	});

	it("loads Ghost's own script tag, unchanged, when the reader gets near the comments", async () => {
		const { page, requests, dispose } = await openArticle();
		await toComments(page);
		assert.equal(await waitFor(() => uiRequests(requests) === 1), true, "comments-ui requested");
		assert.equal(
			await waitFor(() => page.evaluate(() => window.__commentsUi?.runs === 1)),
			true,
			"comments-ui ran once",
		);
		const tags = await page.evaluate(() => {
			const attributes = el => Object.fromEntries([...el.attributes].map(a => [a.name, a.value]));
			const section = document.querySelector("[data-comments]");
			const ghost = section.querySelector("template[data-comments-script]").content.querySelector("script");
			const live = section.querySelector("#ghost-comments-root + script");
			return { ghost: attributes(ghost), live: live && attributes(live) };
		});
		assert.deepEqual(tags.live, tags.ghost, "the script carries every attribute of Ghost's output");
		assert.equal(tags.ghost.src, COMMENTS_UI);
		assert.equal(tags.ghost["data-title"], "Discussion entre abonnés");
		const ui = await page.evaluate(() => window.__commentsUi);
		assert.equal(ui.inRoot, true, "comments-ui draws in the theme's #ghost-comments-root");
		assert.equal(ui.dataset.postId, "post-2");
		assert.equal(await page.locator("#ghost-comments-root").count(), 1, "one root");
		await dispose();
	});

	it("keeps the space and a quiet loading line until the comments are drawn, then shows them", async () => {
		const { page, dispose } = await openArticle({ commentsUi: { delay: 600, script: FAKE_COMMENTS_UI } });
		// The heights the frame is shown at
		await page.evaluate(() => {
			window.__shown = [];
			const section = document.querySelector("[data-comments]");
			new MutationObserver(() => {
				const frame = section.querySelector("iframe");
				if (frame && getComputedStyle(frame).visibility === "visible") window.__shown.push(frame.style.height);
			}).observe(section, { attributes: true, subtree: true, attributeFilter: ["style", "data-comments"] });
		});
		const state = () =>
			page.evaluate(() => {
				const section = document.querySelector("[data-comments]");
				const status = section.querySelector("[data-comments-status]");
				const frame = section.querySelector("iframe");
				return {
					state: section.dataset.comments,
					height: section.querySelector(".article-comments__inner").getBoundingClientRect().height,
					status: !status.hidden && status.getBoundingClientRect().height > 0 ? status.textContent.trim() : null,
					frame: frame ? getComputedStyle(frame).visibility : null,
					next: document.querySelector(".article-related")?.getBoundingClientRect().top + scrollY,
				};
			});
		const waiting = await state();
		assert.equal(waiting.status, "Chargement des commentaires…");
		assert.ok(waiting.height >= 15.5 * 16 - 1, `space kept before loading: ${waiting.height}`);
		await toComments(page);
		assert.equal(
			await waitFor(async () => (await state()).frame === "hidden"),
			true,
			"the empty 400 px frame stays hidden",
		);
		const loading = await state();
		assert.equal(loading.state, "loading");
		assert.equal(loading.next, waiting.next, "nothing below moves while comments-ui starts");
		assert.equal(await waitFor(async () => (await state()).state === "ready"), true);
		const ready = await state();
		assert.equal(ready.status, null, "loading line gone");
		assert.equal(ready.frame, "visible");
		assert.equal(Math.round(ready.height), 300, "the section takes the frame's own height");
		assert.deepEqual(
			[...new Set(await page.evaluate(() => window.__shown))],
			["300px"],
			"never shown empty or as a skeleton",
		);
		await dispose();
	});

	it("loads at once when the address targets the comments (Ghost's e-mails and newsletter)", async () => {
		for (const hash of ["#ghost-comments-6a1f0c2b9e", "#ghost-comments-root", "#ghost-comments"]) {
			const { page, requests, dispose } = await openArticle({ hash });
			assert.equal(await waitFor(() => uiRequests(requests) === 1), true, `${hash}: requested at once`);
			assert.equal(
				await waitFor(() =>
					page.evaluate(() => document.querySelector("[data-comments]").dataset.comments === "ready"),
				),
				true,
			);
			await dispose();
		}
	});

	it("lands on the comments for #ghost-comments-root before comments-ui has run", async () => {
		const { page, dispose } = await openArticle({
			hash: "#ghost-comments-root",
			commentsUi: { delay: 2000, script: FAKE_COMMENTS_UI },
		});
		const top = await page.evaluate(() => document.getElementById("ghost-comments-root").getBoundingClientRect().top);
		assert.ok(top >= 0 && top < PHONE.height / 2, `root at ${top}`);
		await dispose();
	});

	it("loads at once when the reader follows a link to the comments", async () => {
		const { page, requests, dispose } = await openArticle();
		await page.evaluate(() => {
			const link = document.createElement("a");
			link.href = "#ghost-comments";
			link.textContent = "3 commentaires";
			link.className = "to-comments";
			document.querySelector("[data-article-content]").prepend(link);
		});
		await page.waitForTimeout(300);
		assert.equal(uiRequests(requests), 0);
		await page.locator(".to-comments").click();
		assert.equal(await waitFor(() => uiRequests(requests) === 1), true, "requested on click");
		await dispose();
	});

	it("says so when comments-ui cannot load", async () => {
		const { page, dispose } = await openArticle({ hash: "#ghost-comments-root", commentsUi: "fail" });
		assert.equal(
			await waitFor(() => page.evaluate(() => document.querySelector("[data-comments]").dataset.comments === "error")),
			true,
		);
		const text = await page.locator("[data-comments-status]").textContent();
		assert.match(text, /n’ont pas pu être chargés/);
		assert.equal(await page.locator("[data-comments-status]").isVisible(), true);
		await dispose();
	});

	it("keeps the room of Ghost's form or of its invitation, by who reads", async () => {
		const cases = [
			[{}, "invite"],
			[{ member: true }, "form"],
			[{ member: true, comments: "paid" }, "invite"],
			[{ member: true, comments: "paid", paid: true }, "form"],
		];
		for (const [render, space] of cases) {
			const { page, dispose } = await openArticle({ render });
			assert.equal(
				await page.locator("[data-comments]").getAttribute("data-comments-space"),
				space,
				JSON.stringify(render),
			);
			await dispose();
		}
	});

	it("has no comments section when Ghost has comments turned off", async () => {
		const { page, requests, dispose } = await openArticle({ render: { comments: "off" } });
		assert.equal(await page.locator(".article-comments").count(), 0);
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(500);
		assert.equal(uiRequests(requests), 0);
		await dispose();
	});

	it("tells readers without JavaScript that comments need it", async () => {
		const { page, requests, dispose } = await openArticle({ javaScriptEnabled: false });
		const visible = await page
			.locator(".article-comments__status")
			.evaluateAll(els => els.filter(el => el.getBoundingClientRect().height > 0).map(el => el.textContent.trim()));
		assert.deepEqual(visible, ["Les commentaires ont besoin de JavaScript : activez-le pour les lire et en écrire."]);
		assert.equal(uiRequests(requests), 0);
		await dispose();
	});

	it("reloads the comments frame in the new mode when the theme changes", async () => {
		const { page, dispose } = await openArticle({ hash: "#ghost-comments-root" });
		assert.equal(
			await waitFor(() => page.evaluate(() => document.querySelector("[data-comments]").dataset.comments === "ready")),
			true,
		);
		await page.evaluate(() => {
			const frame = document.querySelector(".js-native-comments > div > iframe");
			frame.contentWindow.__before = true;
		});
		await page.locator(".site-header .js-switch-theme").dispatchEvent("click");
		assert.equal(
			await waitFor(() =>
				page.evaluate(
					() => document.querySelector(".js-native-comments > div > iframe").contentWindow.__before !== true,
				),
			),
			true,
			"frame reloaded",
		);
		await dispose();
	});
});
