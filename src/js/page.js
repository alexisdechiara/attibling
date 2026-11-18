import mediumZoom from "medium-zoom";
import { setEmbedRatios, adjustImageGallery, managePostImages, makeImagesZoomable, onReady } from "./helpers";

onReady(() => {
	setEmbedRatios();

	adjustImageGallery();
	managePostImages();
	makeImagesZoomable(mediumZoom);
});
