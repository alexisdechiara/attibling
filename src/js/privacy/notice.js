// The fallback consent notice (partials/privacy/notice.hbs): shown by index.js only when something on
// the page waits for an answer. Not a modal: no backdrop, no focus taken, the page stays usable; it is
// placed right after the skip link so it is the first thing a keyboard or screen-reader user reaches.
// Any answer is kept (choices.js) and the notice goes away for six months.
import { CATEGORIES, consent, gatedCategories } from "./choices";

export const showNotice = ({ openPanel } = {}) => {
	const template = document.getElementById("consent-notice");
	if (!template || document.querySelector("[data-consent-notice]")) return null;
	const notice = template.content.firstElementChild.cloneNode(true);
	const mode = document.documentElement.dataset.consent === "banner" ? "banner" : "notice";
	notice.classList.add(`consent-notice--${mode}`);

	// What the page would load: « mesure d'audience, contenus intégrés »
	const present = gatedCategories();
	const names = CATEGORIES.filter(name => present.has(name)).map(name => notice.dataset[name]);
	const body = notice.querySelector("[data-consent-body]");
	body.textContent = body.dataset.template.replace("{categories}", names.join(", "));

	const close = () => {
		notice.remove();
		document.removeEventListener("keydown", onKey);
	};
	const onKey = event => {
		// Escape inside the notice: the same as closing it (a refusal, as the close button says)
		if (event.key === "Escape" && notice.contains(document.activeElement)) {
			consent.all(false);
			close();
		}
	};
	notice.querySelectorAll("[data-consent-answer]").forEach(button =>
		button.addEventListener("click", () => {
			consent.all(button.dataset.consentAnswer === "true");
			close();
		}),
	);
	notice.querySelector("[data-consent-customise]")?.addEventListener("click", () => {
		openPanel?.();
	});
	// An answer given in the panel (or another tab) closes the notice too
	window.addEventListener("attibling:consent", close, { once: true });
	window.addEventListener("storage", event => {
		if (event.key === "attibling-consent" && consent.decided()) close();
	});
	document.addEventListener("keydown", onKey);

	const skip = document.querySelector(".skip-link");
	if (skip) skip.after(notice);
	else document.body.prepend(notice);
	return notice;
};
