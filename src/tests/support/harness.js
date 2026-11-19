// Test harness: serves the theme's built assets and HTML fixtures from disk
// through Playwright request interception; every other request is aborted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { renderTemplate } from "./ghost.js";
import { home } from "./pages.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SITE = "http://theme.test";
const MIME = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".json": "application/json",
};

let browser = null;

const launch = async () => {
	browser = await chromium.launch();
	return browser;
};

const close = async () => {
	if (browser) {
		await browser.close();
		browser = null;
	}
};

/**
 * Opens a fixture page.
 * options:
 *  - fixture: file name in tests/fixtures (without fixture or render: the home page, see pages.js)
 *  - render: { template, ...options } renders a theme template with ghost.js instead of a fixture
 *    (template: "index", "post"...; the other options are renderTemplate's: site, context, member...)
 *  - comments: HTML injected in place of <!--COMMENTS-->
 *  - storage: object of localStorage entries set before any script runs
 *  - initScript: function run in the page before any of its scripts
 *  - lang: value of the lang attribute of <html> (default "en")
 *  - bodyStart: HTML inserted at the start of <body>, where {{ghost_head}} scripts add theirs
 *  - colorScheme, reducedMotion, viewport, hasTouch: browser context options
 */
const open = async (options = {}) => {
	const {
		fixture = null,
		comments = "",
		storage = null,
		initScript = null,
		lang = "en",
		bodyStart = "",
		colorScheme = "light",
		reducedMotion = "no-preference",
		viewport = { width: 1280, height: 800 },
		hasTouch = false,
	} = options;
	const render = options.render || (fixture ? null : home());

	const context = await browser.newContext({ colorScheme, reducedMotion, viewport, hasTouch });
	const page = await context.newPage();
	const requests = [];
	const errors = [];
	const logs = [];

	page.on("pageerror", err => errors.push(err));
	page.on("console", msg => logs.push(msg.text()));

	if (storage) {
		await context.addInitScript(entries => {
			if (!sessionStorage.getItem("__seeded")) {
				for (const [key, value] of Object.entries(entries)) {
					localStorage.setItem(key, value);
				}
				sessionStorage.setItem("__seeded", "1");
			}
		}, storage);
	}

	if (initScript) {
		await context.addInitScript(initScript);
	}

	// Record every localStorage write made by the page.
	await context.addInitScript(() => {
		window.__storageWrites = [];
		const original = Storage.prototype.setItem;
		Storage.prototype.setItem = function (key, value) {
			if (this === window.localStorage) {
				window.__storageWrites.push([key, String(value)]);
			}
			return original.call(this, key, value);
		};
	});

	await context.route("**/*", async route => {
		const url = new URL(route.request().url());
		requests.push(url.href);

		if (url.origin === SITE && render && url.pathname === "/__render") {
			const { template, ...renderOptions } = render;
			const html = renderTemplate(template, renderOptions)
				.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
				.replace(/<body[^>]*>/, tag => tag + bodyStart);
			return route.fulfill({ status: 200, contentType: "text/html", body: html });
		}

		if (url.origin === SITE) {
			const file = path.join(REPO_ROOT, decodeURIComponent(url.pathname));
			if (!file.startsWith(REPO_ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
				return route.fulfill({ status: 404, body: "not found" });
			}
			let body = fs.readFileSync(file);
			if (file.endsWith(".html")) {
				body = body
					.toString()
					.replace("<!--COMMENTS-->", comments)
					.replace('<html lang="en">', `<html lang="${lang}">`)
					.replace(/<body[^>]*>/, tag => tag + bodyStart);
			}
			return route.fulfill({
				status: 200,
				contentType: MIME[path.extname(file)] || "application/octet-stream",
				body,
			});
		}

		return route.abort();
	});

	await page.goto(render ? `${SITE}/__render` : `${SITE}/src/tests/fixtures/${fixture}`, { waitUntil: "load" });

	return {
		page,
		context,
		requests,
		errors,
		logs,
		storageWrites: () => page.evaluate(() => window.__storageWrites),
		// Closes the context; fails if the page threw an uncaught error.
		dispose: async () => {
			await context.close();
			if (errors.length > 0) {
				throw errors[0];
			}
		},
	};
};

// Polls fn until it returns a truthy value or the timeout elapses.
const waitFor = async (fn, { timeout = 3000, interval = 25 } = {}) => {
	const start = Date.now();
	let last;
	while (Date.now() - start < timeout) {
		last = await fn();
		if (last) {
			return last;
		}
		await new Promise(resolve => setTimeout(resolve, interval));
	}
	return last;
};

// Waits until the entrance animations (data-animate) have finished moving things into place.
const settle = page =>
	page.waitForFunction(() =>
		[...document.querySelectorAll("[data-animate]")].every(el =>
			el.getAnimations().every(animation => animation.playState === "finished"),
		),
	);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export { launch, close, open, waitFor, settle, sleep, REPO_ROOT, SITE };
