import mediumZoom from "medium-zoom";
import {
	setEmbedRatios,
	adjustImageGallery,
	managePostImages,
	makeImagesZoomable,
	onReady,
	wrapLooseText,
} from "./helpers";

onReady(() => {
	document.querySelectorAll(".gh-content").forEach(wrapLooseText);
	setEmbedRatios();

	adjustImageGallery();
	managePostImages();
	makeImagesZoomable(mediumZoom);
});
