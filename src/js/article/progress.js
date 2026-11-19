// Reading progress: the ring of the « back to the top » button where CSS scroll-driven animations are
// missing (progress.css draws it otherwise), the button itself, and, for members, the progress kept
// in the reader store for « Reprendre la lecture » on the home page (src/js/store.js keeps posts read
// between 10 % and 90 % only).
import { postFromElement, readingProgress } from "../store";
import { throttleToFrame } from "../helpers";

// Share of the content read, 0 to 1: from its top entering at the bottom of the viewport to its end
// doing so (the range the ring follows)
export const readShare = content => {
	const box = content.getBoundingClientRect();
	if (box.height <= 0) return 0;
	return Math.min(Math.max((window.innerHeight - box.top) / box.height, 0), 1);
};

export const setUpScrollTop = button => {
	button?.addEventListener("click", () => {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
	});
};

export const setUpProgressRing = content => {
	const circle = document.querySelector(".js-progress");
	if (!circle || !content || (CSS.supports("animation-timeline: view()") && CSS.supports("timeline-scope: --a"))) {
		return;
	}
	const update = () => {
		circle.style.strokeDashoffset = 100 - readShare(content) * 100;
	};
	update();
	window.addEventListener("scroll", throttleToFrame(update), { passive: true });
	window.addEventListener("resize", throttleToFrame(update), { passive: true });
	window.addEventListener("load", () => {
		update();
		setTimeout(() => (circle.ownerSVGElement.style.opacity = 1), 300);
	});
};

// Members: the progress is written at most once a second while scrolling, and when the page is left
export const setUpProgressStore = (content, article) => {
	if (!content || !article) return;
	const post = postFromElement(article);
	let last = -1;
	let lastWrite = 0;
	// Coming back to a post read half way and scrolling its first lines must not lose the place: the
	// kept progress only grows (past 90 % the store drops the post: it has been read)
	const save = force => {
		const kept = readingProgress.get(post.url)?.progress || 0;
		const progress = Math.max(Math.round(readShare(content) * 100) / 100, kept);
		const now = Date.now();
		if (progress === last || (!force && now - lastWrite < 1000)) return;
		last = progress;
		lastWrite = now;
		readingProgress.set({ ...post, progress });
	};
	let timer = null;
	window.addEventListener(
		"scroll",
		throttleToFrame(() => {
			save(false);
			clearTimeout(timer);
			timer = setTimeout(() => save(true), 400);
		}),
		{ passive: true },
	);
	window.addEventListener("pagehide", () => save(true));
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") save(true);
	});
};
