import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor, settle } from "./support/harness.js";

// Ghost adds its announcement bar through {{ghost_head}}: an #announcement-bar-root element at the
// start of <body>, which its script fills (and empties when the reader dismisses the bar).
const bar = height => `<div class="gh-announcement-bar" style="height: ${height}px">Announcement</div>`;
const root = content => `<div id="announcement-bar-root">${content}</div>`;

const layout = page =>
	page.evaluate(() => {
		const header = document.querySelector(".js-header");
		const nav = document.querySelector(".m-nav").getBoundingClientRect();
		return {
			inHeader: header.firstElementChild?.id === "announcement-bar-root",
			height: getComputedStyle(document.documentElement).getPropertyValue("--announcement-bar-height").trim(),
			bodyOffset: parseFloat(getComputedStyle(document.body).paddingTop),
			navTop: Math.round(nav.top),
		};
	});

describe("announcement bar", () => {
	before(launch);
	after(close);

	it("sits at the top of the header and pushes the page down by its height", async () => {
		const { page, dispose } = await open({ bodyStart: root(bar(48)) });
		await settle(page);
		assert.deepEqual(await layout(page), { inHeader: true, height: "48px", bodyOffset: 48, navTop: 48 + 15 });
		const barTop = await page.evaluate(
			() => document.querySelector(".gh-announcement-bar").getBoundingClientRect().top,
		);
		assert.equal(barTop, 0);
		await dispose();
	});

	it("follows the bar when Ghost fills or empties it later", async () => {
		const { page, dispose } = await open({ bodyStart: root("") });
		await settle(page);
		assert.deepEqual(await layout(page), { inHeader: true, height: "0px", bodyOffset: 0, navTop: 15 });

		await page.evaluate(html => (document.getElementById("announcement-bar-root").innerHTML = html), bar(40));
		assert.equal(await waitFor(async () => (await layout(page)).height === "40px"), true);
		await page.waitForTimeout(300);
		assert.deepEqual(await layout(page), { inHeader: true, height: "40px", bodyOffset: 40, navTop: 40 + 15 });

		await page.evaluate(() => document.getElementById("announcement-bar-root").replaceChildren());
		assert.equal(await waitFor(async () => (await layout(page)).height === "0px"), true);
		await dispose();
	});

	it("keeps the submenu below the menu bar", async () => {
		const { page, dispose } = await open({ bodyStart: root(bar(40)) });
		await settle(page);
		await page.locator(".js-toggle-submenu").click();
		await page.waitForTimeout(400);
		const top = await page.evaluate(() =>
			Math.round(document.querySelector(".js-submenu").getBoundingClientRect().top),
		);
		assert.equal(top, 40 + 60);
		await dispose();
	});

	it("leaves the page alone when there is no announcement bar", async () => {
		const { page, dispose } = await open();
		await settle(page);
		const state = await layout(page);
		assert.deepEqual(
			{ ...state, height: state.height || "0px" },
			{ inHeader: false, height: "0px", bodyOffset: 0, navTop: 15 },
		);
		await dispose();
	});
});
