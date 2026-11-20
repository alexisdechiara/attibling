// The fallback consent notice (partials/privacy/notice.hbs): shown by index.js only when something on
// the page waits for an answer. Not a modal: no backdrop, no focus taken, the page stays usable; it is
// placed right after the skip link so it is the first thing a keyboard or screen-reader user reaches.
// Any answer is kept (choices.js) and the notice goes away for six months.
import { CATEGORIES, consent, gatedCategories, heldEmbeds } from "./choices";

export const showNotice = ({ openPanel } = {}) => {
	const template = document.getElementById("consent-notice");
	if (!template || document.querySelector("[data-consent-notice]")) return null;
	const notice = template.content.firstElementChild.cloneNode(true);
	const mode = document.documentElement.dataset.consent === "banner" ? "banner" : "notice";
	notice.classList.add(`consent-notice--${mode}`);

	// What the page would load. Embeds only: the services by name (« YouTube, X »); otherwise the kinds
	// of services (« mesure d'audience, contenus intégrés (YouTube) »)
	const present = gatedCategories();
	const providers = [...new Set(heldEmbeds().map(el => el.querySelector("[data-embed-provider]")?.textContent))]
		.filter(Boolean)
		.join(", ");
	const body = notice.querySelector("[data-consent-body]");
	if (present.size === 1 && present.has("embeds")) {
		notice.querySelector("[data-consent-title]").textContent = notice.dataset.titleEmbeds;
		body.textContent = notice.dataset.templateEmbeds.replace("{providers}", providers);
	} else {
		const names = CATEGORIES.filter(name => present.has(name)).map(name =>
			name === "embeds" && providers ? `${notice.dataset.embeds} (${providers})` : notice.dataset[name],
		);
		body.textContent = body.dataset.template.replace("{categories}", names.join(", "));
	}

	// « Vous pouvez changer d'avis dans [Cookies et confidentialité]. »: the link sits where the
	// translation puts {link}
	const more = notice.querySelector("[data-consent-more]");
	if (more) {
		const [before, after = ""] = more.dataset.template.split("{link}");
		more.replaceChildren(before, more.firstElementChild, after);
	}

	// While it is shown, controls fixed at the bottom of the window (the article's « back to the top »)
	// move up above it where they would overlap (privacy.css: data-consent-shown, --consent-notice-space)
	const root = document.documentElement;
	const room = new ResizeObserver(() => {
		const box = notice.getBoundingClientRect();
		root.style.setProperty("--consent-notice-space", `${Math.ceil(window.innerHeight - box.top)}px`);
	});
	const close = () => {
		notice.remove();
		room.disconnect();
		root.removeAttribute("data-consent-shown");
		root.style.removeProperty("--consent-notice-space");
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
	root.setAttribute("data-consent-shown", mode);
	room.observe(notice);
	return notice;
};
