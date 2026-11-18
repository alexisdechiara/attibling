import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite-plus";

const root = import.meta.dirname;
const outDir = path.join(root, "assets");

// Browsers released in the last two years (November 2024 onwards).
const browsers = ["chrome131", "edge131", "firefox133", "safari18.2"];

// The same browsers in Lightning CSS form; Vite would otherwise lower CSS for its default
// "baseline widely available" targets (Safari 16.4), which flattens the native nesting.
const lightningcssTargets = Object.fromEntries(
	browsers.map(b => {
		const [, name, major, minor = 0] = b.match(/^([a-z]+)(\d+)(?:\.(\d+))?$/);
		return [name, (Number(major) << 16) | (Number(minor) << 8)];
	}),
);

const js = ["app", "home", "post", "page"];
const css = ["app", "home", "listing", "post", "newsletter", "tags", "404"];

// The build writes into assets/, which also holds committed images, fonts and HTML, so it
// cannot empty its output directory: remove the previous JS and CSS output instead.
const cleanBuiltAssets = () => ({
	name: "attibling:clean-built-assets",
	apply: "build",
	buildStart() {
		for (const dir of ["js", "css"]) {
			fs.rmSync(path.join(outDir, dir), { recursive: true, force: true });
		}
	},
});

// The icon font glyphs end up as raw UTF-8 characters in the minified CSS. Start such files
// with a byte order mark, as the Sass build did, so they decode as UTF-8 even when a server
// or proxy sends them without a charset.
const cssByteOrderMark = () => ({
	name: "attibling:css-bom",
	apply: "build",
	generateBundle(options, bundle) {
		for (const file of Object.values(bundle)) {
			if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;
			const source = typeof file.source === "string" ? file.source : Buffer.from(file.source).toString("utf8");
			// oxlint-disable-next-line no-control-regex
			if (/[^\u0000-\u007f]/.test(source) && !source.startsWith("\ufeff")) file.source = `\ufeff${source}`;
		}
	},
});

// assets/html/javascript.html is the LibreJS licence table (linked from the footer): it lists
// every built script, so it is regenerated from the bundle, hashed chunk names included.
const librejsTable = () => ({
	name: "attibling:librejs-table",
	apply: "build",
	writeBundle(options, bundle) {
		const files = Object.values(bundle)
			.filter(file => file.type === "chunk")
			.map(file => file.fileName)
			.sort((a, b) => a.includes("/chunks/") - b.includes("/chunks/") || a.localeCompare(b));
		const rows = files.map(file => {
			const url = `/assets/${file}`;
			const name = file.replace(/^js\//, "");
			return `  <tr>
    <td><a href="${url}">${name}</a></td>
    <td><a href="http://www.jclark.com/xml/copying.txt">Expat</a></td>
    <td><a href="${url}">${name}</a></td>
  </tr>`;
		});
		const html = `<table id="jslicense-labels1">
  <tr>
    <th>Javascript file</th>
    <th>License canonical URL</th>
    <th>Original file</th>
  </tr>
${rows.join("\n\n")}
</table>`;
		fs.writeFileSync(path.join(outDir, "html", "javascript.html"), html);
	},
});

export default defineConfig({
	base: "./",
	publicDir: false,
	plugins: [cleanBuiltAssets(), cssByteOrderMark(), librejsTable()],
	css: {
		transformer: "lightningcss",
		lightningcss: { targets: lightningcssTargets },
	},
	build: {
		outDir,
		emptyOutDir: false,
		target: browsers,
		cssTarget: browsers,
		cssMinify: "lightningcss",
		cssCodeSplit: true,
		assetsInlineLimit: 0,
		modulePreload: { polyfill: false },
		rolldownOptions: {
			input: Object.fromEntries([
				...js.map(name => [`js/${name}`, path.join(root, "src/js", `${name}.js`)]),
				...css.map(name => [`css/${name}`, path.join(root, "src/css", `${name}.css`)]),
			]),
			output: {
				entryFileNames: "[name].js",
				// Entries keep the un-hashed paths the templates load through {{asset}}, which adds
				// Ghost's cache-busting query. Shared chunks are imported by the entries without
				// that query, and Ghost serves theme assets with a one-year max-age, so their names
				// carry a content hash; stale ones are removed by cleanBuiltAssets().
				chunkFileNames: chunk => `js/chunks/${chunk.name.replace(/\.css$/, "")}-[hash].js`,
				assetFileNames: "[name][extname]",
			},
		},
	},
	test: {
		include: ["src/tests/**/*.test.js"],
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 30000,
	},
	lint: {
		ignorePatterns: ["assets/**", "node_modules/**"],
		env: { browser: true },
	},
	fmt: {
		useTabs: true,
		singleQuote: false,
		printWidth: 120,
		arrowParens: "avoid",
		ignorePatterns: [
			"assets/**",
			"locales/**",
			"partials/**",
			"**/*.hbs",
			"**/*.md",
			"**/*.html",
			"**/*.json",
			"**/*.yml",
			".impeccable/**",
			".vscode/**",
		],
		overrides: [{ files: ["**/*.css"], options: { useTabs: false, tabWidth: 2 } }],
	},
});
