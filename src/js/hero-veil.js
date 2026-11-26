// Home hero: the veil dosed per picture (src/css/home/hero.css, « The shade over the picture »).
// Once per slide, when its picture has loaded and the browser is idle, Ghost's 100px-wide rendition of
// the same picture (/size/w100/, 2-4 KB) is drawn into a 64 × 36 canvas, cropped as the card shows it,
// and the brightness under the two text blocks is read (99th percentile: the bright detail, not the
// average). From it the slide gets the shade each block needs to reach its target (--hero-target-a /
// -b), shared between the even veil (--hero-veil, a share --hero-veil-k of the larger need) and the
// ramp towards that block (--hero-ramp-a / -b, divided by the ramp's strength at the block's far edge,
// --hero-reach-a / -b). The values are set on the slide, so a slide change crossfades two scrims each
// with its own. No layout work, no work per frame. A picture that is not one of Ghost's renditions (a
// cover from another site), or that the canvas cannot read (another origin), keeps the CSS defaults.
const W = 64;
const H = 36;
const lin = v => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
// The share of the media colour (relative luminance 0.0065) that brings luminance L down to `max`
const need = (L, max) => (L <= max ? 0 : Math.min(1, (L - max) / (L - 0.0065)));
const clamp = (min, v, max) => Math.min(max, Math.max(min, v));

// The brightness (99th percentile) under the wordmark block and under the post, as the card shows the
// picture: desktop, the wordmark on the left 44 % and the post on 58-92 %; phones and tablets, the top
// 12-58 % and the bottom 62-90 %. Throws on a tainted canvas.
const sample = (img, wide) => {
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	// object-fit: cover, centred (the card is about 2.77:1 on desktop, 0.66:1 on phones)
	const target = wide ? 2.77 : 0.66;
	const ratio = img.naturalWidth / img.naturalHeight;
	const sw = ratio > target ? img.naturalHeight * target : img.naturalWidth;
	const sh = ratio > target ? img.naturalHeight : img.naturalWidth / target;
	context.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, W, H);
	const data = context.getImageData(0, 0, W, H).data;
	const zones = wide
		? [
				[0, 0.44, 0.2, 0.85],
				[0.58, 0.92, 0.25, 0.8],
			]
		: [
				[0.05, 0.95, 0.12, 0.58],
				[0.05, 0.95, 0.62, 0.9],
			];
	return zones.map(([x0, x1, y0, y1]) => {
		const values = [];
		for (let y = Math.floor(y0 * H); y < Math.ceil(y1 * H); y++) {
			for (let x = Math.floor(x0 * W); x < Math.ceil(x1 * W); x++) {
				const i = (y * W + x) * 4;
				values.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
			}
		}
		values.sort((a, b) => a - b);
		return values[Math.floor(values.length * 0.99)];
	});
};

export const setUpHeroVeil = hero => {
	const desktop = matchMedia("(width >= 64rem)");
	const idle = callback =>
		"requestIdleCallback" in window ? requestIdleCallback(callback, { timeout: 2000 }) : setTimeout(callback, 200);
	const samples = new Map(); // slide → its small picture, kept to re-read it when the layout changes

	const read = (slide, img) => {
		const style = getComputedStyle(hero);
		const num = name => parseFloat(style.getPropertyValue(name)) || 0;
		try {
			const [a, b] = sample(img, desktop.matches);
			// The floor: thin bright detail (a line, small lettering) can vanish at 100px
			const floor = num("--hero-floor");
			const needs = [need(a, num("--hero-target-a")), need(b, num("--hero-target-b"))].map(n => Math.max(n, floor));
			const veil = clamp(0.16, num("--hero-veil-k") * Math.max(...needs), 0.5);
			slide.style.setProperty("--hero-veil", veil.toFixed(2));
			["a", "b"].forEach((side, i) => {
				const ramp = (1 - (1 - needs[i]) / (1 - veil)) / (num(`--hero-reach-${side}`) || 1);
				slide.style.setProperty(`--hero-ramp-${side}`, clamp(0.22, ramp, 0.95).toFixed(2));
			});
		} catch {
			// An unreadable picture keeps the CSS defaults
		}
	};

	hero.querySelectorAll("[data-hero-slide]").forEach(slide => {
		const img = slide.querySelector(".hero__image");
		if (!img) return;
		const measure = () =>
			idle(() => {
				const src = img.currentSrc || img.src;
				if (!/\/size\/w\d+\//.test(src)) return;
				const small = new Image();
				small.src = src.replace(/\/size\/w\d+\//, "/size/w100/");
				small.decode().then(
					() => {
						samples.set(slide, small);
						read(slide, small);
					},
					() => {},
				);
			});
		if (img.complete && img.naturalWidth) measure();
		else img.addEventListener("load", measure, { once: true });
	});

	// Phone ⇄ desktop: the text blocks move, the pictures are read again
	desktop.addEventListener("change", () => samples.forEach((small, slide) => read(slide, small)));
};
