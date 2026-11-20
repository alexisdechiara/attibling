// The fallback consent notice (partials/privacy/notice.hbs): shown by index.js only when a script the
// site owner gated (data-consent) waits for an answer. Not a modal: no backdrop, no focus taken, the page
// stays usable; it is placed right after the skip link so it is the first thing a keyboard or
// screen-reader user reaches. It asks about the kinds of those scripts only (embeds ask in their own
// facade); the answer is kept (choices.js) and the notice goes away for six months.
import { CATEGORIES, CONSENT_KEY, consent, gatedCategories } from "./choices";

export const showNotice = ({ openPanel } = {}) => {
	const template = document.getElementById("consent-notice");
	if (!template || document.querySelector("[data-consent-notice]")) return null;
	const asked = consent.pending(gatedCategories());
	if (!asked.length) return null;
	const notice = template.content.firstElementChild.cloneNode(true);
	const mode = document.documentElement.dataset.consent === "banner" ? "banner" : "notice";
	notice.classList.add(`consent-notice--${mode}`);

	// What the page would run: the kinds of services (« mesure d'audience, autres services »)
	const body = notice.querySelector("[data-consent-body]");
	const names = CATEGORIES.filter(name => asked.includes(name)).map(name => notice.dataset[name]);
	body.textContent = body.dataset.template.replace("{categories}", names.join(", "));

	// « Personnalisez vos choix ou changez d'avis dans [Cookies et confidentialité]. »: the link sits
	// where the translation puts {link}
	const more = notice.querySelector("[data-consent-more]");
	if (more) {
		const [before, after = ""] = more.dataset.template.split("{link}");
		more.replaceChildren(before, more.firstElementChild, after);
	}

	// While it is shown, it keeps the room it takes at the bottom of the window (privacy.css:
	// data-consent-shown, --consent-notice-space): the page scrolls a focused element above it, and the
	// article's « back to the top » makes way
	const root = document.documentElement;
	const room = new ResizeObserver(() => {
		const box = notice.getBoundingClientRect();
		root.style.setProperty("--consent-notice-space", `${Math.ceil(window.innerHeight - box.top)}px`);
	});
	// Where the focus was when the notice came, to go back there once it is answered
	const before = document.activeElement !== document.body ? document.activeElement : null;
	const close = () => {
		if (!notice.isConnected) return;
		// The focus inside the notice would fall on <body>: back where it was, else the main content
		const focused = notice.contains(document.activeElement);
		notice.remove();
		room.disconnect();
		root.removeAttribute("data-consent-shown");
		root.style.removeProperty("--consent-notice-space");
		document.removeEventListener("keydown", onKey);
		window.removeEventListener("attibling:consent", settled);
		window.removeEventListener("storage", onStorage);
		if (focused) focusAfter(before);
	};
	const answer = value => {
		consent.set(Object.fromEntries(asked.map(name => [name, value])));
		close();
	};
	const onKey = event => {
		// Escape inside the notice: the same as closing it (a refusal, as the close button says)
		if (event.key === "Escape" && notice.contains(document.activeElement)) answer(false);
	};
	notice
		.querySelectorAll("[data-consent-answer]")
		.forEach(button => button.addEventListener("click", () => answer(button.dataset.consentAnswer === "true")));
	notice.querySelector("[data-consent-panel]")?.addEventListener("click", () => {
		openPanel?.();
	});
	// An answer given in the panel (or another tab) closes the notice once nothing is left to ask
	const settled = () => {
		if (!consent.pending(asked).length) close();
	};
	const onStorage = event => {
		if (event.key === CONSENT_KEY) settled();
	};
	window.addEventListener("attibling:consent", settled);
	window.addEventListener("storage", onStorage);
	document.addEventListener("keydown", onKey);

	const skip = document.querySelector(".skip-link");
	if (skip) skip.after(notice);
	else document.body.prepend(notice);
	root.setAttribute("data-consent-shown", mode);
	room.observe(notice);
	return notice;
};

// The focus never lost: the element that had it, if it is still in the page, else the main content
export const focusAfter = element => {
	if (element?.isConnected && element !== document.body && element.checkVisibility?.() !== false) {
		element.focus({ preventScroll: true });
		if (document.activeElement === element) return;
	}
	const main = document.querySelector("main") || document.querySelector("#main, [role='main']");
	if (!main) return;
	if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
	main.focus({ preventScroll: true });
};
