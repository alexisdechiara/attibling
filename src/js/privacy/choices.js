// The reader's privacy choices, kept in this browser only (nothing is sent to the site). Small on
// purpose: app.js and store.js load it on every page; the panel and the notice are separate chunks.
//
//   preferences        "attibling-privacy" { progress: false } when the member turned off « Reprendre la
//                      lecture » (default on: nothing is stored until they turn it off)
//   consent            "attibling-consent" { analytics, embeds, other, at } — only in the fallback consent
//                      mode (theme setting consent_notice ≠ None), for scripts the site owner gates;
//                      re-asked after 6 months (CNIL recommendation 2020-092, § 39)
//   privacySignal()    Global Privacy Control / Do Not Track: taken as a refusal until the reader says
//                      otherwise in the panel
//   activateGated()    runs the owner's gated scripts (<script type="text/plain" data-consent="analytics">,
//                      <template data-consent="other">) whose category was accepted
//
// Events on window: "attibling:privacy" (preferences changed), "attibling:consent" (detail: the choices).
export const PRIVACY_KEY = "attibling-privacy";
export const CONSENT_KEY = "attibling-consent";
export const CATEGORIES = ["analytics", "embeds", "other"];
// Six months, then the question is asked again (the choice is then forgotten)
export const CONSENT_MAX_AGE = 183 * 24 * 60 * 60 * 1000;

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

export const consent = {
	// The stored choice, or null when there is none or it is older than six months
	record() {
		const record = readJSON(CONSENT_KEY);
		const now = Date.now();
		if (!record || typeof record.at !== "number" || now - record.at > CONSENT_MAX_AGE || record.at > now + 864e5)
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
	// The reader decided (a stored choice, or the browser's signal): nothing to ask
	decided: () => consentMode() === "none" || Boolean(consent.record()) || privacySignal(),
	set(choices) {
		const record = Object.fromEntries(CATEGORIES.map(name => [name, choices[name] === true]));
		writeJSON(CONSENT_KEY, { ...record, at: Date.now() });
		emit("attibling:consent", record);
		activateGated();
	},
	all: value => consent.set(Object.fromEntries(CATEGORIES.map(name => [name, value]))),
	current: () => Object.fromEntries(CATEGORIES.map(name => [name, consent.get(name)])),
};

// Categories the page's gated elements belong to (to say what the notice is about)
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
