// Subscription page (partials/pages/subscribe.hbs). Ghost's members script sends the two forms itself
// (data-members-form="subscribe" / "signin": it adds the classes loading, success and error and writes
// its message in [data-members-error]); this only
//   - shows the state asked by the address: #connexion → sign-in, #inscription (or nothing) → sign-up
//     (data-state on the section; CSS :target does the same without JavaScript), and focuses the first
//     field when the visitor came for it (a « S'abonner » / « Se connecter » link, or the switch link);
//   - checks the e-mail address before Ghost does, politely: a message under the field (data-empty /
//     data-invalid of the input) instead of the browser's bubble, nothing sent while it is empty or malformed;
//   - moves the focus to the success message when Ghost marks a form "success" (screen readers and
//     keyboard users hear it), and to the e-mail field on "error".
import { onReady } from "./helpers";

const STATES = { "#connexion": "signin", "#inscription": "signup" };

export const setUpSubscribePage = (doc = document) => {
	const hero = doc.querySelector("[data-subscribe-hero]");
	const forms = [...doc.querySelectorAll("[data-subscribe-form], [data-signin-form]")];
	if (!hero && !forms.length) return;

	const panel = state => hero?.querySelector(`[data-subscribe-panel="${state}"]`);

	const show = ({ focus }) => {
		if (!hero) return;
		const state = STATES[window.location.hash];
		const current = state && panel(state) ? state : panel("signup") ? "signup" : "signin";
		hero.dataset.state = current;
		if (!focus || !state) return;
		const field = panel(current)?.querySelector("input:not([type=hidden])");
		field?.focus({ preventScroll: true });
		window.scrollTo(0, 0);
	};
	// On arrival the browser goes to the #fragment after the load event, which drops the focus: focus once
	// it is done (a frame after load)
	show({ focus: false });
	const arrive = () => requestAnimationFrame(() => show({ focus: true }));
	if (doc.readyState === "complete") arrive();
	else window.addEventListener("load", arrive, { once: true });
	window.addEventListener("hashchange", () => show({ focus: true }));

	forms.forEach(form => {
		const email = form.querySelector("[data-members-email]");
		const message = form.querySelector("[data-members-error]");
		const success = form.querySelector("[data-form-success]");

		// Before Ghost's own submit handler (on the form): capture on the document runs first
		const invalid = () => {
			if (!email) return null;
			if (!email.value.trim()) return email.dataset.empty || email.validationMessage;
			if (!email.validity.valid) return email.dataset.invalid || email.validationMessage;
			return null;
		};
		doc.addEventListener(
			"submit",
			event => {
				if (event.target !== form) return;
				const problem = invalid();
				if (!problem) {
					email?.removeAttribute("aria-invalid");
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				form.classList.remove("loading", "success");
				form.classList.add("error");
				if (message) message.textContent = problem;
				email.setAttribute("aria-invalid", "true");
				email.focus();
			},
			true,
		);
		email?.addEventListener("input", () => {
			if (email.getAttribute("aria-invalid") !== "true" || invalid()) return;
			email.removeAttribute("aria-invalid");
			form.classList.remove("error");
			if (message) message.textContent = "";
		});

		new MutationObserver(() => {
			if (form.classList.contains("success")) success?.focus();
			else if (form.classList.contains("error")) email?.focus();
		}).observe(form, { attributes: true, attributeFilter: ["class"] });
	});
};

onReady(() => setUpSubscribePage());
