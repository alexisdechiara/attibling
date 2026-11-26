// The reader's privacy choices, kept in this browser only (nothing is sent to the site). Small on
// purpose: app.js and store.js load it on every page; the panel and the notice are separate chunks.
//
//   preferences        "attibling-privacy" { progress: false } when the member turned off « Reprendre la
//                      lecture » (default on: nothing is stored until they turn it off)
//   consent            "attibling-consent" { analytics, embeds, other, v, at } — the answers per kind
//                      (theme setting consent_notice: Notice by default, Banner; None: never asked). The
//                      notice asks for the kinds of the scripts the site owner gates, each embed's facade
//                      for « embeds », the panel for any; a kind not answered yet is absent. Asked again
//                      after 6 months (CNIL recommendation 2020-092, § 39)
//   embeds             "attibling-embeds" { youtube: true, x: false } — per service, what overrides the
//                      « Contenus intégrés » answer: true = shown without a click (« Toujours afficher »),
//                      false = kept behind its facade although the category was accepted. One truth:
//                      embeds.allowed(id) = the service's own choice, else the category's answer.
//                      Answering the category drops the entries that disagree (all services follow).
//   privacySignal()    Global Privacy Control / Do Not Track: taken as a refusal until the reader says
//                      otherwise in the panel
//   activateGated()    runs the owner's gated scripts (<script type="text/plain" data-consent="analytics">,
//                      <template data-consent="other">) whose category was accepted
//
// Events on window: "attibling:privacy" (preferences changed), "attibling:consent" (detail: the choices),
// "attibling:embeds" (per-service choices changed).
export const PRIVACY_KEY = "attibling-privacy";
export const CONSENT_KEY = "attibling-consent";
export const EMBEDS_KEY = "attibling-embeds";
export const CATEGORIES = ["analytics", "embeds", "other"];
// Six months, then the question is asked again (the choice is then forgotten)
export const CONSENT_MAX_AGE = 183 * 24 * 60 * 60 * 1000;
// The version of the question: an answer given to another version (other kinds of services) is asked again
export const CONSENT_VERSION = 1;

const readJSON = key => {
	try {
		const value = JSON.parse(localStorage.getItem(key));
		return value && typeof value === "object" && !Array.isArray(value) ? value : null;
	} catch {
		return null;
	}
};

const writeJSON = (key, value) => {
	try {
		if (value) localStorage.setItem(key, JSON.stringify(value));
		else localStorage.removeItem(key);
		return true;
	} catch {
		return false; // blocked storage: the choice lasts for this page only
	}
};

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

// --- Preferences (no consent needed: they only switch features off) ---------------------------------
export const preferences = {
	get: () => ({ progress: readJSON(PRIVACY_KEY)?.progress !== false }),
	set(name, value) {
		const next = { ...readJSON(PRIVACY_KEY), [name]: value };
		// Only what differs from the defaults is kept
		if (next.progress !== false) delete next.progress;
		writeJSON(PRIVACY_KEY, Object.keys(next).length ? next : null);
		emit("attibling:privacy", preferences.get());
	},
};

export const progressEnabled = () => preferences.get().progress;

// --- Fallback consent mode ---------------------------------------------------------------------------
// <html data-consent="notice|banner"> (default.hbs, from the theme setting); none without it
export const consentMode = () => document.documentElement.dataset.consent || "none";

export const privacySignal = () =>
	navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";

const categoryOf = el => (CATEGORIES.includes(el.dataset.consent) ? el.dataset.consent : "other");

const GATED = 'script[type="text/plain"][data-consent], template[data-consent]';

// The last answer, when the browser refused to keep it (storage blocked): valid for this page only
let unsaved = null;

export const consent = {
	// The stored choice, or null when there is none or it is older than six months
	record() {
		// Storage blocked (the answer could not be written): the answer given on this page still holds
		const record = readJSON(CONSENT_KEY) || unsaved;
		const now = Date.now();
		if (
			!record ||
			record.v !== CONSENT_VERSION ||
			typeof record.at !== "number" ||
			now - record.at > CONSENT_MAX_AGE ||
			record.at > now + 864e5
		)
			return null;
		return record;
	},
	// true (accepted), false (refused, or GPC / DNT without a stored choice), null (not asked yet)
	get(category) {
		if (consentMode() === "none") return false;
		const record = consent.record();
		if (record) return record[category] === true;
		return privacySignal() ? false : null;
	},
	// Whether the reader answered for this kind (a stored answer; the browser's signal is not one)
	answered: category => typeof consent.record()?.[category] === "boolean",
	// The kinds among `categories` still waiting for an answer: none without the fallback mode, nor when
	// the browser's signal stands for a refusal
	pending(categories) {
		if (consentMode() === "none" || (!consent.record() && privacySignal())) return [];
		return [...categories].filter(name => !consent.answered(name));
	},
	// Saves the answers given (true / false) for some kinds and keeps the earlier answers for the others
	set(choices) {
		const earlier = consent.record() || {};
		const record = {};
		for (const name of CATEGORIES) {
			if (typeof choices[name] === "boolean") record[name] = choices[name];
			else if (typeof earlier[name] === "boolean") record[name] = earlier[name];
		}
		const full = { ...record, v: CONSENT_VERSION, at: Date.now() };
		unsaved = writeJSON(CONSENT_KEY, full) ? null : full;
		// « Contenus intégrés » answered: every service follows (accepted: those turned off come back on;
		// refused: those shown without a click go back behind their facade)
		if (typeof choices.embeds === "boolean") embeds.drop(!choices.embeds);
		emit("attibling:consent", Object.fromEntries(CATEGORIES.map(name => [name, record[name] === true])));
		activateGated();
	},
	all: value => consent.set(Object.fromEntries(CATEGORIES.map(name => [name, value]))),
	// Accepts one kind, keeps the answers for the others (« Accepter et afficher » under an embed)
	grant: category => consent.set({ [category]: true }),
	current: () => Object.fromEntries(CATEGORIES.map(name => [name, consent.get(name)])),
};

// --- Embeds, per service ---------------------------------------------------------------------------
const readEmbeds = () => {
	try {
		const value = JSON.parse(localStorage.getItem(EMBEDS_KEY));
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};
		return Object.fromEntries(Object.entries(value).filter(([, on]) => typeof on === "boolean"));
	} catch {
		return {};
	}
};

const writeEmbeds = choices => {
	writeJSON(EMBEDS_KEY, Object.keys(choices).length ? choices : null);
	emit("attibling:embeds", choices);
};

export const embeds = {
	// { id: true | false }: the services the reader chose one by one
	choices: readEmbeds,
	// Shown without a click: the service's own choice, else the « Contenus intégrés » answer
	allowed(id) {
		const own = readEmbeds()[id];
		return typeof own === "boolean" ? own : consent.get("embeds") === true;
	},
	set(id, on) {
		writeEmbeds({ ...readEmbeds(), [id]: Boolean(on) });
	},
	// Removes the entries whose value is `value` (accepting the category drops the « off » ones)
	drop(value) {
		const choices = readEmbeds();
		const kept = Object.fromEntries(Object.entries(choices).filter(([, on]) => on !== value));
		if (Object.keys(kept).length !== Object.keys(choices).length) writeEmbeds(kept);
	},
};

// The kinds of the owner's gated scripts on this page (data-consent): what the consent notice asks
// about. Embeds are not among them: each embed held behind its facade asks for itself (src/js/embeds.js).
export const gatedCategories = (root = document) => new Set([...root.querySelectorAll(GATED)].map(categoryOf));

let warned = false;

export const activateGated = (root = document) => {
	const gated = [...root.querySelectorAll(GATED)].filter(el => !el.hasAttribute("data-consent-done"));
	if (!gated.length) return;
	if (consentMode() === "none") {
		if (!warned) {
			warned = true;
			console.warn(
				"attibling: scripts wait for consent (data-consent) but the theme setting « Consent notice » is None: they will not run. See docs/guide-auteur.md, « Cookies et confidentialité ».",
			);
		}
		return;
	}
	for (const el of gated) {
		if (consent.get(categoryOf(el)) !== true) continue;
		el.setAttribute("data-consent-done", "");
		if (el.tagName === "TEMPLATE") {
			el.after(document.importNode(el.content, true));
			continue;
		}
		const script = document.createElement("script");
		for (const { name, value } of el.attributes) {
			if (!["type", "data-consent", "data-consent-done", "data-type"].includes(name)) script.setAttribute(name, value);
		}
		if (el.dataset.type) script.type = el.dataset.type;
		// Inserted scripts are async by default: keep the order of the page unless it asked for async
		if (!el.hasAttribute("async")) script.async = false;
		script.textContent = el.textContent;
		el.after(script);
	}
};

// --- Google Consent Mode v2 ------------------------------------------------------------------------
// Only when the page holds a Google tag (gtag.js, Tag Manager, AdSense; gated with data-consent or not):
// the default state, all denied except the storage that keeps the site working and secure, then an
// update from the reader's answer — at once when it is known, and on every change. « Basic » consent
// mode: the owner gates the tag itself (data-consent), so it only loads after the answer, and the
// default + update come first (https://developers.google.com/tag-platform/security/guides/consent).
// Categories: analytics → analytics_storage; other (advertising…) → ad_storage, ad_user_data,
// ad_personalization, personalization_storage. Nothing Google-related without a Google tag.
const GOOGLE = /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|\bgtag\(/;

export const googleTagOnPage = () =>
	[...document.querySelectorAll("script")].some(
		s => GOOGLE.test(s.getAttribute("src") || "") || (s.type === "text/plain" && GOOGLE.test(s.textContent)),
	);

const gtag = (...args) => {
	window.dataLayer = window.dataLayer || [];
	// gtag.js reads the arguments object as its own snippet pushes it
	if (typeof window.gtag !== "function")
		window.gtag = function () {
			// eslint-disable-next-line prefer-rest-params
			window.dataLayer.push(arguments);
		};
	window.gtag(...args);
};

const granted = on => (on ? "granted" : "denied");

export const googleState = choices => ({
	analytics_storage: granted(choices.analytics === true),
	ad_storage: granted(choices.other === true),
	ad_user_data: granted(choices.other === true),
	ad_personalization: granted(choices.other === true),
	personalization_storage: granted(choices.other === true),
});

export const setUpGoogleConsent = () => {
	if (consentMode() === "none" || !googleTagOnPage()) return false;
	gtag("consent", "default", {
		...googleState({}),
		functionality_storage: "granted",
		security_storage: "granted",
		wait_for_update: 500,
	});
	gtag("set", "ads_data_redaction", true);
	const record = consent.record();
	if (record) gtag("consent", "update", googleState(record));
	window.addEventListener("attibling:consent", event => gtag("consent", "update", googleState(event.detail)));
	return true;
};

// --- Plausible (cookie-free audience measurement): its own opt-out flag -----------------------------
// The script ignores the visits of a browser where localStorage.plausible_ignore is "true"
// (https://plausible.io/docs/excluding-localstorage). The theme only offers the switch.
export const PLAUSIBLE_KEY = "plausible_ignore";

export const plausibleOnPage = () =>
	typeof window.plausible === "function" ||
	[...document.querySelectorAll("script[src]")].some(s =>
		/\/js\/(script|plausible|pa-)[\w.-]*\.js(\?|$)/.test(s.getAttribute("src")),
	);

export const plausible = {
	counted() {
		try {
			return localStorage.getItem(PLAUSIBLE_KEY) !== "true";
		} catch {
			return true;
		}
	},
	count(on) {
		try {
			if (on) localStorage.removeItem(PLAUSIBLE_KEY);
			else localStorage.setItem(PLAUSIBLE_KEY, "true");
		} catch {
			// storage blocked
		}
		emit("attibling:privacy", preferences.get());
	},
};
