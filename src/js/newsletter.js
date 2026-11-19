// Subscription page (partials/pages/subscribe.hbs). Ghost's members script handles the form itself
// (data-members-form: it adds the classes loading, success and error); this only
//   - moves the keyboard focus to the success message when Ghost marks the form "success" (so screen
//     readers and keyboard users hear it), and to the field on "error";
//   - makes the closing « S'abonner » button scroll back to the form and focus its field.
import { onReady } from "./helpers";

onReady(() => {
	const form = document.querySelector("[data-subscribe-form]");
	if (!form) return;
	const input = form.querySelector("[data-members-email]");
	const success = form.querySelector("[data-subscribe-success]");

	new MutationObserver(() => {
		if (form.classList.contains("success")) success?.focus();
		else if (form.classList.contains("error")) input?.focus();
	}).observe(form, { attributes: true, attributeFilter: ["class"] });

	document.querySelectorAll("[data-subscribe-jump]").forEach(link =>
		link.addEventListener("click", event => {
			event.preventDefault();
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
			input?.focus({ preventScroll: true });
		}),
	);
});
