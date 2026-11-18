import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";

// Computed font-family of each element, before and after setting Ghost's custom font variables on :root
const families = (page, selectors) =>
	page.evaluate(selectors => {
		const read = () =>
			Object.fromEntries(selectors.map(s => [s, getComputedStyle(document.querySelector(s)).fontFamily]));
		const theme = read();
		document.documentElement.style.setProperty("--gh-font-body", '"Body Test Font", serif');
		document.documentElement.style.setProperty("--gh-font-heading", '"Heading Test Font", monospace');
		return { theme, custom: read() };
	}, selectors);

describe("Ghost custom fonts", () => {
	before(launch);
	after(close);

	it("use --gh-font-body and --gh-font-heading when Ghost sets them, the theme fonts otherwise", async () => {
		const post = await open({ fixture: "post.html" });
		const p = await families(post.page, [".post-content p", "#first-heading"]);
		assert.match(p.theme[".post-content p"], /^"Noto Sans"/);
		assert.match(p.theme["#first-heading"], /^Manrope/);
		assert.equal(p.custom[".post-content p"], '"Body Test Font", serif');
		assert.equal(p.custom["#first-heading"], '"Heading Test Font", monospace');
		await post.dispose();

		const home = await open();
		const h = await families(home.page, [".m-featured-article__title", ".m-featured-article__timestamp"]);
		assert.match(h.theme[".m-featured-article__title"], /^"Noto Sans"/, "headings inherit the body font by default");
		assert.equal(h.custom[".m-featured-article__title"], '"Heading Test Font", monospace');
		assert.equal(h.custom[".m-featured-article__timestamp"], '"Body Test Font", serif');
		await home.dispose();
	});
});
