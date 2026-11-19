import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open } from "./support/harness.js";
import { home } from "./support/pages.js";

// The focused element's box, clipping, colours, and the contrast of its focus ring with the page background
const focusState = page =>
	page.evaluate(() => {
		const el = document.activeElement;
		const cs = getComputedStyle(el);
		const box = el.getBoundingClientRect();
		// A canvas resolves any CSS colour syntax (oklch() included) to sRGB
		const rgb = color => {
			const ctx = document.createElement("canvas").getContext("2d");
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
		};
		const lum = c =>
			c
				.map(v => v / 255)
				.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
				.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
		const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
		const page = rgb(getComputedStyle(document.body).backgroundColor);
		return {
			className: el.className,
			width: box.width,
			height: box.height,
			top: box.top,
			clipPath: cs.clipPath,
			outline: cs.outlineStyle,
			ringContrast: ratio(rgb(cs.outlineColor), page),
			textContrast: ratio(rgb(cs.color), rgb(cs.backgroundColor)),
		};
	});

describe("accessibility", () => {
	before(launch);
	after(close);

	for (const colorScheme of ["light", "dark"]) {
		it(`shows the skip link on keyboard focus, with a visible focus ring (${colorScheme})`, async () => {
			const { page, dispose } = await open({ colorScheme });
			const hidden = await page.locator(".skip-link").boundingBox();
			assert.ok(hidden.width <= 1 && hidden.height <= 1, "visually hidden until focused");

			await page.keyboard.press("Tab");
			const focused = await focusState(page);
			assert.match(focused.className, /skip-link/);
			assert.ok(focused.width > 50 && focused.height > 20, `visible box ${focused.width}x${focused.height}`);
			assert.ok(focused.top >= 0, "inside the viewport");
			assert.equal(focused.clipPath, "none");
			assert.ok(focused.textContrast >= 4.5, `text contrast ${focused.textContrast.toFixed(2)}`);
			assert.equal(focused.outline, "solid");
			assert.ok(focused.ringContrast >= 3, `focus ring contrast ${focused.ringContrast.toFixed(2)}`);

			await page.keyboard.press("Enter");
			assert.equal(await page.evaluate(() => location.hash), "#main");
			await dispose();
		});
	}

	// Every control reached with Tab shows a solid ring of at least 2px, contrasting 3:1 with what is
	// behind it (the page, or the dark media colour for the controls drawn over images, which also get
	// a dark halo around their white ring).
	for (const colorScheme of ["light", "dark"]) {
		it(`shows a visible focus ring on the main controls (${colorScheme})`, async () => {
			const { page, dispose } = await open({
				render: home({ member: true }),
				colorScheme,
				viewport: { width: 1440, height: 900 },
				storage: {
					"attibling-saved": JSON.stringify([{ url: "/overwatch-renaissance/", title: "Overwatch", savedAt: 1 }]),
				},
			});
			const seen = [];
			for (let i = 0; i < 40; i++) {
				await page.keyboard.press("Tab");
				const state = await page.evaluate(() => {
					const el = document.activeElement;
					const cs = getComputedStyle(el);
					const rgb = color => {
						const ctx = document.createElement("canvas").getContext("2d");
						ctx.fillStyle = color;
						ctx.fillRect(0, 0, 1, 1);
						return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
					};
					const lum = c =>
						c
							.map(v => v / 255)
							.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
							.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
					const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
					let back = rgb(getComputedStyle(document.body).backgroundColor);
					if (el.closest(".hero__card, .banner") || el.matches("[data-bookmark], .icon-button--scrim"))
						back = rgb("#111318");
					else
						for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
							const bg = getComputedStyle(node).backgroundColor;
							if (!/rgba\(.*, 0\)$/.test(bg) && bg !== "transparent") {
								back = rgb(bg);
								break;
							}
						}
					return {
						name: el.getAttribute("aria-label") || el.textContent.trim().replace(/\s+/g, " ").slice(0, 40),
						kind: el.matches("[data-bookmark]")
							? "bookmark"
							: el.matches("[data-hero-dot]")
								? "dot"
								: el.matches("[data-list-switch]")
									? "switch"
									: el.tagName,
						outline: cs.outlineStyle,
						width: parseFloat(cs.outlineWidth),
						contrast: ratio(rgb(cs.outlineColor), back),
					};
				});
				seen.push(state);
			}
			for (const s of seen) {
				assert.equal(s.outline, "solid", `${s.name}: no visible ring`);
				assert.ok(s.width >= 2, `${s.name}: ring ${s.width}px`);
				assert.ok(s.contrast >= 3, `${s.name}: ring contrast ${s.contrast.toFixed(2)}`);
			}
			const kinds = new Set(seen.map(s => s.kind));
			for (const kind of ["A", "BUTTON", "dot", "switch", "bookmark"]) assert.ok(kinds.has(kind), `reached a ${kind}`);
			await dispose();
		});
	}
});
