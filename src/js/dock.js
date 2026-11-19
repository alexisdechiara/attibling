// Home page: the wordmark is EITHER in the hero OR in the header, never in between.
// The header (#site-header) carries data-dock="undocked" from the template. When the hero wordmark
// (#hero-wordmark) is about to pass under the bar, this sets data-dock="docked" and the header logo
// flies from the hero wordmark's place and size into its own place (420 ms, eased), whatever the scroll
// does meanwhile; back above the threshold the flight plays in reverse. Hysteresis (the wordmark must
// come back 48 px lower than where it docked) keeps it from flickering at the threshold, and a reversal
// mid-flight goes back from where the logo is. While it flies the header carries data-dock-flight and
// the logo's wordmark --dock-p (0 in the hero, 1 in the header: its "ly" turns from the hero's white to
// the header's colour). The hero wordmark is hidden while the logo is out of the hero (CSS:
// src/css/components/site-header.css, « Docking »).
// Reduced motion: no flight, the two swap with a short fade. Page loaded (or restored) scrolled: docked
// at once, without a flight. Without this script the CSS shows the logo once the page has scrolled.
// Self-contained: the page transitions and the arrival animation may read data-dock, never write it.
const DURATION = 420;
const MARGIN = 12; // dock when the wordmark's top is this close to the bar's bottom
const HYSTERESIS = 48; // undock only once it is that much lower again

// Ease in and out (cubic): a FLIP-like travel
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const setUpDock = (header = document.getElementById("site-header")) => {
	if (!header || !header.hasAttribute("data-dock")) return null;
	const hero = document.getElementById("hero-wordmark");
	const link = header.querySelector("[data-header-logo]");
	const logo = link?.querySelector("[data-wordmark]");
	if (!hero || !logo) {
		header.setAttribute("data-dock", "docked");
		return null;
	}

	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	const rtl = () => getComputedStyle(header).direction === "rtl";
	let docked = false;
	let progress = 0; // 0: in the hero, 1: in the header
	let frame = null;
	let last = 0;
	let instant = true; // until the page has loaded (and restored its scroll position)

	// The bottom of the bar as laid out (a transform hiding the header does not count): its height,
	// plus what is left of Ghost's announcement bar above it
	const barBottom = () => {
		const bar = document.getElementById("announcement-bar-root");
		const above = bar && bar.nextElementSibling === header ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
		return above + header.offsetHeight;
	};

	// The logo's place at rest, from its link (never transformed by the flight)
	let offset = null;
	const measureOffset = () => {
		logo.style.transform = "none";
		const box = logo.getBoundingClientRect();
		const parent = link.getBoundingClientRect();
		offset = {
			left: box.left - parent.left,
			right: parent.right - box.right,
			top: box.top - parent.top,
			width: box.width,
		};
		logo.style.removeProperty("transform");
	};

	const draw = (flying = true) => {
		if (!flying) {
			logo.style.removeProperty("transform");
			logo.style.removeProperty("--dock-p");
			return;
		}
		if (!offset) measureOffset();
		const parent = link.getBoundingClientRect();
		const from = hero.getBoundingClientRect();
		const e = ease(progress);
		const scale = offset.width ? from.width / offset.width : 1;
		const dx = rtl() ? from.right - (parent.right - offset.right) : from.left - (parent.left + offset.left);
		const dy = from.top - (parent.top + offset.top);
		const k = 1 - e;
		logo.style.transform = `translate(${(dx * k).toFixed(2)}px, ${(dy * k).toFixed(2)}px) scale(${(1 + (scale - 1) * k).toFixed(4)})`;
		// The "ly" keeps the hero's white over the picture and takes the header's colour as the logo
		// reaches the bar (the last 45 % of the way)
		const tint = Math.min(1, Math.max(0, (e - 0.55) / 0.4));
		logo.style.setProperty("--dock-p", tint.toFixed(3));
	};

	const finish = () => {
		frame = null;
		header.removeAttribute("data-dock-flight");
		draw(false);
	};

	const step = now => {
		const elapsed = Math.min(64, now - last);
		last = now;
		progress = Math.min(1, Math.max(0, progress + ((docked ? 1 : -1) * elapsed) / DURATION));
		draw();
		if ((docked && progress < 1) || (!docked && progress > 0)) frame = requestAnimationFrame(step);
		else finish();
	};

	const set = (value, { animate = true } = {}) => {
		if (value === docked) return;
		docked = value;
		header.setAttribute("data-dock", docked ? "docked" : "undocked");
		if (!animate || reduced.matches) {
			if (frame) cancelAnimationFrame(frame);
			progress = docked ? 1 : 0;
			finish();
			return;
		}
		header.setAttribute("data-dock-flight", "");
		if (!frame) {
			last = performance.now();
			draw();
			frame = requestAnimationFrame(step);
		}
	};

	const update = () => {
		const gap = hero.getBoundingClientRect().top - barBottom();
		if (!docked && gap < MARGIN) set(true, { animate: !instant });
		else if (docked && gap > MARGIN + HYSTERESIS) set(false, { animate: !instant });
	};

	let ticking = false;
	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			ticking = false;
			update();
		});
	};

	update();
	const settle = () =>
		setTimeout(() => {
			update();
			instant = false;
		}, 50);
	if (document.readyState === "complete") settle();
	else window.addEventListener("load", settle, { once: true });
	// Back from the back-forward cache: where the page is now, at once
	window.addEventListener("pageshow", event => {
		if (!event.persisted) return;
		instant = true;
		update();
		settle();
	});
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener(
		"resize",
		() => {
			offset = null;
			onScroll();
		},
		{ passive: true },
	);
	document.fonts?.ready.then(() => {
		offset = null;
	});

	return {
		isDocked: () => docked,
		disconnect: () => {
			window.removeEventListener("scroll", onScroll);
			if (frame) cancelAnimationFrame(frame);
		},
	};
};
