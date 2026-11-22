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

	it("writes the page and slide counters as whole sentences with their placeholders in all locales", () => {
		const files = fs.readdirSync(path.join(REPO_ROOT, "locales"));
		assert.equal(files.length, 33);
		for (const file of files) {
			const locale = JSON.parse(read(`locales/${file}`));
			assert.match(locale["Page {page} of {pages}"], /\{page\}.*\{pages\}|\{pages\}.*\{page\}/, file);
			assert.match(locale["{n} of {total}"], /\{n\}.*\{total\}|\{total\}.*\{n\}/, file);
			assert.ok(!("of" in locale) && !("Page" in locale), `${file}: the word-by-word keys are gone`);
		}
	});

	it("writes French apostrophes as ’ in the values of fr.json and fr-informal.json", () => {
		for (const file of ["locales/fr.json", "locales/fr-informal.json"]) {
			const straight = Object.entries(JSON.parse(read(file))).filter(([, value]) => value.includes("'"));
			assert.deepEqual(
				straight.map(([key]) => key),
				[],
				file,
			);
		}
	});

	it("keeps « vous » in fr.json and « tu » in fr-informal.json", () => {
		const informal = JSON.parse(read("locales/fr-informal.json"));
		const formal = JSON.parse(read("locales/fr.json"));
		// Words in -ez that are not a « vous » form
		const allowed = new Set(["chez", "assez", "nez", "rez", "lez"]);
		const vous = ([key, value]) =>
			/\b(vous|votre|vos)\b/i.test(value) ||
			(value.match(/\b[\p{L}]+ez\b/giu) || []).some(word => !allowed.has(word.toLowerCase()));
		assert.deepEqual(Object.entries(informal).filter(vous).map(([key]) => key), [], "« vous » in fr-informal.json");
		const tu = ([key, value]) => /(^|[^\p{L}-])(tu|ton|ta|tes|toi)(?![\p{L}-])/iu.test(value);
		assert.deepEqual(Object.entries(formal).filter(tu).map(([key]) => key), [], "« tu » in fr.json");
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
		assert.deepEqual([...new Set(anchors.filter(anchor => !slugs.has(anchor)))], [], "anchors with no heading");
	});

	it("says in the README which translations are complete", () => {
		const english = JSON.parse(read("locales/en.json"));
		// Complete: at most a few values left as the English text (names, « Newsletter »…)
		const complete = fs
			.readdirSync(path.join(REPO_ROOT, "locales"))
			.filter(file => {
				const values = Object.entries(JSON.parse(read(`locales/${file}`)));
				const same = values.filter(([key, value]) => value === english[key]).length;
				return file === "en.json" || same / values.length < 0.2;
			})
			.map(file => file.replace(/\.json$/, ""));
		const readme = read("README.md");
		const claimed = [...(readme.match(/^Complete: (.*)\./m)?.[1] ?? "").matchAll(/`([^`]+)`/g)].map(m => m[1]);
		assert.deepEqual(claimed.sort(), complete.sort());
		assert.doesNotMatch(readme, /\b33 translations\b/);
	});

	it("deploy without leaving the GitHub token in the checkout", () => {
		const workflow = read(".github/workflows/deploy-theme.yml");
		const deploy = workflow.slice(workflow.indexOf("\n  deploy:"));
		assert.match(deploy, /uses: actions\/checkout@\S+[^\n]*\n\s+with:\n\s+persist-credentials: false\n/);
	});
});
