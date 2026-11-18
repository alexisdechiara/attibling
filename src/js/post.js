import mediumZoom from "medium-zoom";
import fitvids from "fitvids";
import shave from "shave";
import Swiper from "swiper";
import { Navigation, A11y } from "swiper/modules";
import tocbot from "tocbot";
import "swiper/css";
import { isMobile, adjustImageGallery, managePostImages, makeImagesZoomable, onReady, contentHeight } from "./helpers";

let $animationWrapper = null;
let $progressCircle = null;
let lastScrollingY = window.scrollY;
let circumference = 0;
let isTicking = false;

const onScrolling = () => {
	lastScrollingY = window.scrollY;
	requestTicking();
};

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

const onResizing = () => {
	adjustShare(100);

	setTimeout(() => {
		setCircleStyles();
		requestTicking();
	}, 200);
};

const requestTicking = () => {
	if (!isTicking) {
		requestAnimationFrame(updating);
	}

	isTicking = true;
};

const updating = () => {
	const progressMax = contentHeight(document.querySelector(".js-post-content"));
	const percent = Math.ceil((lastScrollingY / progressMax) * 100);

	if (percent <= 100) {
		setProgress(percent);
	}

	isTicking = false;
};

const setCircleStyles = () => {
	const svg = $progressCircle.parentNode;
	const svgWidth = parseFloat(getComputedStyle(svg).width);
	const radiusCircle = svgWidth / 2;
	const borderWidth = isMobile() ? 2 : 3;

	svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgWidth}`);
	$progressCircle.setAttribute("stroke-width", borderWidth);
	$progressCircle.setAttribute("r", radiusCircle - (borderWidth - 1));
	$progressCircle.setAttribute("cx", radiusCircle);
	$progressCircle.setAttribute("cy", radiusCircle);

	circumference = radiusCircle * 2 * Math.PI;

	$progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
	$progressCircle.style.strokeDashoffset = circumference;
};

const setProgress = percent => {
	if (percent <= 100) {
		const offset = circumference - (percent / 100) * circumference;
		$progressCircle.style.strokeDashoffset = offset;
	}
};

const prepareProgressCircle = () => {
	$progressCircle = document.querySelector(".js-progress");

	setCircleStyles();
	updating();

	setTimeout(() => {
		$progressCircle.parentNode.style.opacity = 1;
	}, 300);
};

onReady(() => {
	$animationWrapper = document.querySelectorAll(".js-animation-wrapper");
	const $scrollButton = document.querySelectorAll(".js-scrolltop");
	const $recommendedSlider = document.querySelector(".js-recommended-slider");

	fitvids(".js-post-content");

	adjustImageGallery();
	adjustShare(1000);

	if ($recommendedSlider) {
		const recommendedSwiper = new Swiper(".js-recommended-slider", {
			modules: [Navigation, A11y],
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev",
			},
			slidesPerView: 1,
			allowTouchMove: true,
			loop: true,
			a11y: true,
			breakpoints: {
				720: {
					slidesPerView: 2,
					allowTouchMove: true,
					loop: true,
				},
				1024: {
					slidesPerView: 3,
					allowTouchMove: false,
					loop: false,
				},
			},
			on: {
				init: function () {
					shave(".js-article-card-title", 100);
					shave(".js-article-card-title-no-image", 250);
				},
			},
		});
	}

	shave(".js-article-card-title", 100);
	shave(".js-article-card-title-no-image", 250);

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

	window.addEventListener("scroll", onScrolling, { passive: true });
	window.addEventListener("resize", onResizing, { passive: true });
});

window.addEventListener("load", () => {
	prepareProgressCircle();
});
