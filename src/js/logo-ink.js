// Site logo drawn for dark backgrounds (wordmark.hbs, logo image branch). Ghost's site logo is meant
// for light surfaces (and the « Dark mode logo » setting for dark ones), but a logo whose ink is partly
// white on transparency (e.g. a "ly" in white, made for a dark header) loses that ink on the light
// header, footer and menu sheet. This looks at the logo once it has loaded: when a fair share of its
// ink is white or very light AND that light ink stands on transparency (not inside a coloured shape,
// like the white letters of a badge), the wordmark gets data-ink="light" and the CSS
// (src/css/components/wordmark.css) applies a filter that turns only those light pixels into the text
// colour on light surfaces. Coloured parts keep their colours; dark mode and images show the logo as it
// is. A logo on another origin that cannot be read (tainted canvas) is left alone.
const SIZE = 160; // the logo is read at this width at most
const LIGHT = 204; // a channel value of 0.8 and up: "light" (the filter uses the same threshold)
const FILTER_ID = "attibling-logo-ink";

const analyse = img => {
	const width = Math.min(SIZE, img.naturalWidth);
	const height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	context.drawImage(img, 0, 0, width, height);
	const data = context.getImageData(0, 0, width, height).data; // throws on a tainted canvas
	const at = (x, y) => (y * width + x) * 4;
	const opaque = i => data[i + 3] >= 128;
	const light = i => opaque(i) && data[i] >= LIGHT && data[i + 1] >= LIGHT && data[i + 2] >= LIGHT;
	let ink = 0;
	let lightInk = 0;
	let onTransparency = 0; // edges of light ink against transparency
	let onColour = 0; // edges of light ink against other (darker or coloured) ink
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = at(x, y);
			if (!opaque(i)) continue;
			ink++;
			if (!light(i)) continue;
			lightInk++;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
					onTransparency++;
					continue;
				}
				const n = at(nx, ny);
				if (data[n + 3] < 32) onTransparency++;
				else if (!light(n) && opaque(n)) onColour++;
			}
		}
	}
	return ink > 0 && lightInk / ink >= 0.08 && onTransparency > 2 * onColour;
};

// The filter, once per page: light pixels (R, G and B ≥ 0.8) take the ink colour (CSS flood-color)
const addFilter = () => {
	if (document.getElementById(FILTER_ID)) return;
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	svg.setAttribute("class", "logo-ink-filter");
	const step = "0 0 0 0 0 0 0 0 1 1"; // discrete: 0 below 0.8, 1 from 0.8
	svg.innerHTML = `<filter id="${FILTER_ID}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
<feComponentTransfer in="SourceGraphic" result="light"><feFuncR type="discrete" tableValues="${step}"/><feFuncG type="discrete" tableValues="${step}"/><feFuncB type="discrete" tableValues="${step}"/></feComponentTransfer>
<feColorMatrix in="light" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3333 0.3333 0.3334 0 0" result="sum"/>
<feComponentTransfer in="sum" result="all"><feFuncA type="discrete" tableValues="0 0 0 1"/></feComponentTransfer>
<feComposite in="all" in2="SourceAlpha" operator="in" result="mask"/>
<feFlood class="logo-ink-filter__ink" result="ink"/>
<feComposite in="ink" in2="mask" operator="in" result="inked"/>
<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="inked"/></feMerge>
</filter>`;
	document.body.append(svg);
};

export const setUpLogoInk = (root = document) => {
	const images = root.querySelectorAll(".wordmark--logo .wordmark__image:not(.wordmark__image--dark)");
	const seen = new Map(); // the same logo is in the header, the footer and the menu sheet: read it once
	const check = img => {
		let lightInk = seen.get(img.currentSrc);
		if (lightInk === undefined) {
			try {
				lightInk = img.naturalWidth > 0 && analyse(img);
			} catch {
				return; // another origin: nothing to read
			}
			seen.set(img.currentSrc, lightInk);
		}
		if (!lightInk) return;
		addFilter();
		img.closest(".wordmark")?.setAttribute("data-ink", "light");
	};
	images.forEach(img => {
		if (img.complete) check(img);
		else img.addEventListener("load", () => check(img), { once: true });
	});
};
