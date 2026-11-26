import { describe, it, beforeAll as before, afterAll as after } from "vite-plus/test";
import assert from "node:assert/strict";
import { launch, close, open, waitFor } from "./support/harness.js";

// The switch in the header bar (desktop); the one of the phone menu sheet follows the same state
const themeState = page =>
	page.evaluate(() => {
		const button = document.querySelector(".site-header__theme");
		return {
			theme: document.documentElement.getAttribute("data-theme"),
			stored: localStorage.getItem("theme"),
			icons: [...button.querySelectorAll("[data-theme-state]")]
				.filter(icon => getComputedStyle(icon).display !== "none")
				.map(icon => icon.dataset.themeState),
		};
	});

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

	it("names the current mode in the button's accessible name", async () => {
		const { page, dispose } = await open({ colorScheme: "light" });
		assert.equal(await page.getByRole("button", { name: "Switch mode Automatic mode" }).count(), 1);
		await page.locator(".site-header__theme").click();
		assert.equal(await page.getByRole("button", { name: "Switch mode Dark mode" }).count(), 1);
		await dispose();
	});

	it("cycles auto -> dark -> light -> auto", async () => {
		const { page, dispose } = await open({ colorScheme: "light" });
		const switcher = page.locator(".site-header__theme");

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

	it("switches the page's colours", async () => {
		const { page, dispose } = await open({ colorScheme: "light" });
		const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		assert.equal(await bg(), "rgb(244, 245, 247)");
		await page.locator(".site-header__theme").click();
		assert.equal(await bg(), "rgb(11, 12, 15)");
		await dispose();
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
