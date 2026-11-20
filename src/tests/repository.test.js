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

	it("deploy without leaving the GitHub token in the checkout", () => {
		const workflow = read(".github/workflows/deploy-theme.yml");
		const deploy = workflow.slice(workflow.indexOf("\n  deploy:"));
		assert.match(deploy, /uses: actions\/checkout@\S+[^\n]*\n\s+with:\n\s+persist-credentials: false\n/);
	});
});
