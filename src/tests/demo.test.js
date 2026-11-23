import { describe, it } from "vite-plus/test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT } from "./support/harness.js";

// The local demo (src/demo): seed, work directory, safety checks. Nothing here needs Ghost, Docker or Python
// packages: what is checked is the code that protects the computer and the real site.
const demo = file => path.join(REPO_ROOT, "src/demo", file);
const load = file => import(pathToFileURL(demo(file)).href);
const read = file => fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const home = os.homedir();
// Some tests need a real folder that is neither in the repository nor under tmpdir: the home directory.
const within = (child, parent) => !path.relative(parent, child).startsWith("..");
const homeIsSafe = !within(home, os.tmpdir()) && !within(home, REPO_ROOT);

describe("demo: external-link guard", () => {
	it("finds every URL that does not point to this computer", async () => {
		const { findExternalUrls } = await load("lib/links.mjs");
		assert.deepEqual(findExternalUrls('<a href="https://example.com/a">x</a>'), ["https://example.com/a"]);
		assert.deepEqual(findExternalUrls("<img src='http://cdn.example.org/i.png'>"), ["http://cdn.example.org/i.png"]);
		assert.deepEqual(findExternalUrls('<script src="//cdn.example.org/x.js"></script>'), ["//cdn.example.org/x.js"]);
		assert.deepEqual(findExternalUrls("voir (HTTPS://Example.com)"), ["HTTPS://Example.com"]);
	});

	it("accepts local URLs and relative links", async () => {
		const { findExternalUrls } = await load("lib/links.mjs");
		const html =
			'<a href="/tag/ia/">IA</a> <a href="http://localhost:2368/a/">a</a> <img src="http://localhost:2368/content/images/x.jpg">' +
			' <a href="https://localhost/">b</a> <a href="http://127.0.0.1:2368">c</a> <a href="//localhost:2368/d">d</a>';
		assert.deepEqual(findExternalUrls(html), []);
		assert.deepEqual(findExternalUrls(""), []);
		assert.deepEqual(findExternalUrls(null), []);
	});

	it("is not fooled by hosts that merely start with « localhost »", async () => {
		const { findExternalUrls } = await load("lib/links.mjs");
		for (const url of [
			"http://localhost.evil.example/",
			"http://localhost:2368.evil.example/",
			"http://localhost@evil.example/",
			"//localhost.evil.example/x",
			"http://127.0.0.1.evil.example/",
		]) {
			assert.deepEqual(findExternalUrls(`<a href="${url}">x</a>`), [url], url);
		}
	});

	it("throws, naming the post, when a post holds an external link", async () => {
		const { assertNoExternal } = await load("lib/links.mjs");
		assert.doesNotThrow(() => assertNoExternal("mon-article", '<a href="/x/">x</a>'));
		assert.throws(
			() => assertNoExternal("mon-article", '<a href="https://example.com/">x</a>'),
			/mon-article.*example\.com/,
		);
	});

	it("is satisfied by every post and page of the seed", async () => {
		const { assertNoExternal } = await load("lib/links.mjs");
		const content = await load("lib/content.mjs");
		for (const post of content.POSTS) {
			assertNoExternal(post.slug, content.postHtml(post));
			assertNoExternal(`${post.slug} (extrait)`, post.excerpt);
		}
		for (const page of content.PAGES) assertNoExternal(page.slug, page.html || "");
	});

	it("keeps the Admin API client on localhost", () => {
		const run = url =>
			spawnSync(
				process.execPath,
				["--input-type=module", "-e", `await import(${JSON.stringify(demo("lib/api.mjs"))})`],
				{
					env: { ...process.env, GHOST_URL: url },
					encoding: "utf8",
				},
			);
		assert.equal(run("http://localhost:2368").status, 0);
		const refused = run("https://geekly.blog");
		assert.notEqual(refused.status, 0);
		assert.match(refused.stderr, /only targets the local instance/);
	});
});

describe("demo: work directory", () => {
	const options = { repoRoot: "/work/attibling", tmpDir: "/var/folders/xx/T" };

	it("defaults to ~/ghost-geekly and honours GEEKLY_DEMO_DIR, with « ~ » expanded", async () => {
		const { resolveWorkDir } = await load("lib/workdir.mjs");
		assert.equal(resolveWorkDir({ ...options, env: {}, home: "/home/ada" }), "/home/ada/ghost-geekly");
		assert.equal(
			resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: "  " }, home: "/home/ada" }),
			"/home/ada/ghost-geekly",
		);
		assert.equal(
			resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: "/data/demo" }, home: "/home/ada" }),
			"/data/demo",
		);
		assert.equal(
			resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: "~/demo" }, home: "/home/ada" }),
			"/home/ada/demo",
		);
	});

	it("refuses a directory inside the repository (or the repository itself)", async () => {
		const { resolveWorkDir } = await load("lib/workdir.mjs");
		for (const dir of ["/work/attibling", "/work/attibling/demo", "/work/attibling/src/demo/work"]) {
			assert.throws(
				() => resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: dir }, home: "/home/ada" }),
				/dans le dépôt/,
				dir,
			);
		}
	});

	it("refuses a directory that contains the repository", async () => {
		const { resolveWorkDir } = await load("lib/workdir.mjs");
		for (const dir of ["/work", "/"]) {
			assert.throws(
				() => resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: dir }, home: "/home/ada" }),
				/contient le dépôt/,
				dir,
			);
		}
	});

	it("refuses a directory under the system temporary directory (gscan would delete files there)", async () => {
		const { resolveWorkDir } = await load("lib/workdir.mjs");
		for (const dir of ["/var/folders/xx/T", "/var/folders/xx/T/ghost", "/var/folders/xx/T2/ghost"]) {
			assert.throws(
				() => resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: dir }, home: "/home/ada" }),
				/temporaire/,
				dir,
			);
		}
		assert.throws(() => resolveWorkDir({ ...options, env: {}, home: "/var/folders/xx/T/home" }), /temporaire/);
		assert.equal(
			resolveWorkDir({ ...options, env: { GEEKLY_DEMO_DIR: "/var/folders/xx/other" }, home: "/home/ada" }),
			"/var/folders/xx/other",
		);
	});

	it("looks through symbolic links", async () => {
		const { assertSafeDir } = await load("lib/workdir.mjs");
		const base = fs.mkdtempSync(path.join(os.tmpdir(), "geekly-link-"));
		try {
			const link = path.join(base, "innocent");
			fs.symlinkSync(REPO_ROOT, link, "dir");
			const outside = { repoRoot: REPO_ROOT, tmpDir: path.join(base, "no-such-tmp") };
			assert.throws(() => assertSafeDir(link, outside), /dans le dépôt/);
			assert.throws(() => assertSafeDir(path.join(link, "work"), outside), /dans le dépôt/);
			const tmpLink = path.join(base, "to-tmp");
			fs.symlinkSync(base, tmpLink, "dir");
			assert.throws(
				() => assertSafeDir(path.join(tmpLink, "work"), { repoRoot: "/work/attibling", tmpDir: base }),
				/temporaire/,
			);
		} finally {
			fs.rmSync(base, { recursive: true, force: true });
		}
	});

	it("refuses to run a script from an unsafe GEEKLY_DEMO_DIR, with a message", () => {
		const run = dir =>
			spawnSync(process.execPath, [demo("lib/workdir.mjs")], {
				env: { ...process.env, GEEKLY_DEMO_DIR: dir },
				encoding: "utf8",
			});
		const inRepo = run(path.join(REPO_ROOT, "work"));
		assert.equal(inRepo.status, 1);
		assert.match(inRepo.stderr, /Erreur : .*dans le dépôt/);
		const underTmp = run(path.join(os.tmpdir(), "geekly-demo-never-created"));
		assert.equal(underTmp.status, 1);
		assert.match(underTmp.stderr, /temporaire/);
	});

	it("applies the same rule to the image generator, before it needs numpy", () => {
		const python = spawnSync("python3", ["--version"]);
		if (python.status !== 0) return;
		const run = (args, env) =>
			spawnSync("python3", ["-I", demo("gen-images.py"), "--check-only", ...args], {
				env: { PATH: process.env.PATH, HOME: home, ...env },
				encoding: "utf8",
			});
		assert.notEqual(run([], { GEEKLY_DEMO_DIR: path.join(REPO_ROOT, "work") }).status, 0);
		assert.notEqual(run(["--images", path.join(REPO_ROOT, "x")], {}).status, 0);
		assert.notEqual(run(["--images", path.join(os.tmpdir(), "x")], {}).status, 0);
		if (homeIsSafe) {
			const ok = run([], { GEEKLY_DEMO_DIR: path.join(home, "geekly-demo-never-created") });
			assert.equal(ok.status, 0, ok.stderr);
			assert.equal(ok.stdout.trim(), path.join(home, "geekly-demo-never-created", "images"));
		}
	});

	it("writes the credentials with mode 600, even over a file that was more open", async function () {
		if (!homeIsSafe) return;
		const work = fs.mkdtempSync(path.join(home, ".geekly-demo-test-"));
		const previous = process.env.GEEKLY_DEMO_DIR;
		process.env.GEEKLY_DEMO_DIR = work;
		try {
			const { writeCreds, CRED_FILE } = await import(`${pathToFileURL(demo("lib/bootstrap.mjs")).href}?creds`);
			assert.equal(CRED_FILE, path.join(fs.realpathSync(work), "credentials.json"));
			fs.writeFileSync(CRED_FILE, "{}", { mode: 0o644 });
			writeCreds({ staff: { email: "a@b.test" } });
			assert.equal(fs.statSync(CRED_FILE).mode & 0o777, 0o600);
			assert.equal(JSON.parse(fs.readFileSync(CRED_FILE, "utf8")).staff.email, "a@b.test");
		} finally {
			if (previous === undefined) delete process.env.GEEKLY_DEMO_DIR;
			else process.env.GEEKLY_DEMO_DIR = previous;
			fs.rmSync(work, { recursive: true, force: true });
		}
	});
});

describe("demo: Ghost safety configuration", () => {
	it("merges the safety keys into a Ghost config and keeps the other keys", async () => {
		const { mergeSafetyConfig, SAFETY_CONFIG } = await load("lib/safety.mjs");
		const config = {
			url: "http://localhost:2368",
			mail: { transport: "Direct", from: "x" },
			privacy: { useTinfoil: false },
		};
		const merged = mergeSafetyConfig(config);
		assert.equal(merged.url, "http://localhost:2368");
		assert.equal(merged.mail.transport, "stub");
		assert.equal(merged.mail.from, "x");
		assert.equal(merged.privacy.useTinfoil, true);
		assert.equal(merged.privacy.useGravatar, false);
		assert.equal(config.privacy.useTinfoil, false, "the input is not modified");
		assert.deepEqual(mergeSafetyConfig(merged), merged, "idempotent");
		assert.equal(SAFETY_CONFIG.security.staffDeviceVerification, false);
		assert.equal(SAFETY_CONFIG.services.recommendations.enabled, false);
	});

	it("is applied to a config file by the command line", () => {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), "geekly-config-"));
		try {
			const file = path.join(base, "config.development.json");
			fs.writeFileSync(file, JSON.stringify({ url: "http://localhost:2368", server: { port: 2368 } }));
			execFileSync(process.execPath, [demo("lib/safety.mjs"), file]);
			const config = JSON.parse(fs.readFileSync(file, "utf8"));
			assert.equal(config.server.port, 2368);
			assert.equal(config.privacy.useTinfoil, true);
			assert.equal(config.mail.transport, "stub");
		} finally {
			fs.rmSync(base, { recursive: true, force: true });
		}
	});

	it("is the same in src/docker-compose.yml, as environment variables", async () => {
		const { SAFETY_CONFIG } = await load("lib/safety.mjs");
		const compose = read("src/docker-compose.yml");
		const env = Object.fromEntries(
			[...compose.matchAll(/^ {6}([A-Za-z_]+): "?([^"\n#]+?)"?\s*$/gm)].map(([, key, value]) => [key, value]),
		);
		const flat = (object, prefix = []) =>
			Object.entries(object).flatMap(([key, value]) =>
				value !== null && typeof value === "object"
					? flat(value, [...prefix, key])
					: [[[...prefix, key].join("__"), value]],
			);
		const wanted = flat(SAFETY_CONFIG).filter(([, value]) => value !== null);
		for (const key of [
			"privacy__useTinfoil",
			"privacy__useUpdateCheck",
			"privacy__useGravatar",
			"privacy__useRpcPing",
			"mail__transport",
			"security__staffDeviceVerification",
			"updateCheck__url",
			"gravatar__url",
			"remoteFlags__enabled",
			"services__recommendations__enabled",
		]) {
			const entry = wanted.find(([name]) => name === key);
			assert.ok(entry, `${key} is a safety key`);
			assert.equal(env[key], String(entry[1]), `${key} in docker-compose.yml`);
		}
	});

	it("mounts the repository where the container's temporary directory is not (gscan cannot touch it)", () => {
		const compose = read("src/docker-compose.yml");
		assert.match(compose, /\.\/\.\.:\/var\/lib\/ghost\/content\/themes\/attibling/);
		assert.doesNotMatch(compose, /TMPDIR|\/tmp/);
	});
});

describe("demo: seed content follows the current theme", () => {
	it("sets the theme settings the theme really has, with valid values", async () => {
		const { THEME_SETTINGS, TAGS } = await load("lib/content.mjs");
		const custom = pkg.config.custom;
		for (const [key, value] of Object.entries(THEME_SETTINGS)) {
			assert.ok(key in custom, `${key} is a theme setting`);
			if (custom[key].type === "select") assert.ok(custom[key].options.includes(value), `${key} = ${value}`);
			if (custom[key].type === "boolean") assert.equal(typeof value, "boolean", key);
		}
		assert.equal(THEME_SETTINGS.use_geekly_logo, true);
		const rows = [1, 2, 3, 4, 5].map(n => THEME_SETTINGS[`home_row_${n}`]);
		assert.deepEqual(rows, ["jeux-video", "anime", "actualites", "ia", "dossiers"]);
		for (const slug of rows)
			assert.ok(
				TAGS.some(tag => tag.slug === slug),
				`tag ${slug} exists`,
			);
	});

	it("creates the internal tags of the author guide, with the Pixel & Mémoire series", async () => {
		const { TAGS } = await load("lib/content.mjs");
		const names = TAGS.map(tag => tag.name);
		for (const name of ["#top", "#top-1", "#top-5", "#immersif", "#carte", "#mis-a-jour", "#serie-pixel-memoire"]) {
			assert.ok(names.includes(name), name);
		}
		assert.equal(TAGS.find(tag => tag.name === "#serie-pixel-memoire").description, "Pixel & Mémoire · total: 6");
	});

	it("has 30 posts, 2 authors and the pages of the guide", async () => {
		const { POSTS, PAGES, AUTHORS } = await load("lib/content.mjs");
		assert.equal(POSTS.length, 30);
		assert.equal(new Set(POSTS.map(post => post.slug)).size, 30);
		assert.deepEqual(Object.keys(AUTHORS), ["alexis", "lea"]);
		const slugs = PAGES.map(page => page.slug);
		for (const slug of [
			"archives",
			"favoris",
			"tags",
			"authors",
			"a-propos",
			"abonnement",
			"mentions-legales",
			"cookies",
		]) {
			assert.ok(slugs.includes(slug), slug);
		}
	});

	it("titles the `favoris` page « À lire plus tard » and says « tags », never « rubriques » or « mots clés »", async () => {
		const { POSTS, PAGES, TAGS, postHtml } = await load("lib/content.mjs");
		assert.equal(PAGES.find(page => page.slug === "favoris").title, "À lire plus tard");
		const everything = JSON.stringify([PAGES, TAGS, POSTS.map(postHtml), POSTS.map(post => post.excerpt)]);
		assert.doesNotMatch(everything, /rubriques?|mots?[- ]cl[ée]s?|Mes favoris/i);
	});

	it("gives the review cards the markup of the author guide, with their data-type", async () => {
		const { POSTS, postHtml } = await load("lib/content.mjs");
		const html = postHtml(POSTS.find(post => post.slug === "aether-drifters-la-bonne-surprise-de-l-automne"));
		assert.match(html, /<aside class="fiche-test" data-type="VideoGame">/);
		for (const part of [
			"fiche-test__type",
			"fiche-test__titre",
			"fiche-test__note",
			"fiche-test__infos",
			"fiche-test__plus",
			"fiche-test__moins",
			"fiche-test__verdict",
		]) {
			assert.ok(html.includes(`class="${part}"`), part);
		}
		const guide = read("docs/guide-auteur.md");
		assert.ok(guide.includes('<aside class="fiche-test" data-type="VideoGame">'));
		const anime = postHtml(POSTS.find(post => post.slug === "hoshi-no-koro-notre-avis-sur-la-saison-2"));
		assert.match(anime, /<aside class="fiche-test" data-type="TVSeries">/);
	});
});

describe("demo: theme copy", () => {
	it("keeps the files of the theme and leaves out what `npm run zip` leaves out", async () => {
		const { themeFiles } = await load("lib/theme.mjs");
		const kept = [
			"package.json",
			"index.hbs",
			"assets/js/app.js",
			"assets/fonts/x.woff2",
			"locales/fr.json",
			"partials/tags/prepaint.hbs",
		];
		const dropped = [
			"src/js/app.js",
			"src/demo/seed.mjs",
			"docs/guide-auteur.md",
			"node_modules/x/index.js",
			".git/config",
			".github/workflows/ci.yml",
			".claude/settings.json",
			"README.md",
			"CLAUDE.md",
			"AGENTS.md",
			"package-lock.json",
			"vite.config.mjs",
			"attibling.zip",
		];
		assert.deepEqual(themeFiles([...kept, ...dropped]), kept);
	});

	it("copies this repository's theme into a work directory, and nothing else", async () => {
		const { syncTheme, ensureThemeLink } = await load("lib/theme.mjs");
		const work = fs.mkdtempSync(path.join(os.tmpdir(), "geekly-sync-"));
		const noTmp = path.join(work, "no-such-tmp"); // only so that this test may use a folder under tmpdir
		try {
			fs.mkdirSync(path.join(work, "theme"));
			fs.writeFileSync(path.join(work, "theme", "stale.hbs"), "old");
			const count = syncTheme({ src: REPO_ROOT, work, tmpDir: noTmp });
			assert.ok(count > 100);
			const theme = path.join(work, "theme");
			assert.ok(!fs.existsSync(path.join(theme, "stale.hbs")), "the old copy is emptied");
			assert.ok(fs.existsSync(path.join(theme, "package.json")));
			assert.ok(fs.existsSync(path.join(theme, "assets/js/app.js")), "built assets");
			assert.ok(fs.existsSync(path.join(theme, "partials/tags/prepaint.hbs")), "built partial");
			for (const absent of ["src", "docs", ".git", "node_modules", "CLAUDE.md", "README.md", ".claude"]) {
				assert.ok(!fs.existsSync(path.join(theme, absent)), absent);
			}
			assert.equal(fs.readFileSync(path.join(theme, "index.hbs"), "utf8"), read("index.hbs"));

			// the link: created towards the copy, then accepted again; anything else is refused
			fs.mkdirSync(path.join(work, "site/content/themes"), { recursive: true });
			const link = ensureThemeLink({ work });
			assert.equal(fs.readlinkSync(link), theme);
			assert.equal(ensureThemeLink({ work }), link);
			fs.rmSync(link);
			fs.symlinkSync(REPO_ROOT, link, "dir");
			assert.throws(() => ensureThemeLink({ work }), /Refus de démarrer/);
			assert.ok(fs.existsSync(path.join(REPO_ROOT, "package.json")), "the repository is untouched");
		} finally {
			fs.rmSync(work, { recursive: true, force: true });
		}
	});

	it("refuses a theme copy inside the repository or under the temporary directory", async () => {
		const { syncTheme } = await load("lib/theme.mjs");
		assert.throws(() => syncTheme({ src: REPO_ROOT, work: path.join(REPO_ROOT, "work") }), /dans le dépôt/);
		assert.throws(() => syncTheme({ src: REPO_ROOT, work: path.join(os.tmpdir(), "geekly-never") }), /temporaire/);
		assert.ok(!fs.existsSync(path.join(REPO_ROOT, "work")));
	});
});

describe("demo: repository", () => {
	const tracked = () =>
		execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src/demo"], {
			cwd: REPO_ROOT,
			encoding: "utf8",
		})
			.split("\n")
			.filter(Boolean);

	it("keeps src/demo out of the theme zip (the zip script excludes src/*)", () => {
		const zip = pkg.scripts.zip;
		assert.match(zip, /-x [^"]*'src\/\*'/);
		assert.ok(tracked().every(file => file.startsWith("src/demo/")));
		assert.ok(tracked().length > 10);
	});

	it("commits neither credentials, nor state, nor images, nor a database, nor a Ghost install", () => {
		const forbidden =
			/(^|\/)(credentials|seed-state|manifest)\.json$|\.(jpe?g|png|webp|gif|db|sqlite3?|log|pid|zip)$|(^|\/)(images|site|theme|tools|venv|run-tmp|node_modules)\/|config\.(development|production)\.json$/i;
		assert.deepEqual(
			tracked().filter(file => forbidden.test(file)),
			[],
		);
	});

	it("adds scripts to package.json but no dependency", () => {
		for (const name of ["install", "start", "stop", "sync", "images", "seed"]) {
			assert.ok(pkg.scripts[`demo:${name}`], `demo:${name}`);
		}
		assert.deepEqual(Object.keys(pkg.dependencies), ["medium-zoom", "tocbot"]);
		for (const script of Object.entries(pkg.scripts).filter(([name]) => name.startsWith("demo:"))) {
			const file = script[1].match(/src\/demo\/[\w.-]+/)[0];
			assert.ok(fs.existsSync(path.join(REPO_ROOT, file)), `${script[0]} runs ${file}`);
		}
	});

	it("writes shell scripts that run on macOS (bash 3.2, BSD tools) and Linux", () => {
		const scripts = fs.readdirSync(demo(".")).filter(file => file.endsWith(".sh"));
		assert.ok(scripts.length >= 6);
		for (const file of scripts) {
			const text = fs.readFileSync(demo(file), "utf8");
			if (file !== "env.sh") {
				assert.match(text, /^#!\/usr\/bin\/env bash\n/, file);
				assert.ok(fs.statSync(demo(file)).mode & 0o100, `${file} is executable`);
			}
			// GNU-only habits that fail on macOS
			assert.doesNotMatch(
				text.replace(/^\s*#.*$/gm, ""),
				/readlink -f|realpath|sed -i|cp --parents|xargs -r|date -d|grep -P|mapfile|readarray|\$\{[A-Za-z_]+,,\}|declare -A/,
				file,
			);
			assert.equal(spawnSync("bash", ["-n", demo(file)]).status, 0, `${file}: bash -n`);
		}
	});

	it("keeps the gscan warning where it matters", () => {
		assert.match(read("src/demo/start.sh"), /TMPDIR/);
		assert.match(read("src/demo/start.sh"), /gscan/);
		const readme = read("src/demo/README.md");
		assert.match(readme, /gscan/);
		assert.match(readme, /os\.tmpdir\(\)/);
		assert.match(readme, /GEEKLY_DEMO_DIR/);
	});

	it("links the demo from README.md and the author guide", () => {
		assert.match(read("README.md"), /src\/demo\/README\.md/);
		assert.match(read("docs/guide-auteur.md"), /src\/demo\/README\.md/);
	});
});
