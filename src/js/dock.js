// Home page: the hero wordmark docks into the header once it has scrolled under the bar.
// The header (#site-header) carries data-dock="undocked" from the template; this sets "docked"
// when no part of #hero-wordmark shows below the bar any more, and back. The CSS fades (and,
// without reduced motion, lifts) the header logo [data-header-logo] in and out.
// Self-contained: the page transitions and the arrival animation may read data-dock, never write it.
export const setUpDock = (header = document.getElementById("site-header")) => {
	const wordmark = document.getElementById("hero-wordmark");
	if (!header || !header.hasAttribute("data-dock")) return null;
	if (!wordmark) {
		header.setAttribute("data-dock", "docked");
		return null;
	}

	const setDocked = docked => header.setAttribute("data-dock", docked ? "docked" : "undocked");
	let observer = null;
	const observe = () => {
		observer?.disconnect();
		// The bar's height (and Ghost's announcement bar above it) shrinks the observed area
		const top = Math.round(header.getBoundingClientRect().bottom);
		observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), {
			rootMargin: `${-Math.max(top, 0)}px 0px 0px 0px`,
		});
		observer.observe(wordmark);
	};
	observe();
	window.addEventListener("resize", observe, { passive: true });
	return { disconnect: () => observer?.disconnect() };
};
