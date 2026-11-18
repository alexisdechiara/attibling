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
});
