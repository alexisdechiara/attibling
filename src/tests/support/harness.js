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
	".woff2": "font/woff2",
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
 *  - ghostDefer: { delay, script } a deferred script in <head>, as {{ghost_head}} outputs Ghost's own
 *    (Portal, search, announcement bar: <script defer src="https://cdn.jsdelivr.net/…">), answered after
 *    `delay` ms with the JavaScript `script`; it sets window.__ghostDeferRan (performance.now()) first
 *  - slow: { "/assets/js/archives.js": 1500 } files of the repository served that many ms late (a slow
 *    network for one script, e.g. to see the page before it runs); "/__slow.js" is an empty script
 *  - colorScheme, reducedMotion, viewport, hasTouch, isMobile, javaScriptEnabled: browser context options
 *  - pages: { "/path/": render options } other rendered pages the test navigates to; the key "*" serves
 *    every other path that is not a file of the repository (e.g. a post opened from a tile)
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
		isMobile = false,
		javaScriptEnabled = true,
		pages = {},
		ghostDefer = null,
		slow = {},
	} = options;
	const render = options.render || (fixture ? null : home());

	const context = await browser.newContext({
		colorScheme,
		reducedMotion,
		viewport,
		hasTouch,
		isMobile,
		javaScriptEnabled,
	});
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

	const withGhostDefer = html =>
		ghostDefer
			? html.replace(/<meta name="generator"[^>]*>/, tag => `${tag}<script defer src="/__ghost/deferred.js"></script>`)
			: html;

	await context.route("**/*", async route => {
		const url = new URL(route.request().url());
		requests.push(url.href);

		if (ghostDefer && url.origin === SITE && url.pathname === "/__ghost/deferred.js") {
			await sleep(ghostDefer.delay || 0);
			return route.fulfill({
				status: 200,
				contentType: "application/javascript",
				body: `window.__ghostDeferRan = performance.now();\n${ghostDefer.script || ""}`,
			});
		}

		const repoFile = path.join(REPO_ROOT, decodeURIComponent(url.pathname));
		const isFile = fs.existsSync(repoFile) && fs.statSync(repoFile).isFile();
		const other = url.origin === SITE && !isFile && (pages[url.pathname] || pages["*"]);
		if (url.origin === SITE && ((render && url.pathname === "/__render") || other)) {
			const { template, ...renderOptions } = url.pathname === "/__render" ? render : other;
			const html = withGhostDefer(renderTemplate(template, renderOptions))
				.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
				.replace(/<body[^>]*>/, tag => tag + bodyStart);
			return route.fulfill({ status: 200, contentType: "text/html", body: html });
		}

		if (url.origin === SITE) {
			if (slow[url.pathname]) await sleep(slow[url.pathname]);
			if (url.pathname === "/__slow.js") {
				return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
			}
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export { launch, close, open, waitFor, sleep, REPO_ROOT, SITE };
