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

	it("uses « tag » (never « rubrique ») and keeps « thème » for the Ghost theme only", () => {
		for (const file of ["locales/fr.json", "locales/fr-informal.json"]) {
			const locale = JSON.parse(read(file));
			assert.deepEqual(
				Object.entries(locale)
					.filter(([, value]) => /rubriques?/i.test(value))
					.map(([key]) => key),
				[],
				`${file}: « rubrique »`,
			);
			assert.deepEqual(
				Object.entries(locale)
					.filter(([, value]) => /thème/i.test(value.replace(/\b(le|du|ce) thème/gi, "")))
					.map(([key]) => key),
				[],
				`${file}: « thème » for something other than the Ghost theme`,
			);
			assert.deepEqual(
				["Palette", "Switch mode", "Light mode", "Dark mode", "Automatic mode"].map(key => locale[key]),
				["Palette", "Changer de mode", "Mode clair", "Mode sombre", "Mode automatique"],
				file,
			);
		}
		const english = JSON.parse(read("locales/en.json"));
		assert.deepEqual(
			Object.keys(english).filter(key => /^(Section|Sections|All sections|See the section|Theme)$/.test(key)),
			[],
			"the old « Section » and « Theme » keys are gone",
		);
	});

	// One name for the members' list of posts set aside with the bookmark: « À lire plus tard » (owner's
	// choice), on its page, its buttons, its messages and in the documentation. It used to be « Mes favoris »,
	// « Enregistré », « articles enregistrés »… Only the address of the page keeps the old word: /favoris/.
	it("calls the members' list « À lire plus tard » everywhere, never « favoris »", () => {
		for (const file of ["locales/fr.json", "locales/fr-informal.json"]) {
			const locale = JSON.parse(read(file));
			assert.deepEqual(
				Object.entries(locale)
					.filter(([, value]) => /favori|articles? enregistrés?|^enregistrée?s?$/i.test(value))
					.map(([key]) => key),
				[],
				`${file}: another name for « À lire plus tard »`,
			);
			assert.deepEqual(
				["Read later", "In Read later", "Read later: {title}", "“Read later”"].map(key => locale[key]),
				["À lire plus tard", "Dans À lire plus tard", "À lire plus tard : {title}", "« À lire plus tard »"],
				file,
			);
		}
		assert.deepEqual(
			Object.keys(JSON.parse(read("locales/en.json"))).filter(key => /saved posts?|^saved$|favou?rite/i.test(key)),
			[],
			"English: « Read later »",
		);
		const templates = dir =>
			fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap(entry => {
				const file = path.join(dir, entry.name);
				if (entry.isDirectory()) return templates(file);
				return entry.name.endsWith(".hbs") ? [file] : [];
			});
		const files = [
			...fs.readdirSync(REPO_ROOT).filter(file => file.endsWith(".hbs")),
			...templates("partials"),
			"README.md",
			"docs/guide-auteur.md",
			"docs/cookies-proposition.md",
		];
		assert.ok(files.includes("page-favoris.hbs") && files.includes(path.join("partials", "pages", "saved.hbs")));
		// The slug and its template are the only « favoris » left
		const address = /\/favoris\/|`favoris`|"favoris"|page-favoris/g;
		assert.deepEqual(
			files.filter(file => /favoris?/i.test(read(file).replace(address, ""))),
			[],
			"« favoris » as a name of the list",
		);
		assert.match(read("partials/home/member-lists.hbs"), /href="\{\{@site\.url\}\}\/favoris\/"/, "the address stays");
		assert.match(read("docs/guide-auteur.md"), /`favoris` \(titre « À lire plus tard »\)/);
	});

	it("keeps « vous » in fr.json and « tu » in fr-informal.json", () => {
		const informal = JSON.parse(read("locales/fr-informal.json"));
		const formal = JSON.parse(read("locales/fr.json"));
		// Words in -ez that are not a « vous » form
		const allowed = new Set(["chez", "assez", "nez", "rez", "lez"]);
		const vous = ([, value]) =>
			/\b(vous|votre|vos)\b/i.test(value) ||
			(value.match(/\b[\p{L}]+ez\b/giu) || []).some(word => !allowed.has(word.toLowerCase()));
		assert.deepEqual(
			Object.entries(informal)
				.filter(vous)
				.map(([key]) => key),
			[],
			"« vous » in fr-informal.json",
		);
		const tu = ([, value]) => /(^|[^\p{L}-])(tu|ton|ta|tes|toi)(?![\p{L}-])/iu.test(value);
		assert.deepEqual(
			Object.entries(formal)
				.filter(tu)
				.map(([key]) => key),
			[],
			"« tu » in fr.json",
		);
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
