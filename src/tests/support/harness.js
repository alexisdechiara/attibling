// Test harness: serves the theme's built assets and HTML fixtures from disk
// through Playwright request interception, and stubs the Ghost Content API.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SITE = "http://theme.test";
const GHOST_HOST = "http://blog.test";
const POSTS_API = `${GHOST_HOST}/ghost/api/content/posts/`;

const MIME = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".json": "application/json",
};

const defaultPosts = [
	{
		id: "1",
		title: "Getting started with Ghost",
		url: `${GHOST_HOST}/getting-started/`,
		published_at: "2023-01-15T10:00:00.000Z",
		custom_excerpt: "A first post",
		tags: [{ name: "Intro" }],
	},
	{
		id: "2",
		title: "Writing in Markdown",
		url: `${GHOST_HOST}/markdown/`,
		published_at: "2023-02-20T10:00:00.000Z",
		custom_excerpt: "Formatting tips",
		tags: [{ name: "Writing" }],
	},
];

const buildGlobals = ({ apiKey, nativeSearch }) => {
	let html = `<script>const ghostHost = "${GHOST_HOST}"</script>`;
	if (nativeSearch) {
		html += "<script>const nativeSearchEnabled = true</script>";
	}
	if (apiKey) {
		html += `<script>const ghostSearchApiKey = "${apiKey}"</script>`;
	}
	return html;
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
 *  - apiKey: search API key or null to omit it (default "test-key")
 *  - nativeSearch: define nativeSearchEnabled (default false)
 *  - posts: posts returned by the stubbed Content API
 *  - holdPosts: if true, the Content API response is held until release() is called
 *  - comments: HTML injected in place of <!--COMMENTS-->
 *  - storage: object of localStorage entries set before any script runs
 *  - colorScheme, reducedMotion, viewport: browser context options
 */
const open = async (options = {}) => {
	const {
		fixture = "home.html",
		apiKey = "0123456789abcdef0123456789",
		nativeSearch = false,
		posts = defaultPosts,
		holdPosts = false,
		comments = "",
		storage = null,
		colorScheme = "light",
		reducedMotion = "no-preference",
		viewport = { width: 1280, height: 800 },
	} = options;

	const context = await browser.newContext({ colorScheme, reducedMotion, viewport });
	const page = await context.newPage();
	const apiRequests = [];
	const requests = [];
	const errors = [];
	const logs = [];
	let release = () => {};
	const held = holdPosts ? new Promise(resolve => (release = resolve)) : Promise.resolve();

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

		if (url.origin === GHOST_HOST && url.pathname.startsWith("/ghost/api/content/posts")) {
			apiRequests.push(url.href);
			await held;
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: JSON.stringify({
					posts,
					meta: { pagination: { page: 1, limit: "all", pages: 1, total: posts.length, next: null, prev: null } },
				}),
			});
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
					.replace("<!--GLOBALS-->", buildGlobals({ apiKey, nativeSearch }))
					.replace("<!--COMMENTS-->", comments);
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
		apiRequests,
		requests,
		errors,
		logs,
		release: () => release(),
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

module.exports = { launch, close, open, waitFor, sleep, REPO_ROOT, SITE, GHOST_HOST, POSTS_API, defaultPosts };
