// The switches of partials/privacy/controls.hbs (the preferences panel and the « Cookies et
// confidentialité » page share them) and the page's live table of what this browser holds
// (partials/privacy/page.hbs). Every switch reads what is stored each time it is shown, and writes at
// once; other tabs and the rest of the page follow through the events of choices.js, embeds.js, store.js.
import { PROVIDERS } from "../embeds";
import { isMember, readingProgress } from "../store";
import {
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

// A `storage` event from another tab matters here only for a key this theme keeps (or null: clear())
// (the storage probe is written and removed at once: never a change)
const ours = event =>
	event.type !== "storage" ||
	event.key === null ||
	(event.key !== "attibling-probe" && STORAGE.some(entry => entry.key === event.key));

let ids = 0;

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

// What the theme keeps in this browser: the only things « Tout effacer » removes
const themeItems = () => STORAGE.filter(has);

// The page's table also shows, read-only, the keys of other scripts of this origin (Ghost Admin, Portal,
// the owner's own): the theme never removes what it did not write
export const heldItems = () => [
	...themeItems(),
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
	for (const key of keys.filter(k => LISTS.includes(k)))
		window.dispatchEvent(new CustomEvent("attibling:store", { detail: { key } }));
	window.dispatchEvent(new CustomEvent("attibling:privacy", { detail: preferences.get() }));
};

// The members' lists (« À lire plus tard », « Reprendre la lecture »): what clearing would lose for good
const LISTS = STORAGE.filter(entry => entry.audience === "members" && entry.category === "feature").map(e => e.key);

const listLength = key => {
	try {
		const value = JSON.parse(localStorage.getItem(key));
		return Array.isArray(value) ? value.length : 0;
	} catch {
		return 0;
	}
};

// Before clearing `keys`: when a list of the member's would go, ask first (as « Tout retirer » of the
// Favoris page does), saying what would be lost; nothing to ask otherwise
export const confirmClear = (keys, live) => {
	const strings = live?.dataset;
	if (!strings?.confirm) return true;
	const parts = [
		["attibling-saved", strings.confirmSaved],
		["attibling-progress", strings.confirmProgress],
	]
		.filter(([key]) => keys.includes(key))
		.map(([key, text]) => [listLength(key), text])
		.filter(([n]) => n > 0)
		// (« Un article » inside the sentence: « un article »)
		.map(([n, text]) =>
			text.replace(
				"%",
				n === 1
					? strings.onePost.replace(/^\p{Lu}(?!\p{Lu})/u, c => c.toLowerCase())
					: strings.manyPosts.replace("%", n),
			),
		);
	if (!parts.length) return true;
	let lists = parts.join(", ");
	try {
		lists = new Intl.ListFormat(document.documentElement.lang || undefined, { type: "conjunction" }).format(parts);
	} catch {
		// a language tag the browser does not know: the plain list
	}
	return window.confirm(strings.confirm.replace("{lists}", lists));
};

const liveOf = root => root.querySelector("[data-privacy-live]") || document.querySelector("[data-privacy-live]");

export const clearItem = (entry, live) => {
	if (!confirmClear([entry.key], live)) return false;
	removeItem(entry);
	afterClear([entry.key]);
	return true;
};

export const clearAll = live => {
	const items = themeItems();
	if (
		!confirmClear(
			items.map(entry => entry.key),
			live,
		)
	)
		return false;
	items.forEach(removeItem);
	afterClear(items.map(entry => entry.key));
	return true;
};

const announcer = root => {
	const live = liveOf(root);
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

	// Consent (fallback mode only): « Services facultatifs », the kinds of the owner's gated scripts —
	// only those the site added on this page, or the reader already accepted; and in « Contenus
	// intégrés », the switch for all of them, first
	const asking = consentMode() !== "none";
	const consentGroup = group("consent");
	const categories = [...root.querySelectorAll("[data-consent-category]")];
	if (asking) {
		const present = gatedCategories();
		for (const input of categories) {
			const name = input.dataset.consentCategory;
			input.closest("label").hidden = name !== "embeds" && !present.has(name) && consent.get(name) !== true;
		}
		if (consentGroup)
			consentGroup.hidden = ![...consentGroup.querySelectorAll("[data-consent-category]")].some(
				input => !input.closest("label").hidden,
			);
		// « Tout refuser » / « Tout accepter »: the kinds shown in their group, nothing else
		consentGroup?.querySelectorAll("[data-consent-all]").forEach(button =>
			button.addEventListener("click", () => {
				const shown = [...consentGroup.querySelectorAll("[data-consent-category]")].filter(
					input => !input.closest("label").hidden,
				);
				const value = button.dataset.consentAll === "true";
				consent.set(Object.fromEntries(shown.map(input => [input.dataset.consentCategory, value])));
				announce("saved");
			}),
		);
		for (const input of categories)
			input.addEventListener("change", () => {
				consent.set({ [input.dataset.consentCategory]: input.checked });
				announce(input.checked ? "saved" : "next");
			});
	}

	// Embeds, per service: named by the service alone, in the « Service par service » group
	const list = root.querySelector("[data-privacy-providers]");
	const providers = providersToList(allProviders);
	if (list) {
		list.replaceChildren(...providers.map(provider => switchFor(provider.name, { "data-provider": provider.id })));
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
		if (clearAll(liveOf(root))) announce("cleared");
	});

	// Each switch named by its label alone, its hint read as its description
	root.querySelectorAll(".privacy-switch").forEach(wrap => {
		const input = wrap.querySelector("input");
		const label = wrap.querySelector(".privacy-switch__label");
		const hint = wrap.querySelector(".privacy-switch__hint");
		if (!input || !label || !hint) return;
		label.id ||= `privacy-label-${++ids}`;
		hint.id ||= `privacy-hint-${ids}`;
		input.setAttribute("aria-labelledby", label.id);
		input.setAttribute("aria-describedby", hint.id);
	});

	const refresh = () => {
		if (asking) {
			const current = consent.current();
			for (const input of categories) input.checked = current[input.dataset.consentCategory] === true;
			// Said once, in the first group shown
			const signal = privacySignal() && !consent.record();
			const notes = [...root.querySelectorAll("[data-consent-signal]")];
			const first = notes.find(note => !note.closest("[data-privacy-group]")?.hidden);
			notes.forEach(note => (note.hidden = !signal || note !== first));
		}
		// Each service as it really behaves: its own choice, else the « Contenus intégrés » answer
		list
			?.querySelectorAll("[data-provider]")
			.forEach(input => (input.checked = embeds.allowed(input.dataset.provider)));
		if (plausibleToggle) plausibleToggle.checked = plausible.counted();
		if (progressToggle) progressToggle.checked = preferences.get().progress;
		if (count) {
			const n = themeItems().length;
			count.textContent =
				n === 0 ? count.dataset.none : n === 1 ? count.dataset.one : count.dataset.many.replace("%", n);
		}
		root.dispatchEvent(new CustomEvent("privacy:refresh"));
	};
	EVENTS.forEach(name =>
		window.addEventListener(name, event => {
			if (ours(event)) refresh();
		}),
	);
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
	const liveElement = liveOf(table.closest("[data-privacy-page]") || document);

	// Read as stacked rows on phones (pages/content.css): each cell names its column
	const decorate = row => {
		row.setAttribute("role", "row");
		[...row.cells].forEach((cell, i) => {
			cell.setAttribute("role", "cell");
			if (i > 0 && i < 3) cell.dataset.label = headers[i];
		});
		return row;
	};

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
			row.append(name, purpose, value, action);
			if (entry.by === "other") return decorate(row);
			const button = document.createElement("button");
			button.type = "button";
			button.className = "privacy-stored__clear";
			button.textContent = strings.clear;
			button.setAttribute("aria-label", strings.clearOne.replace("%", entry.key));
			button.addEventListener("click", () => {
				const index = [...body.querySelectorAll(".privacy-stored__clear")].indexOf(button);
				if (!clearItem(entry, liveElement)) return;
				// The list is drawn again at once (the clear's events): the focus moves now, never left on
				// <body> — the next row's button (the one now at that place), else the last, else the note
				render();
				const buttons = body.querySelectorAll(".privacy-stored__clear");
				(buttons[index] || buttons[buttons.length - 1] || empty || table).focus({ preventScroll: true });
				live("removed");
			});
			action.append(button);
			return decorate(row);
		});
		body.replaceChildren(...rows);
		table.hidden = rows.length === 0;
		if (empty) empty.hidden = rows.length > 0;
		if (clear) clear.hidden = !body.querySelector(".privacy-stored__clear");
	};

	clear?.addEventListener("click", () => {
		if (!clearAll(liveElement)) return;
		render();
		// Nothing left: the note; only other scripts' keys left: the table
		if (empty && !empty.hidden) empty.focus({ preventScroll: true });
		else {
			table.tabIndex = -1;
			table.focus({ preventScroll: true });
		}
		live("cleared");
	});
	EVENTS.forEach(name =>
		window.addEventListener(name, event => {
			if (ours(event)) render();
		}),
	);
	render();
	return { render };
};
