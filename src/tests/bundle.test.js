import { describe, it } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./support/harness.js";

const JS_DIR = path.join(REPO_ROOT, "assets", "js");

const builtScripts = dir =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const file = path.join(dir, entry.name);
		return entry.isDirectory() ? builtScripts(file) : entry.name.endsWith(".js") ? [file] : [];
	});

const templates = dir =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) return ["partials"].includes(path.relative(REPO_ROOT, file)) ? templates(file) : [];
		return entry.name.endsWith(".hbs") ? [file] : [];
	});

describe("built bundles", () => {
	it("do not ship jQuery", () => {
		const scripts = builtScripts(JS_DIR);
		assert.ok(scripts.length > 0, "no built scripts found");
		for (const file of scripts) {
			const source = fs.readFileSync(file, "utf8");
			assert.equal(source.includes("jQuery"), false, `${path.relative(REPO_ROOT, file)} contains jQuery`);
		}
	});

	it("no longer include the webpack runtime and vendor files", () => {
		for (const file of ["vendor.js", "manifest.js"]) {
			assert.equal(fs.existsSync(path.join(JS_DIR, file)), false, `assets/js/${file} still exists`);
		}
	});

	it("provide every script and stylesheet the templates load", () => {
		for (const file of templates(REPO_ROOT)) {
			const source = fs.readFileSync(file, "utf8");
			for (const [, asset] of source.matchAll(/\{\{asset ["']((?:js|css)\/[^"'?]+)/g)) {
				assert.ok(
					fs.existsSync(path.join(REPO_ROOT, "assets", asset)),
					`${path.relative(REPO_ROOT, file)} loads assets/${asset}, which the build does not produce`,
				);
			}
		}
	});
});
