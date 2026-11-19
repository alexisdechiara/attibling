export const isRTL = () => {
	const $html = document.querySelector("html");
	return ["ar", "he", "fa"].includes($html.getAttribute("lang"));
};

export const adjustImageGallery = () => {
	const images = document.querySelectorAll(".kg-gallery-image img");

	for (var i = 0, len = images.length; i < len; i++) {
		const container = images[i].closest(".kg-gallery-image");
		const width = images[i].attributes.width.value;
		const height = images[i].attributes.height.value;
		const ratio = width / height;
		container.style.flex = `${ratio} 1 0%`;
	}
};

// Video players in the post content keep their own ratio: the CSS sizes them with
// aspect-ratio: var(--embed-ratio), taken here from their width and height attributes.
export const setEmbedRatios = () => {
	const size = /^\d+(\.\d+)?(px)?$/;
	document.querySelectorAll(".js-post-content iframe").forEach(frame => {
		const width = frame.getAttribute("width");
		const height = frame.getAttribute("height");
		if (size.test(width) && size.test(height) && parseFloat(height) > 0) {
			frame.style.setProperty("--embed-ratio", `${parseFloat(width)} / ${parseFloat(height)}`);
		}
	});
};

// A menu opened by a button through the Popover API (popovertarget), which closes it on Escape
// and on a click outside. Where CSS anchor positioning is missing it is placed below the button
// here (--dropdown-top/left); where the Popover API is missing, .is-open is toggled instead.
// Returns { isOpen, close }; onToggle(open) runs whenever it opens or closes.
export const setUpPopover = (button, panel, { onToggle = () => {}, place = true } = {}) => {
	const native = Object.hasOwn(HTMLElement.prototype, "popover");
	const anchored = CSS.supports("position-area: bottom");
	const isOpen = () => (native ? panel.matches(":popover-open") : panel.classList.contains("is-open"));
	const position = () => {
		if (place && (!native || !anchored)) {
			const box = button.getBoundingClientRect();
			panel.dataset.placed = "";
			panel.style.setProperty("--dropdown-top", `${box.bottom + 10}px`);
			panel.style.setProperty("--dropdown-left", `${box.left + box.width / 2}px`);
		}
	};

	if (native) {
		// beforetoggle fires synchronously, as the popover opens or closes
		panel.addEventListener("beforetoggle", event => {
			if (event.newState === "open") position();
			onToggle(event.newState === "open");
		});
		return { isOpen, close: () => isOpen() && panel.hidePopover() };
	}

	// Without the Popover API the browser ignores these attributes: handle the button here
	button.removeAttribute("popovertarget");
	panel.removeAttribute("popover");
	const toggle = open => {
		if (open) position();
		const changed = isOpen() !== open;
		panel.classList.toggle("is-open", open);
		button.setAttribute("aria-expanded", String(open));
		if (changed) onToggle(open);
	};
	toggle(false);
	button.addEventListener("click", () => toggle(!isOpen()));
	document.addEventListener("click", event => {
		if (isOpen() && !panel.contains(event.target) && !button.contains(event.target)) toggle(false);
	});
	document.addEventListener("keydown", event => {
		if (event.key === "Escape" && isOpen()) {
			toggle(false);
			button.focus();
		}
	});
	return { isOpen, close: () => isOpen() && toggle(false) };
};

// A scroll-snap strip (.js-slider-track) with previous and next buttons, which scroll it by one
// slide and are disabled at either end. Works in right-to-left pages, where scrollLeft is negative.
export const setUpSlider = slider => {
	const track = slider.querySelector(".js-slider-track");
	const prev = slider.querySelector(".js-slider-prev");
	const next = slider.querySelector(".js-slider-next");
	if (!track || !prev || !next) return;

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const forward = () => (getComputedStyle(track).direction === "rtl" ? -1 : 1);
	// The slide a button is scrolling to: a click while the strip is still moving goes on from it
	let target = null;
	const update = () => {
		const position = Math.abs(track.scrollLeft);
		const focused = document.activeElement;
		if (target !== null && Math.abs(position - target * track.clientWidth) < 2) target = null;
		prev.disabled = position < 1;
		next.disabled = position + track.clientWidth > track.scrollWidth - 1;
		// Do not leave keyboard focus on a button that has just been disabled
		if (focused?.disabled && (focused === prev || focused === next)) (focused === prev ? next : prev).focus();
	};
	const go = steps => {
		const last = Math.round(track.scrollWidth / track.clientWidth) - 1;
		const current = target ?? Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
		target = Math.min(Math.max(current + steps, 0), last);
		track.scrollTo({
			left: target * track.clientWidth * forward(),
			behavior: reducedMotion.matches ? "instant" : "smooth",
		});
	};

	prev.addEventListener("click", () => go(-1));
	next.addEventListener("click", () => go(1));
	track.addEventListener("scroll", throttleToFrame(update), { passive: true });
	window.addEventListener("resize", throttleToFrame(update), { passive: true });
	update();
};

// Runs callback at most once per animation frame.
export const throttleToFrame = callback => {
	let ticking = false;

	return () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(() => {
				ticking = false;
				callback();
			});
		}
	};
};

export const onReady = callback => {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, { once: true });
	} else {
		callback();
	}
};

export const managePostImages = () => {
	document.querySelectorAll(".js-post-content img").forEach(img => {
		const figure = img.closest("figure");

		if (
			!(figure && figure.classList.contains("kg-bookmark-card")) &&
			!(figure && figure.classList.contains("kg-nft-card")) &&
			!(img.parentElement && img.parentElement.tagName === "A") &&
			!img.classList.contains("kg-product-card-image") &&
			!img.classList.contains("kg-audio-thumbnail")
		) {
			img.classList.add("js-zoomable");
		}
	});
};

export const makeImagesZoomable = mediumZoom => {
	const zoom = mediumZoom(".js-zoomable");

	zoom.on("opened", () => {
		setTimeout(() => {
			const mediumZoomImages = document.querySelectorAll(".medium-zoom-image--opened");
			if (mediumZoomImages.length > 1) {
				mediumZoomImages[mediumZoomImages.length - 1].style.display = "none";
			}
		}, 10);
	});
};

// Text written straight into the content (an HTML card or an old import, without a <p>) would become
// an anonymous item of the content's grid and land in a side column: wrap each run of such loose
// text and inline elements in a paragraph.
const INLINE = /^(A|ABBR|B|BR|CITE|CODE|EM|I|KBD|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U)$/;
export const wrapLooseText = content => {
	if (!content) return;
	let run = [];
	const flush = () => {
		if (run.some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim())) {
			const p = document.createElement("p");
			run[0].before(p);
			p.append(...run);
		}
		run = [];
	};
	[...content.childNodes].forEach(node => {
		const inline =
			node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && INLINE.test(node.tagName));
		if (inline) run.push(node);
		else flush();
	});
	flush();
};
