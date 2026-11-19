// Table of contents (partials/article/toc.hbs) with tocbot, from the h2 and h3 of the content; shown
// when there are at least two. Where it sits in the margin (style « Carte », wide screens: the CSS
// makes it sticky) the disclosure is kept open; elsewhere it is a « Sommaire » button.
import tocbot from "tocbot";

export const setUpToc = (toc, content) => {
	if (!toc || !content) return;
	const headings = content.querySelectorAll("h2, h3");
	if (headings.length < 2) return;
	toc.hidden = false;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	tocbot.init({
		tocSelector: "[data-toc-list]",
		contentSelector: "[data-article-content]",
		headingSelector: "h2, h3",
		// Headings inside Ghost cards (header, signup, toggle…) are not sections of the text
		ignoreSelector: ".js-toc-ignore, .en-bref, .kg-card *",
		hasInnerContainers: true,
		orderedList: false,
		headingsOffset: 120,
		scrollSmooth: !reducedMotion,
		scrollSmoothOffset: -96,
		collapseDepth: 6,
	});

	const nav = toc.querySelector(".article-toc__nav");
	const inMargin = () => getComputedStyle(nav).position === "sticky";
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
