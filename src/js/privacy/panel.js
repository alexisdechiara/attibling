// The preferences panel « Cookies et confidentialité » (partials/privacy/panel.hbs): created from its
// <template> on the first opening, then reused. A modal <dialog> (a bottom sheet on phones, privacy.css):
// focus moves to its first control and back to what opened it; Escape, the close button or a click on
// the backdrop close it.
import { setUpControls } from "./controls";

let dialog = null;
let controls = null;
let opener = null;

const create = () => {
	const template = document.getElementById("privacy-panel");
	if (!template) return null;
	dialog = template.content.firstElementChild.cloneNode(true);
	document.body.append(dialog);
	controls = setUpControls(dialog.querySelector("[data-privacy-controls]"));
	dialog.querySelector("[data-privacy-close]")?.addEventListener("click", () => dialog.close());
	// A click on the backdrop (outside the dialog's box) closes it
	dialog.addEventListener("click", event => {
		if (event.target !== dialog) return;
		const box = dialog.getBoundingClientRect();
		const inside =
			event.clientX >= box.left &&
			event.clientX <= box.right &&
			event.clientY >= box.top &&
			event.clientY <= box.bottom;
		if (!inside) dialog.close();
	});
	dialog.addEventListener("close", () => {
		document.documentElement.removeAttribute("data-privacy-panel-open");
		// What opened it, or, when that is gone (the notice's link, once answered), the main content: the
		// focus never falls on <body>
		if (opener?.isConnected && opener !== document.body) {
			opener.focus();
			if (document.activeElement === opener) return;
		}
		const main = document.querySelector("main");
		if (!main) return;
		if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
		main.focus({ preventScroll: true });
	});
	return dialog;
};

export const openPanel = () => {
	if (!dialog && !create()) return null;
	if (dialog.open) return dialog;
	opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	controls.refresh();
	dialog.showModal();
	document.documentElement.setAttribute("data-privacy-panel-open", "");
	// The first switch or button, not the close button
	dialog.querySelector("[data-privacy-controls] :is(input, button):not([hidden] *)")?.focus();
	return dialog;
};
