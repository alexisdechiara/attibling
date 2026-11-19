// Page transitions (cross-document View Transitions; opted in by the « Page transitions » setting in
// default.hbs, never with reduced motion; the pairs and timing are in src/css/components/transitions.css).
// The pages being opened name their header statically (the article's picture, the tag page's header);
// the page being left names only the element the reader followed, at the last moment (pageswap), so
// that each name is unique on the page when the browser takes its snapshot:
//   a tile's or a row's picture → "vt-media" (the article header's picture),
//   a tag tile → "vt-tag" (the tag page's header).
// Nothing happens where the API is missing (no pageswap event, no viewTransition on it).
export const NAMES = { media: "vt-media", tag: "vt-tag" };
// The elements named by the CSS (transitions.css)
const STATIC = "[data-article-image], [data-tag-header]";

// The element to name for a followed link: the tag tile itself, or the picture inside the link
const target = link => {
	if (link.matches(".tag-tile")) return { element: link, name: NAMES.tag };
	const image = link.querySelector("img");
	return image ? { element: image, name: NAMES.media } : null;
};

export const setUpTransitions = () => {
	if (!("onpageswap" in window)) return;
	let followed = null;
	const named = new Set();
	const clear = () => {
		named.forEach(element => element.style.removeProperty("view-transition-name"));
		named.clear();
	};

	// The last same-page link the reader activated (mouse, touch, keyboard)
	document.addEventListener(
		"click",
		event => {
			const link = event.target.closest?.("a[href]");
			followed = link && link.origin === location.origin ? link : null;
		},
		{ capture: true },
	);

	window.addEventListener("pageswap", event => {
		clear();
		if (!event.viewTransition || !followed) return;
		const url = event.activation?.entry?.url;
		if (!url || url.split("#")[0] !== followed.href.split("#")[0]) return;
		const found = target(followed);
		if (!found) return;
		// This page's own header may carry the same name (an article opening another): give it up
		document.querySelectorAll(STATIC).forEach(element => {
			if (getComputedStyle(element).viewTransitionName === found.name) {
				element.style.setProperty("view-transition-name", "none");
				named.add(element);
			}
		});
		found.element.style.setProperty("view-transition-name", found.name);
		named.add(found.element);
	});

	// Back on this page from the back-forward cache: nothing stays named
	window.addEventListener("pageshow", event => {
		if (event.persisted) {
			clear();
			followed = null;
		}
	});
};
