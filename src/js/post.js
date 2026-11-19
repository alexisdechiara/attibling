// Article page (post.hbs): content enhancements (embed ratios, galleries, zoomable images), table of
// contents, copy buttons, series box, « En bref », fiche de test structured data, reading progress
// (ring, back to the top, members' « Reprendre la lecture »), and the members' display settings.
import mediumZoom from "medium-zoom";
import {
	setEmbedRatios,
	adjustImageGallery,
	managePostImages,
	makeImagesZoomable,
	onReady,
	wrapLooseText,
} from "./helpers";
import { ensureHeadingIds, setUpCodeBlocks, setUpHeadingLinks } from "./article/copy";
import { setUpSeries } from "./article/series";
import { setUpSummary } from "./article/summary";
import { setUpReview } from "./article/review";
import { setUpToc } from "./article/toc";
import { setUpProgressRing, setUpProgressStore, setUpScrollTop } from "./article/progress";
import { setUpReadingSettings } from "./reading-settings";

onReady(() => {
	const article = document.querySelector("[data-article]");
	const content = document.querySelector("[data-article-content]");
	if (!article || !content) return;

	wrapLooseText(content);
	setEmbedRatios();
	adjustImageGallery();
	managePostImages();
	makeImagesZoomable(mediumZoom);

	setUpSummary(content, article.querySelector("[data-article-intro]"));
	document.querySelectorAll("[data-series]").forEach(setUpSeries);
	ensureHeadingIds(content);
	setUpToc(article.querySelector("[data-toc]"), content);
	setUpHeadingLinks(content);
	setUpCodeBlocks(content);
	setUpReview(content, article);

	setUpScrollTop(document.querySelector("[data-progress-button]"));
	setUpProgressRing(content);
	setUpProgressStore(content, article);
	setUpReadingSettings();
});
