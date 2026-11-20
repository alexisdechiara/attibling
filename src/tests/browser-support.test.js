// Browser support: Baseline Widely Available (vite.config.mjs `browsers`: Chrome / Edge 125, Firefox 126,
// Safari 17.5). The built CSS must hold nothing those browsers would drop in a way that breaks a page
// (relative colours, declarations after nested rules), keep what some of them lack behind @supports,
// and carry the prefixes Safari 17 needs; and a browser without the newer features must still get
// usable pages (simulated in Chromium: the APIs removed, the CSS rules they lack deleted).
import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import config, { browsers } from "../../vite.config.mjs";
import { launch, close, open, waitFor, REPO_ROOT } from "./support/harness.js";
import { article } from "./support/article.js";

const CSS_DIR = path.join(REPO_ROOT, "assets", "css");
const builtCss = () =>
	fs
		.readdirSync(CSS_DIR)
		.filter(name => name.endsWith(".css"))
		.map(name => [name, fs.readFileSync(path.join(CSS_DIR, name), "utf8")]);

// A small CSS parser, enough for the minified output: blocks { prelude, items } and declarations
// { decl }; strings, comments and parentheses (data: URLs) are kept whole.
const parse = css => {
	const root = { prelude: "", items: [] };
	const stack = [root];
	let buf = "";
	const skip = (i, close) => {
		for (let j = i + 1; j < css.length; j++) {
			if (css[j] === "\\") j++;
			else if (css[j] === close) return j;
		}
		return css.length;
	};
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		const top = stack[stack.length - 1];
		if (c === '"' || c === "'") {
			const j = skip(i, c);
			buf += css.slice(i, j + 1);
			i = j;
		} else if (c === "/" && css[i + 1] === "*") {
			i = css.indexOf("*/", i + 2) + 1;
		} else if (c === "(") {
			let depth = 0;
			let j = i;
			for (; j < css.length; j++) {
				if (css[j] === '"' || css[j] === "'") j = skip(j, css[j]);
				else if (css[j] === "(") depth++;
				else if (css[j] === ")" && --depth === 0) break;
			}
			buf += css.slice(i, j + 1);
			i = j;
		} else if (c === "{") {
			const node = { prelude: buf.trim(), items: [] };
			top.items.push(node);
			stack.push(node);
			buf = "";
		} else if (c === ";" || c === "}") {
			if (buf.trim()) top.items.push({ decl: buf.trim() });
			buf = "";
			if (c === "}") stack.pop();
		} else buf += c;
	}
	return root;
};

// Calls fn(node, ancestors) for every block
const walk = (node, fn, ancestors = []) => {
	for (const item of node.items) {
		if (!item.items) continue;
		fn(item, ancestors);
		walk(item, fn, [...ancestors, item]);
	}
};

const prop = decl => decl.slice(0, decl.indexOf(":")).trim();

describe("browser support: the build targets", () => {
	it("are Baseline Widely Available, for the CSS (Lightning CSS) and the JavaScript alike", () => {
		assert.deepEqual(browsers, ["chrome125", "edge125", "firefox126", "safari17.5", "ios17.5"]);
		assert.equal(config.build.target, browsers);
		assert.equal(config.build.cssTarget, browsers);
		const version = (major, minor = 0) => (major << 16) | (minor << 8);
		assert.deepEqual(config.css.lightningcss.targets, {
			chrome: version(125),
			edge: version(125),
			firefox: version(126),
			safari: version(17, 5),
			ios_saf: version(17, 5),
		});
		const readme = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");
		assert.match(readme, /Chrome and Edge 125, Firefox 126, Safari 17\.5/, "README: Browser support");
		const guide = fs.readFileSync(path.join(REPO_ROOT, "docs", "guide-auteur.md"), "utf8");
		assert.match(guide, /Chrome et Edge 125, Firefox 126,\s+Safari 17\.5/, "guide: Navigateurs pris en charge");
	});
});

describe("browser support: the built CSS", () => {
	it("has no relative colour (Firefox 126 drops the whole declaration: no shade under the hero's text)", () => {
		for (const [name, css] of builtCss()) {
			const found = css.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*from\b[^;}]*/g);
			assert.equal(found, null, `${name}: ${found?.[0]}`);
		}
	});

	it("has none of the newest features that no target has, and the others only inside @supports", () => {
		const never = /@position-try|field-sizing|interpolate-size|calc-size\(|sibling-(?:index|count)\(|@scope\b/;
		// Features some targets lack whose absence would misplace something: only behind a guard. A reset
		// to none is harmless (ignored where unknown).
		const guarded = [
			/^position-area:(?!none$)/,
			/^animation-timeline:/,
			/^animation-range/,
			/^view-timeline/,
			/^timeline-scope:/,
			/^text-box(?:-trim|-edge)?:/,
			/^appearance:base-select/,
		];
		for (const [name, css] of builtCss()) {
			assert.doesNotMatch(css, never, name);
			walk(parse(css), (node, ancestors) => {
				const supported = ancestors.some(a => a.prelude.startsWith("@supports"));
				if (/::picker\(|::checkmark/.test(node.prelude)) assert.ok(supported, `${name}: ${node.prelude} unguarded`);
				for (const { decl } of node.items.filter(item => item.decl)) {
					if (guarded.some(re => re.test(decl.replace(/\s+/g, "")))) {
						assert.ok(supported, `${name}: « ${decl} » in ${node.prelude} outside @supports`);
					}
				}
			});
		}
	});

	it("puts no declaration after a nested rule (Chrome < 130, Firefox < 132, Safari < 18 move it above)", () => {
		for (const [name, css] of builtCss()) {
			walk(parse(css), (node, ancestors) => {
				if (/^@(?:keyframes|font-face|property|page)/.test(node.prelude)) return;
				if (ancestors.some(a => a.prelude.startsWith("@keyframes"))) return;
				let nested = null;
				for (const item of node.items) {
					if (item.items) nested = item.prelude;
					else if (nested) assert.fail(`${name}: « ${item.decl} » follows « ${nested} » in « ${node.prelude} »`);
				}
			});
		}
	});

	it("gives Safari 17 the -webkit- prefixes it needs (backdrop-filter, user-select, text-size-adjust)", () => {
		let seen = 0;
		for (const [name, css] of builtCss()) {
			walk(parse(css), node => {
				const props = node.items.filter(item => item.decl).map(item => prop(item.decl));
				for (const p of ["backdrop-filter", "user-select", "text-size-adjust"]) {
					if (!props.includes(p)) continue;
					seen++;
					assert.ok(props.includes(`-webkit-${p}`), `${name}: ${p} without -webkit- in ${node.prelude}`);
				}
			});
		}
		assert.ok(seen >= 3, "the prefixed properties are still used");
	});
});

// A browser of the targets that lacks the newer features (Firefox 126, Safari 17.5): before any script,
// the APIs removed and CSS.supports() answering as it would there; after load, the CSS rules and
// declarations it would drop deleted from the style sheets.
const olderBrowser = () => {
	const supports = CSS.supports.bind(CSS);
	const missing = /anchor|position-area|timeline|text-box|base-select|view-transition|starting-style|allow-discrete/;
	CSS.supports = (...args) => !missing.test(args.join(":")) && supports(...args);
	delete Document.prototype.startViewTransition;
	delete window.onpageswap;
	delete window.onpagereveal;
	delete HTMLScriptElement.supports;
	delete Element.prototype.checkVisibility;
	delete Navigator.prototype.connection;
};

const stripNewerCss = page =>
	page.evaluate(() => {
		let removed = 0;
		const newerProps = [
			"anchor-name",
			"position-anchor",
			"position-area",
			"view-transition-name",
			"view-transition-class",
		];
		const clean = list => {
			for (let i = list.cssRules.length - 1; i >= 0; i--) {
				const rule = list.cssRules[i];
				const kind = rule.constructor.name;
				const drop =
					kind === "CSSStartingStyleRule" ||
					kind === "CSSPropertyRule" ||
					(kind === "CSSSupportsRule" &&
						/position-area|animation-timeline|text-box|base-select|backdrop-filter/.test(rule.conditionText)) ||
					(rule.selectorText && /::view-transition|::picker|::checkmark/.test(rule.selectorText));
				if (drop) {
					list.deleteRule(i);
					removed++;
					continue;
				}
				if (rule.style) {
					for (const name of newerProps) if (rule.style.removeProperty(name)) removed++;
					// Relative colours (Firefox 126 drops the declaration; a shorthand holding var() reads
					// empty through its longhands)
					for (const name of [...rule.style, "background", "border", "outline"]) {
						if (/\b(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(\s*from\s/.test(rule.style.getPropertyValue(name))) {
							rule.style.removeProperty(name);
							removed++;
						}
					}
					if (rule.style.getPropertyValue("text-wrap-style") === "pretty") rule.style.removeProperty("text-wrap-style");
					// Without transition-behavior, the whole « transition » shorthand is invalid
					if (/allow-discrete/.test(rule.style.getPropertyValue("transition-behavior"))) {
						for (const name of [...rule.style].filter(n => n.startsWith("transition"))) rule.style.removeProperty(name);
						removed++;
					}
				}
				if (rule.cssRules) clean(rule);
			}
		};
		for (const sheet of document.styleSheets) clean(sheet);
		return removed;
	});

const box = (page, selector) =>
	page.evaluate(sel => {
		const el = document.querySelector(sel);
		const r = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		return {
			visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.99 && r.width > 0,
			top: r.top,
			bottom: r.bottom,
			left: r.left,
			right: r.right,
		};
	}, selector);

describe("browser support: without the newer features (Firefox 126, Safari 17.5)", () => {
	before(launch);
	after(close);

	it("the home stays readable: the hero's text keeps its shade, menus open in place, the theme switches", async () => {
		const { page, dispose } = await open({ initScript: olderBrowser, viewport: { width: 1440, height: 900 } });
		assert.ok((await stripNewerCss(page)) > 10, "the newer CSS was removed");

		// The hero's shade (it was a relative colour, dropped by Firefox 126): two gradients, the darkest
		// stop 85 % of the media colour
		const scrim = await page.evaluate(() => getComputedStyle(document.querySelector(".hero__scrim")).backgroundImage);
		assert.match(scrim, /radial-gradient.*linear-gradient/);
		assert.match(scrim, /color\(srgb 0\.0666667 0\.0745098 0\.0941176 \/ 0\.85\)/);

		// « Plus »: opened by the Popover API, placed under its button by the script
		const button = await box(page, "[data-more-button]");
		await page.locator("[data-more-button]").click();
		const menu = await waitFor(async () => {
			const b = await box(page, "[data-more-menu]");
			return b.visible && b;
		});
		assert.ok(menu, "the « Plus » menu is shown at once, without the fade");
		assert.ok(
			menu.top - button.bottom >= 5 && menu.top - button.bottom <= 15,
			`menu ${menu.top - button.bottom}px below`,
		);
		await page.keyboard.press("Escape");

		// The light / dark switch still changes the colours (light-dark() is in every target)
		const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		const light = await bg();
		await page.locator(".site-header [data-theme-switch]").click();
		assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
		assert.notEqual(await bg(), light);
		await dispose();
	});

	it("the phone menu opens and closes", async () => {
		const { page, dispose } = await open({ initScript: olderBrowser, viewport: { width: 390, height: 844 } });
		await stripNewerCss(page);
		await page.locator("[data-menu-button]").click();
		assert.ok(await waitFor(async () => (await box(page, "[data-mobile-menu]")).visible), "the sheet is shown");
		await page.locator("[data-menu-close]").click();
		assert.ok(await waitFor(async () => !(await box(page, "[data-mobile-menu]")).visible), "the sheet is closed");
		await dispose();
	});

	it("a post: the display settings open under the gear, inside the screen, and the reading themes apply", async () => {
		const { page, dispose } = await open({
			initScript: olderBrowser,
			render: article({ member: true }),
			storage: { "attibling-reading": JSON.stringify({ theme: "desert" }) },
			viewport: { width: 1440, height: 900 },
		});
		await stripNewerCss(page);
		assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(241, 230, 210)");
		const gear = await box(page, "[data-reading-button]");
		await page.locator("[data-reading-button]").click();
		const panel = await waitFor(async () => {
			const b = await box(page, "[data-reading-settings]");
			return b.visible && b;
		});
		assert.ok(panel, "the panel is shown");
		assert.ok(
			panel.top >= gear.bottom && panel.top - gear.bottom <= 20,
			`panel ${panel.top - gear.bottom}px below the gear`,
		);
		assert.ok(panel.left >= 0 && panel.right <= 1440, "inside the screen");
		await dispose();
	});
});
