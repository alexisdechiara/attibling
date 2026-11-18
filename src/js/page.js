import fitvids from "fitvids";
import mediumZoom from "medium-zoom";
import { adjustImageGallery, managePostImages, makeImagesZoomable, onReady } from "./helpers";

onReady(() => {
	fitvids(".js-post-content");

	adjustImageGallery();
	managePostImages();
	makeImagesZoomable(mediumZoom);
});
