// The switches of partials/privacy/controls.hbs (the preferences panel and the « Cookies et
// confidentialité » page share them) and the page's live table of what this browser holds
// (partials/privacy/page.hbs). Every switch reads what is stored each time it is shown, and writes at
// once; other tabs and the rest of the page follow through the events of choices.js, embeds.js, store.js.
import { PROVIDERS } from "../embeds";
import { isMember, readingProgress } from "../store";
import {
	CATEGORIES,
	consent,
	consentMode,
	embeds,
	gatedCategories,
	plausible,
	plausibleOnPage,
	preferences,
	privacySignal,
} from "./choices";
import { STORAGE, storageOf } from "./registry";

const EVENTS = ["attibling:privacy", "attibling:consent", "attibling:embeds", "attibling:store", "storage"];

const has = entry => {
	try {
		return storageOf(entry)?.getItem(entry.key) != null;
	} catch {
		return false;
	}
};

// localStorage keys of this site that the registry does not describe (added by other scripts)
const unknownKeys = () => {
	try {
		const known = new Set(STORAGE.map(entry => entry.key));
		return Object.keys(localStorage).filter(key => !known.has(key));
	} catch {
		return [];
	}
};

export const heldItems = () => [
	...STORAGE.filter(has),
	...unknownKeys().map(key => ({ key, storage: "local", by: "other" })),
];

const removeItem = entry => {
	try {
		storageOf(entry)?.removeItem(entry.key);
	} catch {
		// storage blocked: nothing was kept anyway
	}
};

// What a cleared key changes on this page at once: the theme follows the system again, the lists empty
const afterClear = keys => {
	if (keys.includes("theme")) {
		const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
		document.querySelectorAll("[data-theme-state]").forEach(icon => (icon.hidden = icon.dataset.themeState !== "auto"));
	}
	for (const key of keys.filter(k => ["attibling-saved", "attibling-progress"].includes(k)))
		window.dispatchEvent(new CustomEvent("attibling:store", { detail: { key } }));
	window.dispatchEvent(new CustomEvent("attibling:privacy", { detail: preferences.get() }));
};

export const clearItem = entry => {
	removeItem(entry);
	afterClear([entry.key]);
};

export const clearAll = () => {
	const items = heldItems();
	items.forEach(removeItem);
	afterClear(items.map(entry => entry.key));
};

const announcer = root => {
	const live = root.querySelector("[data-privacy-live]") || document.querySelector("[data-privacy-live]");
	return name => {
		if (!live) return;
		live.textContent = "";
		requestAnimationFrame(() => (live.textContent = live.dataset[name] || name));
	};
};

const switchFor = (label, attributes) => {
	const wrap = document.createElement("label");
	wrap.className = "privacy-switch";
	const text = document.createElement("span");
	text.className = "privacy-switch__text";
	const name = document.createElement("span");
	name.className = "privacy-switch__label";
	name.textContent = label;
	text.append(name);
	const input = document.createElement("input");
	input.type = "checkbox";
	input.setAttribute("role", "switch");
	for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, value);
	wrap.append(text, input);
	return wrap;
};

// Services to list: all of them on the page « Cookies et confidentialité »; in the panel, those with an
// embed on this page and those already shown without a click
const providersToList = all => {
	const byId = new Map(PROVIDERS.map(p => [p.id, p]));
	if (all)
		return [
			...PROVIDERS,
			...Object.keys(embeds.choices())
				.filter(id => !byId.has(id))
				.map(id => ({ id, name: id })),
		];
	const ids = new Set([
		...[...document.querySelectorAll("[data-embed-facade][data-provider]")].map(el => el.dataset.provider),
		...[...document.querySelectorAll("iframe[data-embed-frame]")].map(el => el.dataset.embedFrame),
		...Object.keys(embeds.choices()),
	]);
	return [...ids].filter(Boolean).map(id => byId.get(id) || { id, name: id });
};

export const setUpControls = (root, { allProviders = false } = {}) => {
	const announce = announcer(root);
	const group = name => root.querySelector(`[data-privacy-group="${name}"]`);

	// Consent categories (fallback mode only)
	const consentGroup = group("consent");
	if (consentGroup && consentMode() !== "none") {
		consentGroup.hidden = false;
		// « Contenus intégrés » always (embeds may be on any post); the other kinds only where the site
		// added such a script (on this page) or the reader already accepted them
		const present = gatedCategories();
		consentGroup.querySelectorAll("[data-consent-category]").forEach(input => {
			const name = input.dataset.consentCategory;
			input.closest("label").hidden = name !== "embeds" && !present.has(name) && consent.get(name) !== true;
		});
		consentGroup.querySelectorAll("[data-consent-all]").forEach(button =>
			button.addEventListener("click", () => {
				consent.all(button.dataset.consentAll === "true");
				announce("saved");
			}),
		);
		consentGroup.querySelectorAll("[data-consent-category]").forEach(input =>
			input.addEventListener("change", () => {
				const choices = Object.fromEntries(
					CATEGORIES.map(name => [
						name,
						name === input.dataset.consentCategory ? input.checked : consent.get(name) === true,
					]),
				);
				consent.set(choices);
				announce(input.checked ? "saved" : "next");
			}),
		);
	}

	// Embeds, per service
	const list = root.querySelector("[data-privacy-providers]");
	const providers = providersToList(allProviders);
	if (list) {
		list.replaceChildren(
			...providers.map(provider =>
				switchFor(list.dataset.label.replaceAll("{provider}", provider.name), { "data-provider": provider.id }),
			),
		);
		root.querySelector("[data-privacy-providers-empty]").hidden = providers.length > 0;
		list.addEventListener("change", event => {
			const input = event.target.closest("[data-provider]");
			if (!input) return;
			embeds.set(input.dataset.provider, input.checked);
			// On: shown at once on this page; off: from the next page (a loaded embed stays)
			announce(input.checked ? "saved" : "next");
		});
	}

	// Plausible
	const plausibleGroup = group("plausible");
	const plausibleToggle = root.querySelector("[data-plausible-toggle]");
	if (plausibleGroup && plausibleOnPage()) {
		plausibleGroup.hidden = false;
		plausibleToggle.addEventListener("change", () => {
			plausible.count(plausibleToggle.checked);
			announce("saved");
		});
	}

	// Members: « Reprendre la lecture »
	const membersGroup = group("members");
	const progressToggle = root.querySelector("[data-privacy-progress]");
	if (membersGroup && isMember()) {
		membersGroup.hidden = false;
		progressToggle.addEventListener("change", () => {
			// The preference first: clearing the list refreshes the switches, which read it
			preferences.set("progress", progressToggle.checked);
			if (!progressToggle.checked) {
				readingProgress.clear();
				removeItem({ key: "attibling-progress", storage: "local" });
			}
			announce("saved");
		});
	}

	// Data held
	const count = root.querySelector("[data-privacy-count]");
	root.querySelector("[data-privacy-clear]")?.addEventListener("click", () => {
		clearAll();
		announce("cleared");
	});

	const refresh = () => {
		if (!consentGroup?.hidden) {
			const current = consent.current();
			consentGroup.querySelectorAll("[data-consent-category]").forEach(input => {
				input.checked = current[input.dataset.consentCategory] === true;
			});
			const signal = consentGroup.querySelector("[data-consent-signal]");
			if (signal) signal.hidden = !(privacySignal() && !consent.record());
		}
		// Each service as it really behaves: its own choice, else the « Contenus intégrés » answer
		list
			?.querySelectorAll("[data-provider]")
			.forEach(input => (input.checked = embeds.allowed(input.dataset.provider)));
		if (plausibleToggle) plausibleToggle.checked = plausible.counted();
		if (progressToggle) progressToggle.checked = preferences.get().progress;
		if (count) {
			const n = heldItems().length;
			count.textContent =
				n === 0 ? count.dataset.none : n === 1 ? count.dataset.one : count.dataset.many.replace("%", n);
		}
		root.dispatchEvent(new CustomEvent("privacy:refresh"));
	};
	EVENTS.forEach(name => window.addEventListener(name, refresh));
	refresh();
	return { refresh };
};

// --- The page's live table ------------------------------------------------------------------------
// A short, readable account of a stored value: the services of attibling-embeds, the number of items
// of a list, otherwise the value itself (shortened)
const summarize = (raw, strings) => {
	let value = raw;
	try {
		value = JSON.parse(raw);
	} catch {
		// a plain string
	}
	if (Array.isArray(value)) {
		if (value.every(item => typeof item === "string")) return value.join(", ") || strings.empty;
		return value.length === 1 ? strings.one : strings.many.replace("%", value.length);
	}
	// { youtube: true, x: false } (attibling-embeds): « youtube, x (off) »
	const entries = value && typeof value === "object" ? Object.entries(value) : [];
	if (entries.length && entries.every(([, on]) => typeof on === "boolean"))
		return entries.map(([id, on]) => (on ? id : `${id} ${strings.off}`)).join(", ");
	const text = typeof value === "object" && value ? JSON.stringify(value) : String(value);
	return text.length > 60 ? `${text.slice(0, 59)}…` : text;
};

export const setUpStoredTable = table => {
	const body = table.querySelector("tbody");
	const section = table.closest("[data-privacy-stored]") || table.parentElement;
	const empty = section.querySelector("[data-stored-empty]");
	const clear = section.querySelector("[data-stored-clear]");
	const strings = table.dataset;
	const headers = [...table.querySelectorAll("thead th")].map(th => th.textContent.trim());
	const purposeOf = key =>
		document.querySelector(`[data-storage-key="${CSS.escape(key)}"] [data-storage-purpose]`)?.textContent.trim() ||
		strings.unknown;
	const live = announcer(table.closest("[data-privacy-page]") || document);

	const render = () => {
		const rows = heldItems().map(entry => {
			let raw = "";
			try {
				raw = storageOf(entry)?.getItem(entry.key) ?? "";
			} catch {
				// unreadable
			}
			const row = document.createElement("tr");
			row.dataset.heldKey = entry.key;
			const name = document.createElement("td");
			const code = document.createElement("code");
			code.textContent = entry.key;
			name.append(code);
			const purpose = document.createElement("td");
			purpose.textContent = purposeOf(entry.key);
			const value = document.createElement("td");
			value.textContent = summarize(raw, strings);
			const action = document.createElement("td");
			const button = document.createElement("button");
			button.type = "button";
			button.className = "privacy-stored__clear";
			button.textContent = strings.clear;
			button.setAttribute("aria-label", strings.clearOne.replace("%", entry.key));
			button.addEventListener("click", () => {
				clearItem(entry);
				live("removed");
				// Focus stays in the table: the next row's button, else « Tout effacer »
				requestAnimationFrame(() =>
					(body.querySelector(".privacy-stored__clear") || clear || table).focus({ preventScroll: true }),
				);
			});
			action.append(button);
			row.append(name, purpose, value, action);
			// Read as stacked rows on phones (pages/content.css): each cell names its column
			row.setAttribute("role", "row");
			[...row.cells].forEach((cell, i) => {
				cell.setAttribute("role", "cell");
				if (i > 0 && i < 3) cell.dataset.label = headers[i];
			});
			return row;
		});
		body.replaceChildren(...rows);
		table.hidden = rows.length === 0;
		if (empty) empty.hidden = rows.length > 0;
		if (clear) clear.hidden = rows.length === 0;
	};

	clear?.addEventListener("click", () => {
		clearAll();
		live("cleared");
		requestAnimationFrame(() => empty?.focus({ preventScroll: true }));
	});
	EVENTS.forEach(name => window.addEventListener(name, render));
	render();
	return { render };
};
