import { onReady, setUpSlider } from "./helpers";

onReady(() => {
	document.querySelectorAll(".js-featured-slider").forEach(setUpSlider);
});
