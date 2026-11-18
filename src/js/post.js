import mediumZoom from "medium-zoom";
import tocbot from "tocbot";
import {
	isMobile,
	setEmbedRatios,
	adjustImageGallery,
	managePostImages,
	makeImagesZoomable,
	onReady,
	throttleToFrame,
} from "./helpers";

let $animationWrapper = null;

const adjustShare = timeout => {
	if (!isMobile("1023px")) {
		document.body.classList.remove("share-menu-displayed");
	} else {
		document.body.classList.add("share-menu-displayed");
		setTimeout(() => {
			$animationWrapper.forEach(el => el.removeAttribute("data-animate"));
		}, timeout);
	}
};

// The reading progress ring is a CSS scroll-driven animation (see icon-button.css). Where that is
// missing, draw it here over the same range: from the top of the post content coming in at the
// bottom of the viewport to its end doing so.
const followReadingProgress = () => {
	const circle = document.querySelector(".js-progress");
	const content = document.querySelector(".js-post-content");

	if (!circle || !content || (CSS.supports("animation-timeline: view()") && CSS.supports("timeline-scope: --a"))) {
		return;
	}

	const update = () => {
		const box = content.getBoundingClientRect();
		const progress = Math.min(Math.max((window.innerHeight - box.top) / box.height, 0), 1);
		circle.style.strokeDashoffset = 100 - progress * 100;
	};

	update();
	window.addEventListener("scroll", throttleToFrame(update), { passive: true });
	window.addEventListener("resize", throttleToFrame(update), { passive: true });
	window.addEventListener("load", () => {
		update();
		setTimeout(() => (circle.ownerSVGElement.style.opacity = 1), 300);
	});
};

onReady(() => {
	$animationWrapper = document.querySelectorAll(".js-animation-wrapper");
	const $scrollButton = document.querySelectorAll(".js-scrolltop");

	setEmbedRatios();

	adjustImageGallery();
	adjustShare(1000);

	$scrollButton.forEach(el =>
		el.addEventListener("click", () => {
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

			window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
		}),
	);

	managePostImages();
	makeImagesZoomable(mediumZoom);

	if (document.querySelector(".toc")) {
		tocbot.init({
			tocSelector: ".toc",
			contentSelector: ".post-content",
			headingSelector: "h2, h3, h4",
			hasInnerContainers: true,
		});
	}

	followReadingProgress();
	window.addEventListener("resize", () => adjustShare(100), { passive: true });
});
