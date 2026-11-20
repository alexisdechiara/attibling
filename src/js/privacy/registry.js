// Everything this site can keep in the reader's browser storage (localStorage, sessionStorage): the
// single source of truth for the « Cookies et confidentialité » page (partials/privacy/stored.hbs renders
// one row per key, src/js/privacy/controls.js reads it to list what this browser holds), the author
// guide's table (docs/guide-auteur.md, « Ce que le thème garde dans le navigateur ») and the test that
// keeps all of them in step with the code (src/tests/privacy.test.js): a storage key the theme's code
// uses must be declared here, with its row in the partial and in the guide.
//
//   key        the storage key
//   storage    "local" (localStorage: stays until cleared) | "session" (sessionStorage: the tab's session)
//   by         "theme" (written by this theme's code) | "ghost" (Ghost's own scripts: Portal, members)
//   audience   "all" | "visitors" | "members"
//   category   "preference"  interface choice the reader made (theme, display settings…)
//              "feature"     part of a feature the reader uses (lists, progress, animation played once)
//              "choice"      the reader's privacy choices themselves
//              "attribution" Ghost's member source attribution (not needed by the reader: see the guide)
//   lifetime   "until-cleared" | "session" | "six-months" (re-asked after 6 months) | "none" (removed at once)
//
// Cookies are not listed here: the theme sets none. Ghost's sign-in cookie (ghost-members-ssr and its
// .sig) is HttpOnly, out of reach of scripts; the page describes it in a sentence.
export const STORAGE = [
	{ key: "theme", storage: "local", by: "theme", audience: "all", category: "preference", lifetime: "until-cleared" },
	{
		key: "attibling-promo-closed",
		storage: "local",
		by: "theme",
		audience: "visitors",
		category: "preference",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-intro",
		storage: "session",
		by: "theme",
		audience: "all",
		category: "feature",
		lifetime: "session",
	},
	{
		key: "attibling-hero-cue",
		storage: "session",
		by: "theme",
		audience: "all",
		category: "feature",
		lifetime: "session",
	},
	{
		key: "attibling-embeds",
		storage: "local",
		by: "theme",
		audience: "all",
		category: "choice",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-privacy",
		storage: "local",
		by: "theme",
		audience: "members",
		category: "choice",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-consent",
		storage: "local",
		by: "theme",
		audience: "all",
		category: "choice",
		lifetime: "six-months",
	},
	{
		key: "plausible_ignore",
		storage: "local",
		by: "theme",
		audience: "all",
		category: "choice",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-reading",
		storage: "local",
		by: "theme",
		audience: "members",
		category: "preference",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-saved",
		storage: "local",
		by: "theme",
		audience: "members",
		category: "feature",
		lifetime: "until-cleared",
	},
	{
		key: "attibling-progress",
		storage: "local",
		by: "theme",
		audience: "members",
		category: "feature",
		lifetime: "until-cleared",
	},
	{ key: "attibling-probe", storage: "local", by: "theme", audience: "members", category: "feature", lifetime: "none" },
	{
		key: "ghost-history",
		storage: "session",
		by: "ghost",
		audience: "all",
		category: "attribution",
		lifetime: "session",
	},
	{
		key: "ghost-portal-gift-form-state",
		storage: "session",
		by: "ghost",
		audience: "all",
		category: "feature",
		lifetime: "session",
	},
	{
		key: "ghost-recommendations-clicked",
		storage: "local",
		by: "ghost",
		audience: "all",
		category: "feature",
		lifetime: "until-cleared",
	},
];

export const storageOf = entry => {
	try {
		return entry.storage === "session" ? window.sessionStorage : window.localStorage;
	} catch {
		return null;
	}
};
