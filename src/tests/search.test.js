const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch, close, open, waitFor, GHOST_HOST } = require("./support/harness");

const isOpened = page => page.evaluate(() => document.querySelector(".js-search").classList.contains("opened"));
const resultsShown = page => page.locator(".js-search-results").isVisible();
// Opens the search dialog and waits until its input can be typed in.
const openSearch = async page => {
	await page.locator(".m-nav__right .js-open-search").click();
	await page.locator(".js-input-search").click();
};
const results = page =>
	page.$$eval(".js-search-results .m-result", nodes =>
		nodes.map(node => ({
			href: node.querySelector("a.m-result__link").getAttribute("href"),
			title: node.querySelector(".m-result__title").textContent,
			date: node.querySelector(".m-result__date").textContent,
		}))
	);

describe("search", () => {
	before(launch);
	after(close);

	it("opens, closes with the close button and with Escape", async () => {
		const { page, dispose } = await open();

		await page.locator(".m-nav__right .js-open-search").click();
		assert.equal(await isOpened(page), true);
		assert.ok(await page.evaluate(() => document.body.classList.contains("no-scroll-y")));

		await page.locator(".js-close-search").click();
		assert.equal(await isOpened(page), false);
		assert.ok(!(await page.evaluate(() => document.body.classList.contains("no-scroll-y"))));

		await page.locator(".m-nav__right .js-open-search").click();
		assert.equal(await isOpened(page), true);
		await page.keyboard.press("Escape");
		assert.equal(await isOpened(page), false);

		await dispose();
	});

	it("focuses the search input after opening", async () => {
		const { page, dispose } = await open();
		await page.locator(".m-nav__right .js-open-search").click();
		assert.equal(
			await waitFor(() => page.evaluate(() => document.activeElement.classList.contains("js-input-search"))),
			true
		);
		await dispose();
	});

	it("renders matching posts from the Content API", async () => {
		const { page, dispose } = await open();
		await openSearch(page);
		await page.locator(".js-input-search").pressSequentially("Markdown");

		assert.equal(await waitFor(async () => (await results(page)).length === 1), true);
		assert.deepEqual(await results(page), [
			{ href: `${GHOST_HOST}/markdown/`, title: "Writing in Markdown", date: "February 20, 2023" },
		]);
		assert.equal(await resultsShown(page), true);
		assert.equal(await page.locator(".js-no-results").isVisible(), false);

		await dispose();
	});

	it("shows the no-results message when nothing matches, and nothing when emptied", async () => {
		const { page, dispose } = await open();
		await openSearch(page);
		const input = page.locator(".js-input-search");

		await input.pressSequentially("Markdown");
		assert.equal(await waitFor(async () => (await results(page)).length === 1), true);

		await input.pressSequentially("zzzzqqqq");
		assert.equal(await waitFor(() => page.locator(".js-no-results").isVisible()), true);
		assert.deepEqual(await results(page), []);
		assert.equal(await resultsShown(page), false);

		await input.fill("");
		await input.press("Backspace");
		assert.equal(await page.locator(".js-no-results").isVisible(), false);
		assert.equal(await resultsShown(page), false);

		await dispose();
	});

	it("renders post titles and urls as text, never as markup", async () => {
		const title = '<img src="x" class="injected" onerror="window.__injected = true">Markup post';
		const url = `${GHOST_HOST}/markup/"><b class="injected">x</b>`;
		const { page, dispose } = await open({
			posts: [{ id: "9", title, url, published_at: "2023-03-01T10:00:00.000Z", custom_excerpt: "", tags: [] }],
		});
		await openSearch(page);
		await page.locator(".js-input-search").pressSequentially("Markup post");

		assert.equal(await waitFor(async () => (await results(page)).length === 1), true);
		assert.deepEqual(await results(page), [{ href: url, title, date: "March 1, 2023" }]);
		assert.equal(await page.locator(".js-search-results .injected").count(), 0);
		assert.equal(await page.locator(".js-search-results img, .js-search-results b").count(), 0);
		assert.equal(await page.evaluate(() => window.__injected), undefined);

		await dispose();
	});

	it("fetches posts only once, the first time the search is opened", async () => {
		const { page, apiRequests, dispose } = await open();
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(200);
		assert.equal(apiRequests.length, 0, "no Content API request before the search is opened");

		await openSearch(page);
		assert.equal(await waitFor(() => apiRequests.length === 1), true);

		await page.keyboard.press("Escape");
		await openSearch(page);
		await page.keyboard.press("Escape");
		await openSearch(page);
		await page.waitForLoadState("networkidle");
		assert.equal(apiRequests.length, 1, "exactly one Content API request");

		await dispose();
	});

	it("shows results for what was typed before the posts finished loading", async () => {
		const { page, release, dispose } = await open({ holdPosts: true });
		await openSearch(page);
		await page.locator(".js-input-search").pressSequentially("Markdown");
		await page.waitForTimeout(100);
		assert.deepEqual(await results(page), []);

		release();
		assert.equal(await waitFor(async () => (await results(page)).length === 1), true);
		assert.equal((await results(page))[0].title, "Writing in Markdown");

		await dispose();
	});

	it("hides the search button when no search API key is defined", async () => {
		const { page, dispose } = await open({ apiKey: null });
		const visibility = await page.$$eval(".js-open-search", nodes => nodes.map(n => getComputedStyle(n).visibility));
		assert.deepEqual(visibility, ["hidden", "hidden"]);
		assert.equal(await page.locator(".js-search").count(), 0);
		assert.equal(await page.locator(".js-close-search").count(), 0);
		await dispose();
	});

	it("hides the search button when native search is enabled", async () => {
		const { page, apiRequests, dispose } = await open({ nativeSearch: true });
		const visibility = await page.$$eval(".js-open-search", nodes => nodes.map(n => getComputedStyle(n).visibility));
		assert.deepEqual(visibility, ["hidden", "hidden"]);
		assert.equal(await page.locator(".js-search").count(), 0);
		assert.equal(apiRequests.length, 0);
		await dispose();
	});
});
