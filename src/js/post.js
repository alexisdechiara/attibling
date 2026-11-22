// Article page (post.hbs): content enhancements (embed ratios, galleries, zoomable images), table of
// contents, copy buttons, series box, « En bref », fiche de test structured data, reading progress
// (ring, back to the top, members' « Reprendre la lecture »), the members' display settings, and Ghost's
// comments, loaded when the reader gets near them.
import mediumZoom from "medium-zoom";
import {
	setEmbedRatios,
	adjustImageGallery,
	managePostImages,
	makeImagesZoomable,
	markPrintLinks,
	onReady,
	runEach,
	wrapLooseText,
} from "./helpers";
import { ensureHeadingIds, setUpCodeBlocks, setUpHeadingLinks } from "./article/copy";
import { setUpSeries } from "./article/series";
import { setUpSummary } from "./article/summary";
import { setUpReview } from "./article/review";
import { setUpToc } from "./article/toc";
import { setUpProgressRing, setUpProgressStore, setUpScrollTop } from "./article/progress";
import { setUpReadingSettings } from "./reading-settings";
import { setUpComments } from "./article/comments";

onReady(() => {
	// First, so that nothing below can keep the comments from loading
	setUpComments(document.querySelector("[data-comments]"));

	const article = document.querySelector("[data-article]");
	const content = document.querySelector("[data-article-content]");
	if (!article || !content) return;

	// Each on its own (runEach): content the theme did not foresee must not cost the reader the rest
	runEach(
		() => wrapLooseText(content),
		() => markPrintLinks(content),
		setEmbedRatios,
		adjustImageGallery,
		managePostImages,
		() => makeImagesZoomable(mediumZoom),

		() => setUpSummary(content, article.querySelector("[data-article-intro]")),
		() => document.querySelectorAll("[data-series]").forEach(setUpSeries),
		() => ensureHeadingIds(content),
		() => setUpToc(article.querySelector("[data-toc]"), content),
		() => setUpHeadingLinks(content),
		() => setUpCodeBlocks(content),
		() => setUpReview(content, article),

		() => setUpScrollTop(document.querySelector("[data-progress-button]")),
		() => setUpProgressRing(content),
		() => setUpProgressStore(content, article),
		setUpReadingSettings,
	);
});
