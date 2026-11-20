import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";

// Ghost's own search (Sodo Search, loaded by {{ghost_head}}) opens from any element with
// data-ghost-search and brings its own Cmd/Ctrl+K shortcut: the theme only provides the buttons.
describe("search", () => {
	before(launch);
	after(close);

	for (const [name, viewport] of [
		["phone", { width: 390, height: 800 }],
		["desktop", { width: 1280, height: 800 }],
	]) {
		it(`shows a labelled button that opens Ghost's native search on a ${name}`, async () => {
			const { page, dispose } = await open({ viewport });
			const button = page.locator("[data-ghost-search]:visible");
			assert.equal(await button.count(), 1);
			assert.equal(await button.evaluate(el => el.tagName), "BUTTON");
			assert.equal(await button.getAttribute("aria-label"), "Open search");
			await dispose();
		});
	}

	it("ships no search interface or Content API client of its own", async () => {
		const { page, requests, dispose } = await open();
		await page.locator("[data-ghost-search]:visible").click();
		await page.waitForTimeout(200);
		assert.equal(await page.locator(".m-search, .js-search, [role=dialog]:not([data-mobile-menu])").count(), 0);
		assert.deepEqual(
			requests.filter(url => url.includes("/ghost/api/")),
			[],
		);
		await dispose();
	});
});
