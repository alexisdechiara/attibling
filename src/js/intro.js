// Arrival animation (partials/home/intro.hbs, src/css/home/intro.css; started and ended by the script
// in default.hbs): the last step moves the centred mark onto the hero wordmark. This measures both and
// sets --intro-to, the transform (from the mark's top left corner) that lands the mark's letters on the
// hero's. The SVG draws the letters in font units (1000 per em) with the baseline at y = 0, its
// viewBox starting at x = -20 and y = -1080 and being 3560 units wide. Without this (script too late,
// page scrolled, right-to-left), the mark stays centred and fades out with the screen.
const VIEWBOX = { x: -20, y: -1080, width: 3560 };

// The hero wordmark's baseline: a zero-height box aligned on the letters' baseline
const baseline = letters => {
	const probe = document.createElement("span");
	probe.style.cssText = "display:inline-block;width:0;height:0;";
	letters.prepend(probe);
	const y = probe.getBoundingClientRect().top;
	probe.remove();
	return y;
};

export const setUpIntro = (root = document.documentElement) => {
	if (root.getAttribute("data-intro") !== "play") return null;
	const mark = document.querySelector("[data-intro-mark]");
	const wordmark = document.getElementById("hero-wordmark");
	const letters = wordmark?.querySelector(".wordmark__letters");
	const g = wordmark?.querySelector(".wordmark__g");
	if (!mark || !letters || !g || window.scrollY > 0 || getComputedStyle(letters).direction === "rtl") return null;

	// The mark's own box (fixed, centred by the CSS, not transformed yet: offset* ignore transforms)
	const from = { left: mark.offsetLeft, top: mark.offsetTop, width: mark.offsetWidth };
	if (!from.width) return null;
	const fontSize = parseFloat(getComputedStyle(letters).fontSize);
	const unit = fontSize / 1000; // px per font unit in the hero
	const scale = (VIEWBOX.width * unit) / from.width;
	const left = g.getBoundingClientRect().left + VIEWBOX.x * unit;
	const top = baseline(letters) + VIEWBOX.y * unit;
	const to = `translate(${(left - from.left).toFixed(2)}px, ${(top - from.top).toFixed(2)}px) scale(${scale.toFixed(4)})`;
	mark.style.setProperty("--intro-to", to);
	return to;
};
