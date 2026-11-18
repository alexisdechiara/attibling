const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch, close, open, waitFor } = require("./support/harness");

const themeState = page =>
	page.evaluate(() => ({
		theme: document.documentElement.getAttribute("data-theme"),
		stored: localStorage.getItem("theme"),
		icons: ["light", "dark", "auto"].filter(
			name => getComputedStyle(document.querySelector(`.${name}-theme-icon`)).display !== "none"
		),
	}));

describe("theme switcher", () => {
	before(launch);
	after(close);

	it("follows the system scheme when nothing is stored", async () => {
		const light = await open({ colorScheme: "light" });
		assert.equal((await themeState(light.page)).theme, "light");
		assert.deepEqual((await themeState(light.page)).icons, ["auto"]);
		await light.dispose();

		const dark = await open({ colorScheme: "dark" });
		assert.equal((await themeState(dark.page)).theme, "dark");
		await dark.dispose();
	});

	it("cycles auto -> dark -> light -> auto", async () => {
		const { page, dispose } = await open({ colorScheme: "light" });
		const switcher = page.locator(".js-switch-theme");

		await switcher.click();
		assert.deepEqual(await themeState(page), { theme: "dark", stored: "dark", icons: ["dark"] });

		await switcher.click();
		assert.deepEqual(await themeState(page), { theme: "light", stored: "light", icons: ["light"] });

		await switcher.click();
		assert.deepEqual(await themeState(page), { theme: "light", stored: "auto", icons: ["auto"] });

		await switcher.click();
		assert.deepEqual(await themeState(page), { theme: "dark", stored: "dark", icons: ["dark"] });

		await dispose();
	});

	it("applies the stored theme on load", async () => {
		const dark = await open({ colorScheme: "light", storage: { theme: "dark" } });
		assert.deepEqual(await themeState(dark.page), { theme: "dark", stored: "dark", icons: ["dark"] });
		await dark.dispose();

		const light = await open({ colorScheme: "dark", storage: { theme: "light" } });
		assert.deepEqual(await themeState(light.page), { theme: "light", stored: "light", icons: ["light"] });
		await light.dispose();

		const auto = await open({ colorScheme: "dark", storage: { theme: "auto" } });
		assert.deepEqual(await themeState(auto.page), { theme: "dark", stored: "auto", icons: ["auto"] });
		await auto.dispose();
	});
});
