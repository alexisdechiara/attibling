// Table of contents (partials/article/toc.hbs) with tocbot, from the h2 and h3 of the content; shown
// when there are at least two. Where it sits in the margin (style « Carte », wide screens: the CSS
// makes it sticky) the disclosure is kept open; elsewhere it is a « Sommaire » button.
import tocbot from "tocbot";

// Left out of the table of contents: headings inside Ghost cards (header, signup, toggle…) are not
// sections of the text, and an author can leave one out with the class js-toc-ignore. The rule of
// src/css/article/toc.css that shows the box before this script runs counts the same headings.
const IGNORED = ".js-toc-ignore, .en-bref, .kg-card *";

export const setUpToc = (toc, content) => {
	if (!toc || !content) return;
	// Only the headings tocbot will list: a « Sommaire » box with nothing under it helps nobody
	const headings = [...content.querySelectorAll("h2, h3")].filter(heading => !heading.matches(IGNORED));
	if (headings.length < 2) return;
	toc.hidden = false;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	tocbot.init({
		tocSelector: "[data-toc-list]",
		contentSelector: "[data-article-content]",
		headingSelector: "h2, h3",
		ignoreSelector: IGNORED,
		hasInnerContainers: true,
		orderedList: false,
		headingsOffset: 120,
		scrollSmooth: !reducedMotion,
		scrollSmoothOffset: -96,
		collapseDepth: 6,
	});

	// In the margin the CSS makes the disclosure itself sticky (src/css/article/toc.css)
	const inMargin = () => getComputedStyle(toc).position === "sticky";
	let wasInMargin = null;
	const layout = () => {
		const now = inMargin();
		if (now !== wasInMargin) toc.open = now;
		wasInMargin = now;
	};
	layout();
	new ResizeObserver(layout).observe(document.documentElement);
	window.addEventListener("attibling:reading", () => requestAnimationFrame(layout));
	// A link chosen in the « Sommaire » button closes it
	toc.addEventListener("click", event => {
		if (event.target.closest("a") && !inMargin()) toc.open = false;
	});
};
