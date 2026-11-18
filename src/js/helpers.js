export const isRTL = () => {
	const $html = document.querySelector("html");
	return ["ar", "he", "fa"].includes($html.getAttribute("lang"));
};

export const isMobile = (width = "768px") => {
	return window.matchMedia(`(max-width: ${width})`).matches;
};

export const getParameterByName = (name, url) => {
	if (!url) url = window.location.href;

	name = name.replace(/[\[\]]/g, "\\$&");

	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
	const results = regex.exec(url);

	if (!results) return null;

	if (!results[2]) return "";

	return decodeURIComponent(results[2].replace(/\+/g, " "));
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
		panel.addEventListener("beforetoggle", event => {
			if (event.newState === "open") position();
		});
		panel.addEventListener("toggle", event => onToggle(event.newState === "open"));
		return { isOpen, close: () => isOpen() && panel.hidePopover() };
	}

	// Without the Popover API the browser ignores these attributes: handle the button here
	button.removeAttribute("popovertarget");
	panel.removeAttribute("popover");
	const toggle = open => {
		if (open) position();
		panel.classList.toggle("is-open", open);
		button.setAttribute("aria-expanded", String(open));
		onToggle(open);
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

export const onReady = callback => {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, { once: true });
	} else {
		callback();
	}
};

// Content height of an element, excluding padding.
export const contentHeight = el => {
	const style = getComputedStyle(el);
	return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
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
