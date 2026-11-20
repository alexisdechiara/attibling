import { describe, it } from "vite-plus/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./support/harness.js";

const read = file => fs.readFileSync(path.join(REPO_ROOT, file), "utf8");

describe("repository", () => {
	it("keeps the French wording the site uses: « e-mail », « tag »", () => {
		for (const file of ["locales/fr.json", "locales/fr-informal.json"]) {
			const values = Object.values(JSON.parse(read(file)));
			assert.deepEqual(
				values.filter(v => /\bemails?\b|mots? cl[ée]s?/i.test(v.replace(/e-mail/gi, ""))),
				[],
				file,
			);
		}
	});

	it("links every anchor of the author guide to one of its headings, by GitHub's slug rule", () => {
		// GitHub (github-slugger): the heading's text, lower case, without any character that is not a
		// letter, mark, digit, "_", "-" or a space (« », ’, ?, :, NBSP…), each space a "-"; "-1", "-2"…
		// for a heading met again
		const lines = read("docs/guide-auteur.md").split("\n");
		let fenced = false;
		const seen = new Map();
		const slugs = new Set();
		for (const line of lines) {
			if (/^\s*```/.test(line)) fenced = !fenced;
			const heading = !fenced && line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
			if (!heading) continue;
			const text = heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "");
			const base = text
				.toLowerCase()
				.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
				.replace(/ /g, "-");
			const n = seen.get(base) || 0;
			seen.set(base, n + 1);
			slugs.add(n ? `${base}-${n}` : base);
		}
		const text = lines.filter(line => !/^\s{4}|^\s*```/.test(line)).join("\n");
		const anchors = [...text.matchAll(/\]\(#([^)\s]+)\)/g)].map(m => decodeURIComponent(m[1]));
		assert.ok(anchors.length > 20, `${anchors.length} anchors`);
		assert.deepEqual(
			[...new Set(anchors.filter(anchor => !slugs.has(anchor)))],
			[],
			"anchors with no heading",
		);
	});

	it("deploy without leaving the GitHub token in the checkout", () => {
		const workflow = read(".github/workflows/deploy-theme.yml");
		const deploy = workflow.slice(workflow.indexOf("\n  deploy:"));
		assert.match(deploy, /uses: actions\/checkout@\S+[^\n]*\n\s+with:\n\s+persist-credentials: false\n/);
	});
});
