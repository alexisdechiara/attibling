// « Réglages d'affichage » (members, article pages): the panel of partials/article/reading-settings.hbs,
// opened by the gear button of the header (a popover on wide screens, a bottom sheet on phones).
//
// The choices are kept in localStorage "attibling-reading" as { name: value }, only those that differ
// from the defaults, and written on <html> as data-reading-<name>="<value>" (reading.css). The
// pre-paint script of default.hbs applies them before the first paint on the next pages, with the
// chosen fonts (fonts.bunny.net, as Ghost's custom fonts). « Réinitialiser » clears everything.
import { isAvailable, readingProgress } from "./store";
import { preferences } from "./privacy/choices";
import { containFocus } from "./helpers";

export const KEY = "attibling-reading";
export const NAMES = [
	"theme",
	"heading",
	"body",
	"width",
	"size",
	"leading",
	"align",
	"links",
	"cover",
	"style",
	"summary",
];
const VALUE = /^[a-z0-9-]+$/;
// Families requested from fonts.bunny.net (the pre-paint script asks for the same ones)
const FONT_WEIGHTS = { heading: ":400,700", body: ":400,400i,700" };
const root = document.documentElement;

// Defaults: some depend on the page (the post's style) and the screen (alignment)
export const defaults = article => {
	const style = article?.dataset.style === "immersive" ? "immersive" : "card";
	return {
		theme: "geekly",
		heading: "default",
		body: "default",
		width: null, // depends on the style in force (Carte: m, Immersif: l)
		size: "m",
		leading: "normal",
		align: window.matchMedia("(width >= 48rem)").matches ? "justify" : "start",
		links: "color",
		cover: "show",
		style,
		summary: "show",
	};
};

export const read = () => {
	try {
		const value = JSON.parse(localStorage.getItem(KEY) || "{}");
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};
		return Object.fromEntries(
			Object.entries(value).filter(([name, v]) => NAMES.includes(name) && typeof v === "string" && VALUE.test(v)),
		);
	} catch {
		return {};
	}
};

const write = settings => {
	try {
		if (Object.keys(settings).length) localStorage.setItem(KEY, JSON.stringify(settings));
		else localStorage.removeItem(KEY);
	} catch {
		// The choice lasts for this page only
	}
};

const loadFonts = settings => {
	const families = ["heading", "body"]
		.filter(name => settings[name] && settings[name] !== "default")
		.map(name => settings[name] + FONT_WEIGHTS[name]);
	let link = document.querySelector("link[data-reading-fonts]");
	if (!families.length) {
		link?.remove();
		return;
	}
	const href = `https://fonts.bunny.net/css?family=${families.join("|")}&display=swap`;
	if (link?.getAttribute("href") === href) return;
	if (!link) {
		link = document.createElement("link");
		link.rel = "stylesheet";
		link.setAttribute("data-reading-fonts", "");
		document.head.append(link);
	}
	link.href = href;
};

export const apply = settings => {
	NAMES.forEach(name => {
		if (settings[name]) root.setAttribute(`data-reading-${name}`, settings[name]);
		else root.removeAttribute(`data-reading-${name}`);
	});
	loadFonts(settings);
	window.dispatchEvent(new CustomEvent("attibling:reading", { detail: settings }));
};

// The header picture's sizes attribute is written for the post's own style (partials/article/header.hbs,
// the same values): in the other style, chosen here, its box is not the same (the page width in
// « Immersif », 76 % of the card in « Carte »), and the browser would keep a rendition too small or too large
const HEADER_SIZES = {
	immersive: "100vw",
	card: "(max-width: 767px) max(92vw, 711px), (max-width: 1443px) max(70vw, 711px), 1000px",
};
const sizeHeaderPicture = (article, style) => {
	const picture = article?.querySelector("[data-article-image]");
	if (picture && picture.sizes !== HEADER_SIZES[style]) picture.sizes = HEADER_SIZES[style];
};

// Places the panel under the gear where CSS anchor positioning is missing
const place = (button, panel) => {
	if (CSS.supports("position-area: bottom") || window.matchMedia("(width < 48rem)").matches) {
		delete panel.dataset.placed;
		return;
	}
	const box = button.getBoundingClientRect();
	panel.dataset.placed = "";
	panel.style.setProperty("--panel-top", `${box.bottom + 6}px`);
	panel.style.setProperty("--panel-right", `${Math.max(document.documentElement.clientWidth - box.right, 8)}px`);
};

export const setUpReadingSettings = () => {
	const button = document.querySelector("[data-reading-button]");
	const panel = document.querySelector("[data-reading-settings]");
	const form = panel?.querySelector("[data-reading-form]");
	const article = document.querySelector("[data-article]");
	if (!button || !panel || !form || !isAvailable()) {
		button?.remove();
		panel?.remove();
		return;
	}
	button.hidden = false;
	let settings = read();

	// The form shows the settings in force: the saved ones, else the defaults
	const sync = () => {
		const base = defaults(article);
		const style = settings.style || base.style;
		sizeHeaderPicture(article, style);
		const current = { ...base, width: style === "immersive" ? "l" : "m", ...settings };
		NAMES.forEach(name => {
			const field = form.elements[name];
			if (!field) return;
			if (field instanceof HTMLSelectElement) field.value = current[name];
			else
				[...form.querySelectorAll(`input[name="${name}"]`)].forEach(
					input => (input.checked = input.value === current[name]),
				);
		});
	};

	// « Retenir où je m'arrête »: the reading progress of « Reprendre la lecture » (privacy/choices.js)
	const syncProgress = () => {
		const on = preferences.get().progress;
		form.querySelectorAll('input[name="progress"]').forEach(input => (input.checked = (input.value === "on") === on));
	};

	form.addEventListener("change", event => {
		const { name, value } = event.target;
		if (name === "progress") {
			preferences.set("progress", value === "on");
			if (value === "off") readingProgress.clear();
			return;
		}
		if (!NAMES.includes(name) || !VALUE.test(value)) return;
		const base = defaults(article);
		const style = name === "style" ? value : settings.style || base.style;
		const fallback = name === "width" ? (style === "immersive" ? "l" : "m") : base[name];
		if (value === fallback) delete settings[name];
		else settings[name] = value;
		// The width goes back to the default of the new style
		if (name === "style") delete settings.width;
		write(settings);
		apply(settings);
		sync();
	});

	form.addEventListener("submit", event => event.preventDefault());

	panel.querySelector("[data-reading-reset]")?.addEventListener("click", () => {
		settings = {};
		write(settings);
		apply(settings);
		sync();
	});

	// Opening and closing: focus moves into the panel, and back to the gear when it closes. On phones
	// the panel is a bottom sheet over the article: the page is inert while it is open, so focus
	// cannot leave it for the hidden page (a popover beside the page on wide screens stays non-modal).
	const native = Object.hasOwn(HTMLElement.prototype, "popover");
	const isOpen = () => (native ? panel.matches(":popover-open") : panel.classList.contains("is-open"));
	const contain = containFocus(panel);
	const modal = on => {
		const sheet = on && window.matchMedia("(width < 48rem)").matches;
		contain(sheet);
		if (sheet) panel.setAttribute("aria-modal", "true");
		else panel.removeAttribute("aria-modal");
	};
	const opened = () => {
		sync();
		syncProgress();
		place(button, panel);
		button.setAttribute("aria-expanded", "true");
		requestAnimationFrame(() => form.querySelector("select, input:checked")?.focus());
	};
	const closed = () => {
		button.setAttribute("aria-expanded", "false");
		if (panel.contains(document.activeElement) || document.activeElement === document.body) button.focus();
	};

	if (native) {
		// beforetoggle: the page must be released before the browser gives focus back to the gear
		panel.addEventListener("beforetoggle", event => modal(event.newState === "open"));
		panel.addEventListener("toggle", event => (event.newState === "open" ? opened() : closed()));
	} else {
		button.removeAttribute("popovertarget");
		panel.removeAttribute("popover");
		const toggle = open => {
			panel.classList.toggle("is-open", open);
			modal(open);
			if (open) opened();
			else closed();
		};
		button.addEventListener("click", () => toggle(!isOpen()));
		panel.querySelector("[data-reading-close]")?.addEventListener("click", () => toggle(false));
		document.addEventListener("click", event => {
			if (isOpen() && !panel.contains(event.target) && !button.contains(event.target)) toggle(false);
		});
		document.addEventListener("keydown", event => {
			if (event.key === "Escape" && isOpen()) toggle(false);
		});
	}

	// Another tab changed the settings
	window.addEventListener("storage", event => {
		if (event.key !== KEY) return;
		settings = read();
		apply(settings);
		sync();
	});
	window.addEventListener("attibling:privacy", syncProgress);

	sync();
	syncProgress();
};
