// Test harness: serves the theme's built assets and HTML fixtures from disk
// through Playwright request interception; every other request is aborted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
 *  - fixture: file name in tests/fixtures (default "home.html")
 *  - comments: HTML injected in place of <!--COMMENTS-->
 *  - storage: object of localStorage entries set before any script runs
 *  - colorScheme, reducedMotion, viewport: browser context options
 */
const open = async (options = {}) => {
	const {
		fixture = "home.html",
		comments = "",
		storage = null,
		colorScheme = "light",
		reducedMotion = "no-preference",
		viewport = { width: 1280, height: 800 },
	} = options;

	const context = await browser.newContext({ colorScheme, reducedMotion, viewport });
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

		if (url.origin === SITE) {
			const file = path.join(REPO_ROOT, decodeURIComponent(url.pathname));
			if (!file.startsWith(REPO_ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
				return route.fulfill({ status: 404, body: "not found" });
			}
			let body = fs.readFileSync(file);
			if (file.endsWith(".html")) {
				body = body.toString().replace("<!--COMMENTS-->", comments);
			}
			return route.fulfill({
				status: 200,
				contentType: MIME[path.extname(file)] || "application/octet-stream",
				body,
			});
		}

		return route.abort();
	});

	await page.goto(`${SITE}/src/tests/fixtures/${fixture}`, { waitUntil: "load" });

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
