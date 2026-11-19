// Home page: the hero wordmark docks into the header once it has scrolled under the bar.
// The header (#site-header) carries data-dock="undocked" from the template; this sets "docked"
// when no part of #hero-wordmark shows below the bar any more, and back. The CSS fades (and,
// without reduced motion, lifts) the header logo [data-header-logo] in and out.
// Self-contained: the page transitions and the arrival animation may read data-dock, never write it.
//
// Where scroll-driven animations are supported (and motion is welcome), the logo also travels: while
// the page scrolls from the top to the point where the hero wordmark reaches the logo's place, the
// header logo starts from the hero wordmark's position and size and shrinks into its place, as the
// hero wordmark fades out (src/css/home/hero.css, "Docking"). This measures the way, at the top of
// the page only, into custom properties on <html> (the header logo and the hero both read them) and
// sets data-dock-travel on #site-header:
//   --dock-x, --dock-y   offset of the hero wordmark from the logo, --dock-scale   their size ratio,
//   --dock-range         the scroll distance (the vertical offset: the logo keeps pace with the hero).
// Without that attribute (no support, reduced motion, page loaded scrolled) the plain fade remains.
const canTravel = () =>
	CSS.supports("animation-timeline: scroll()") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const setUpTravel = (header, wordmark) => {
	const logo = header.querySelector("[data-header-logo] [data-wordmark]");
	const root = document.documentElement;
	if (!logo || !canTravel()) return;
	const measure = () => {
		// Measured at the top of the page, without the travel's own transform
		if (window.scrollY > 0) return;
		header.removeAttribute("data-dock-travel");
		const link = logo.parentElement;
		link.style.transition = "none";
		link.style.transform = "none";
		const from = wordmark.getBoundingClientRect();
		const to = logo.getBoundingClientRect();
		link.style.removeProperty("transition");
		link.style.removeProperty("transform");
		const rtl = getComputedStyle(header).direction === "rtl";
		const dy = from.top - to.top;
		if (!to.width || !from.width || dy <= 0) return;
		const dx = rtl ? from.right - to.right : from.left - to.left;
		root.style.setProperty("--dock-x", `${dx.toFixed(1)}px`);
		root.style.setProperty("--dock-y", `${dy.toFixed(1)}px`);
		root.style.setProperty("--dock-scale", (from.width / to.width).toFixed(3));
		root.style.setProperty("--dock-range", `${dy.toFixed(1)}px`);
		header.setAttribute("data-dock-travel", "");
	};
	measure();
	// After a resize, or once back at the top when the page was loaded scrolled
	let stale = window.scrollY > 0;
	window.addEventListener("resize", () => {
		stale = true;
		measure();
		if (window.scrollY === 0) stale = false;
	});
	window.addEventListener(
		"scroll",
		() => {
			if (stale && window.scrollY === 0) {
				stale = false;
				measure();
			}
		},
		{ passive: true },
	);
	document.fonts?.ready.then(() => window.scrollY === 0 && measure());
};

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
	setUpTravel(header, wordmark);
	return { disconnect: () => observer?.disconnect() };
};
