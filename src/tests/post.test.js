const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch, close, open, waitFor } = require("./support/harness");

describe("post page", () => {
	before(launch);
	after(close);

	it("makes content images zoomable, except linked images and cards", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const zoomable = await page.$$eval(".js-post-content img", imgs =>
			Object.fromEntries(imgs.map(img => [img.alt, img.classList.contains("js-zoomable")]))
		);
		assert.deepEqual(zoomable, { plain: true, linked: false, bookmark: false });
		await dispose();
	});

	it("zooms a zoomable image on click", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		await page.locator(".js-post-content img.plain-image").click();
		assert.equal(await waitFor(() => page.locator(".medium-zoom-image--opened").first().isVisible()), true);
		await dispose();
	});

	it("scrolls back to the top with the scroll-to-top button", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		await page.evaluate(() => window.scrollTo(0, 2000));
		await waitFor(() => page.evaluate(() => window.scrollY === 2000));

		await page.locator(".js-scrolltop").click();
		assert.equal(await waitFor(() => page.evaluate(() => window.scrollY === 0), { timeout: 3000 }), true);

		await dispose();
	});

	it("jumps to the top instantly when reduced motion is preferred", async () => {
		const { page, dispose } = await open({ fixture: "post.html", reducedMotion: "reduce" });
		await page.evaluate(() => window.scrollTo(0, 2000));
		await waitFor(() => page.evaluate(() => window.scrollY === 2000));

		await page.locator(".js-scrolltop").click();
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => window.scrollY), 0);

		await dispose();
	});

	it("builds the table of contents from the post headings", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const links = await page.$$eval(".toc a", nodes => nodes.map(a => [a.getAttribute("href"), a.textContent]));
		assert.deepEqual(links, [
			["#first-heading", "First heading"],
			["#second-heading", "Second heading"],
			["#third-heading", "Third heading"],
			["#fourth-heading", "Fourth heading"],
		]);
		await dispose();
	});

	it("reloads native comments added after load when the theme changes", async () => {
		const { page, requests, dispose } = await open({
			fixture: "post.html",
			comments: '<div class="m-comments"><div class="l-wrapper in-comments js-native-comments"></div></div>',
		});
		const commentLoads = () => requests.filter(url => url.endsWith("/fixtures/comments.html")).length;

		await page.evaluate(() => {
			const holder = document.createElement("div");
			const iframe = document.createElement("iframe");
			iframe.src = "/src/tests/fixtures/comments.html";
			holder.appendChild(iframe);
			document.querySelector(".js-native-comments").appendChild(holder);
		});
		assert.equal(await waitFor(() => commentLoads() === 1), true);

		await page.locator(".js-switch-theme").dispatchEvent("click");
		assert.equal(await waitFor(() => commentLoads() === 2), true, "comments iframe reloaded");

		await dispose();
	});

	it("does not fail on theme change when the comments frame is cross-origin", async () => {
		const { page, dispose } = await open({
			fixture: "post.html",
			comments:
				'<div class="m-comments"><div class="l-wrapper in-comments js-native-comments"><div><iframe src="http://blog.test/comments/"></iframe></div></div></div>',
		});
		await page.locator(".js-switch-theme").dispatchEvent("click");
		await page.waitForTimeout(100);
		assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
		await dispose();
	});
});
