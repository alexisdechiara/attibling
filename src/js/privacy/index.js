// Privacy on every page (app.js): nothing is shown on arrival.
//  - « Cookies et confidentialité » in the footer (and « Gérer mes choix » under an embed) opens the
//    preferences panel (panel.js, downloaded on the first click).
//  - The consent notice (theme setting consent_notice: Notice by default, Banner; None: never): only
//    when the page holds an embed behind its facade (YouTube, X…) or a script the site owner gated with
//    data-consent, and the reader has not answered yet, a notice asks (notice.js). « Banner » shows it at
//    once; « Notice » after the reader scrolls a little or after 12 seconds. Accepting loads the embeds
//    and runs the gated scripts (choices.js); refusing leaves each embed's facade as it is.
//  - window.attiblingConsent: a small API for the owner's own code (see docs/guide-auteur.md).
import { activateGated, consent, consentMode, gatedCategories, setUpGoogleConsent } from "./choices";

export const NOTICE_DELAY = 12000;
// Cleared on sign-out: the member's lists, their « Reprendre la lecture » choice, display settings and the
// fingerprint that ties them to the member (default.hbs clears the same keys when another member, or
// nobody, is signed in on the next page: Portal's sign-out, an expired session)
const MEMBER_KEYS = [
	"attibling-saved",
	"attibling-progress",
	"attibling-privacy",
	"attibling-reading",
	"attibling-member",
];

const openPanel = () => import("./panel").then(({ openPanel: open }) => open());

const showNotice = () => import("./notice").then(({ showNotice: show }) => show({ openPanel }));

export const setUpPrivacy = () => {
	window.attiblingConsent = {
		get: category => consent.get(category),
		set: choices => consent.set(choices),
		open: openPanel,
		onChange: fn => {
			const listener = event => fn(event.detail);
			window.addEventListener("attibling:consent", listener);
			return () => window.removeEventListener("attibling:consent", listener);
		},
	};

	// Links and buttons that open the panel: the footer's (a link to the page without JavaScript), the
	// embeds' « Gérer mes choix ». A modified click (new tab) keeps the link's own behaviour.
	document.querySelectorAll("[data-privacy-open][hidden]").forEach(el => (el.hidden = false));
	document.addEventListener("click", event => {
		const trigger = event.target.closest("[data-privacy-open]");
		if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
		event.preventDefault();
		openPanel();
	});

	// The members' lists live in this browser, not in the account: signing out with the site's own
	// links (data-members-signout, handled by Ghost) clears them at once, so the next person to sign in on
	// this browser does not see them. Portal's own « Sign out » button, inside its frame, cannot be heard:
	// the first page without that member clears them (default.hbs).
	document.addEventListener(
		"click",
		event => {
			if (!event.target.closest?.("[data-members-signout]")) return;
			for (const key of MEMBER_KEYS) {
				try {
					localStorage.removeItem(key);
				} catch {
					// storage blocked: nothing was kept
				}
			}
		},
		true,
	);

	// Google Consent Mode v2 defaults (only with a Google tag), before any gated script runs
	setUpGoogleConsent();
	activateGated();

	// The notice, only when something on this page waits for an answer: a gated script, or an embed held
	// behind its facade (embeds.js, loaded after this, says so with "attibling:gated")
	let armed = false;
	const ask = () => {
		if (armed || consentMode() === "none" || consent.decided() || !gatedCategories().size) return;
		armed = true;
		if (consentMode() === "banner") {
			showNotice();
			return;
		}
		let shown = false;
		const show = () => {
			if (shown) return;
			shown = true;
			window.removeEventListener("scroll", onScroll);
			clearTimeout(timer);
			showNotice();
		};
		// A real scroll (a quarter of the screen), not the browser restoring a position on load
		const start = window.scrollY;
		const onScroll = () => {
			if (Math.abs(window.scrollY - start) > window.innerHeight / 4) show();
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		const timer = setTimeout(show, NOTICE_DELAY);
	};
	window.addEventListener("attibling:gated", ask);
	ask();
};
