import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";

describe("icons", () => {
	before(launch);
	after(close);

	it("render as inline SVG in the colour and font size of their control", async () => {
		const { page, dispose } = await open({ fixture: "post.html" });
		const icon = await page.evaluate(() => {
			const button = document.querySelector(".js-scrolltop");
			const svg = button.querySelector("svg.m-icon-svg");
			const box = () => svg.getBoundingClientRect();
			const fill = () => getComputedStyle(svg.querySelector("path")).fill;
			const before = { width: box().width, height: box().height, fill: fill(), color: getComputedStyle(button).color };
			button.style.transition = "none";
			button.style.setProperty("color", "rgb(255, 0, 0)", "important");
			button.style.fontSize = "40px";
			return {
				tag: svg.tagName.toLowerCase(),
				ariaHidden: svg.getAttribute("aria-hidden"),
				focusable: svg.getAttribute("focusable"),
				label: button.getAttribute("aria-label"),
				before,
				after: { height: box().height, fill: fill() },
			};
		});
		assert.equal(icon.tag, "svg");
		assert.equal(icon.ariaHidden, "true");
		assert.equal(icon.focusable, "false");
		assert.ok(icon.label, "the control keeps its accessible name");
		assert.ok(icon.before.width > 0 && icon.before.height > 0, "non-zero size");
		assert.equal(icon.before.fill, icon.before.color, "fill is currentColor");
		assert.equal(icon.after.fill, "rgb(255, 0, 0)");
		assert.equal(icon.after.height, 40, "sized in em");
		await dispose();
	});
});
