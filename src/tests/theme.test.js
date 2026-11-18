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

	it("keeps an explicit choice when the system scheme changes", async () => {
		const dark = await open({ colorScheme: "light", storage: { theme: "dark" } });
		await dark.page.emulateMedia({ colorScheme: "dark" });
		await dark.page.emulateMedia({ colorScheme: "light" });
		await dark.page.waitForTimeout(50);
		assert.deepEqual(await themeState(dark.page), { theme: "dark", stored: "dark", icons: ["dark"] });
		await dark.dispose();

		const light = await open({ colorScheme: "light", storage: { theme: "light" } });
		await light.page.emulateMedia({ colorScheme: "dark" });
		await light.page.waitForTimeout(50);
		assert.deepEqual(await themeState(light.page), { theme: "light", stored: "light", icons: ["light"] });
		await light.dispose();
	});

	it("follows system scheme changes when the choice is auto or absent", async () => {
		const auto = await open({ colorScheme: "light", storage: { theme: "auto" } });
		await auto.page.emulateMedia({ colorScheme: "dark" });
		assert.equal(await waitFor(async () => (await themeState(auto.page)).theme === "dark"), true);
		assert.equal((await themeState(auto.page)).stored, "auto");
		await auto.dispose();

		const absent = await open({ colorScheme: "dark" });
		await absent.page.emulateMedia({ colorScheme: "light" });
		assert.equal(await waitFor(async () => (await themeState(absent.page)).theme === "light"), true);
		await absent.dispose();
	});

	it("does not rewrite localStorage when applying the stored theme on load", async () => {
		for (const theme of ["light", "dark", "auto"]) {
			const { storageWrites, dispose } = await open({ storage: { theme } });
			const writes = (await storageWrites()).filter(([key]) => key === "theme");
			assert.deepEqual(writes, [], `stored "${theme}" was rewritten`);
			await dispose();
		}
	});
});
