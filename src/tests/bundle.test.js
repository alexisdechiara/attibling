const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { REPO_ROOT } = require("./support/harness");

describe("built bundles", () => {
	it("do not ship jQuery", () => {
		for (const file of ["vendor.js", "app.js", "post.js", "page.js", "home.js", "helpers.js"]) {
			const source = fs.readFileSync(path.join(REPO_ROOT, "assets", "js", file), "utf8");
			assert.equal(source.includes("jQuery"), false, `${file} contains jQuery`);
		}
	});
});
