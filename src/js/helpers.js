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
