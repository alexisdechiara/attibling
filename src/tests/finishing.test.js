import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { launch, close, open, REPO_ROOT } from "./support/harness.js";
import { article } from "./support/article.js";
import { home } from "./support/pages.js";

const openPanel = async page => {
	await page.locator("[data-reading-button]").click();
	await page.waitForFunction(() => document.querySelector("[data-reading-settings]").matches(":popover-open"));
};

// The visible swatch of the « Thème » list and the visible name of the chosen theme: one line
const themeLine = page =>
	page.evaluate(() => {
		const select = document.getElementById("reading-theme");
		const visible = element =>
			element && getComputedStyle(element).display !== "none" && element.getClientRects().length;
		const swatch = [...document.querySelectorAll(".reading-select-wrap .reading-swatch")].find(visible);
		const box = select.getBoundingClientRect();
		const middle = rect => rect.top + rect.height / 2;
		const name = select.querySelector("selectedcontent .reading-option__name");
		return {
			swatch: swatch ? Math.round(middle(swatch.getBoundingClientRect()) - middle(box)) : null,
			name: name && visible(name) ? Math.round(middle(name.getBoundingClientRect()) - middle(box)) : "plain",
			height: Math.round(box.height),
		};
	});

describe("finishing: reading settings « Thème » list", () => {
	before(launch);
	after(close);

	it("shows the swatch and the theme's name on one line (customizable select)", async () => {
		const { page, dispose } = await open({ render: article({ member: true }), viewport: { width: 1440, height: 900 } });
		await openPanel(page);
		const line = await themeLine(page);
		assert.equal(line.height, 44);
		assert.ok(Math.abs(line.swatch) <= 2 && Math.abs(line.name) <= 2, JSON.stringify(line));
		await dispose();
	});

	it("draws a swatch on the plain select too, following the chosen theme", async () => {
		const { page, dispose } = await open({ render: article({ member: true }), viewport: { width: 1440, height: 900 } });
		// A browser without the customizable select: the @supports block does not apply
		await page.route("**/assets/css/post.css*", async route => {
			const css = fs
				.readFileSync(path.join(REPO_ROOT, "assets/css/post.css"), "utf8")
				.replaceAll("@supports (appearance:base-select)", "@supports (x:y)");
			await route.fulfill({ contentType: "text/css", body: css });
		});
		await page.reload({ waitUntil: "load" });
		await openPanel(page);
		const line = await themeLine(page);
		assert.equal(line.name, "plain");
		assert.ok(
			line.swatch !== null && Math.abs(line.swatch) <= 2,
			`swatch centred on the line: ${JSON.stringify(line)}`,
		);
		const accent = () =>
			page.evaluate(
				() => getComputedStyle(document.querySelector(".reading-select__swatch"), "::after").backgroundColor,
			);
		const before = await accent();
		await page.selectOption("#reading-theme", "desert");
		assert.notEqual(await accent(), before, "the swatch follows the chosen theme");
		await dispose();
	});
});

describe("finishing: bookmark icons", () => {
	before(launch);
	after(close);

	it("keeps the icon of the article header's labelled button, hides a tile's at rest", async () => {
		const post = await open({ render: article({ member: true }), viewport: { width: 1440, height: 900 } });
		const labelled = await post.page.evaluate(() => {
			const icon = document.querySelector(".article-header__bookmark .bookmark__icon");
			return icon && getComputedStyle(icon).opacity;
		});
		assert.equal(labelled, "1");
		await post.dispose();

		const index = await open({ render: home({ member: true }), viewport: { width: 1440, height: 900 } });
		const tile = await index.page.evaluate(
			() => getComputedStyle(document.querySelector("[data-post-tile] .bookmark .bookmark__icon")).opacity,
		);
		assert.equal(tile, "0", "a tile's bookmark appears on hover or focus only");
		await index.dispose();
	});
});
