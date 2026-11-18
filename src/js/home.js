import Swiper from "swiper";
import { Navigation, A11y } from "swiper/modules";
import "swiper/css";
import { onReady } from "./helpers";

onReady(() => {
	const $featuredSlider = document.querySelector(".js-featured-slider");

	if ($featuredSlider) {
		const numSlides = $featuredSlider.querySelectorAll(".swiper-slide").length;
		const featuredSwiper = new Swiper(".js-featured-slider", {
			modules: [Navigation, A11y],
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev",
			},
			a11y: true,
		});

		if (numSlides === 1) {
			$featuredSlider.querySelectorAll(".js-featured-slider-button").forEach(el => el.remove());
		}
	}
});
