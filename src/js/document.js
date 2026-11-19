// Reference document (partials/pages/document.hbs: « Mentions légales », any page with the « Document »
// template): table of contents from the h2 and h3 of the content (tocbot, as in articles), copy-link
// buttons on those headings, and the « Imprimer » button. Loaded by page.js only on such a page.
//
// The table of contents is a « Sommaire » disclosure above the text; on wide screens the CSS makes it
// sticky beside the text, where it is kept open (its summary hidden). Fewer than two headings: no
// table of contents. Without JavaScript: none either (the headings keep their anchors).
import tocbot from "tocbot";
import { ensureHeadingIds, setUpHeadingLinks } from "./article/copy";

const setUpToc = (toc, content) => {
	if (!toc || content.querySelectorAll("h2, h3").length < 2) return;
	toc.hidden = false;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	tocbot.init({
		tocSelector: "[data-toc-list]",
		contentSelector: "[data-document-content]",
		headingSelector: "h2, h3",
		ignoreSelector: ".js-toc-ignore, .kg-card *",
		hasInnerContainers: true,
		orderedList: false,
		// A heading counts as reached a little below the sticky header (where an anchor lands)
		headingsOffset: 220,
		scrollSmooth: !reducedMotion,
		scrollSmoothOffset: -96,
		// The h3 of the current section only (document.css hides the others on wide screens)
		collapseDepth: 2,
	});

	const beside = () => getComputedStyle(toc).position === "sticky";
	let wasBeside = null;
	const layout = () => {
		const now = beside();
		if (now !== wasBeside) toc.open = now;
		wasBeside = now;
	};
	layout();
	new ResizeObserver(layout).observe(document.documentElement);
	// A link chosen in the « Sommaire » disclosure closes it
	toc.addEventListener("click", event => {
		if (event.target.closest("a") && !beside()) toc.open = false;
	});
};

export const setUpDocument = root => {
	const content = root.querySelector("[data-document-content]");
	if (!content) return;
	ensureHeadingIds(content);
	setUpToc(root.querySelector("[data-document-toc]"), content);
	setUpHeadingLinks(content);

	const print = root.querySelector("[data-document-print]");
	if (print && typeof window.print === "function") {
		print.hidden = false;
		print.addEventListener("click", () => window.print());
	}
};
