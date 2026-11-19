import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";
import { template } from "./support/pages.js";

// Ghost adds its announcement bar through {{ghost_head}}: an #announcement-bar-root element at the
// start of <body>, which its script fills (and empties when the reader dismisses the bar).
const bar = height => `<div class="gh-announcement-bar" style="height: ${height}px">Announcement</div>`;
const root = content => `<div id="announcement-bar-root">${content}</div>`;

const layout = page =>
	page.evaluate(() => {
		const header = document.getElementById("site-header");
		return {
			beforeHeader: header.previousElementSibling?.id === "announcement-bar-root",
			afterSkipLink: document.querySelector(".skip-link").nextElementSibling?.id === "announcement-bar-root",
			headerTop: Math.round(header.getBoundingClientRect().top),
		};
	});

describe("announcement bar", () => {
	before(launch);
	after(close);

	it("sits above the header, after the skip link, and scrolls away while the header sticks", async () => {
		const { page, dispose } = await open({ render: template("tag"), bodyStart: root(bar(48)) });
		assert.deepEqual(await layout(page), { beforeHeader: true, afterSkipLink: true, headerTop: 48 });
		await page.evaluate(() => window.scrollTo(0, 600));
		assert.equal(await waitFor(async () => (await layout(page)).headerTop === 0), true);
		await dispose();
	});

	it("follows the bar when Ghost fills it later", async () => {
		const { page, dispose } = await open({ render: template("tag"), bodyStart: root("") });
		assert.equal((await layout(page)).headerTop, 0);
		await page.evaluate(html => (document.getElementById("announcement-bar-root").innerHTML = html), bar(40));
		assert.equal(await waitFor(async () => (await layout(page)).headerTop === 40), true);
		await dispose();
	});

	it("leaves the page alone when there is no announcement bar", async () => {
		const { page, dispose } = await open({ render: template("tag") });
		assert.equal((await layout(page)).headerTop, 0);
		await dispose();
	});
});
