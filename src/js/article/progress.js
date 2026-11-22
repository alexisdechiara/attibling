// Reading progress: the ring of the « back to the top » button where CSS scroll-driven animations are
// missing (progress.css draws it otherwise), the button itself, and, for members, the progress kept
// in the reader store for « Reprendre la lecture » on the home page (src/js/store.js keeps posts read
// between 10 % and 90 % only).
import { isAvailable, postFromElement, readingProgress } from "../store";
import { throttleToFrame } from "../helpers";

// Share of the content read, 0 to 1: from its top entering at the bottom of the viewport to its end
// doing so (the range the ring follows)
export const readShare = content => {
	const box = content.getBoundingClientRect();
	if (box.height <= 0) return 0;
	return Math.min(Math.max((window.innerHeight - box.top) / box.height, 0), 1);
};

// What the button must never sit on: a control of the page. Frames, players and embed facades count
// whole (their own buttons, YouTube's for one, are in their corner); a control much larger than the
// button (a whole tile that is a link) only when the button covers a good part of it.
const CONTROL = 'a[href], button, input, select, textarea, summary, label, [tabindex]:not([tabindex="-1"])';
const WHOLE = "iframe, video, audio, [data-embed-facade]";

const coversControl = button => {
	const r = button.getBoundingClientRect();
	const margin = 6;
	const [left, top, right, bottom] = [r.left - margin, r.top - margin, r.right + margin, r.bottom + margin];
	const points = [
		[(left + right) / 2, (top + bottom) / 2],
		[left, top],
		[right, top],
		[left, bottom],
		[right, bottom],
		[(left + right) / 2, top],
		[left, (top + bottom) / 2],
	];
	const area = (right - left) * (bottom - top);
	for (const [x, y] of points) {
		for (const el of document.elementsFromPoint(x, y)) {
			if (el === button || button.contains(el)) continue;
			if (el.closest(WHOLE)) return true;
			const control = el.closest(CONTROL);
			if (!control) continue;
			const box = control.getBoundingClientRect();
			const overlap =
				Math.max(0, Math.min(right, box.right) - Math.max(left, box.left)) *
				Math.max(0, Math.min(bottom, box.bottom) - Math.max(top, box.top));
			if (overlap >= Math.min(area, box.width * box.height) * 0.2) return true;
		}
	}
	return false;
};

// The button shows once the reader has scrolled a screen down (near the top there is nothing to go
// back to), and steps aside while it would cover a control (data-shown otherwise, progress.css)
export const setUpScrollTop = button => {
	if (!button) return;
	button.addEventListener("click", () => {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
	});
	const update = () => {
		const away = window.scrollY < window.innerHeight || coversControl(button);
		// Never taken from under the focus: a keyboard user on the button keeps it
		button.toggleAttribute("data-shown", !away || document.activeElement === button);
	};
	update();
	window.addEventListener("scroll", throttleToFrame(update), { passive: true });
	window.addEventListener("resize", throttleToFrame(update), { passive: true });
	window.addEventListener("load", update, { once: true });
	button.addEventListener("blur", update);
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
	// Visitors, or storage that does not work: nothing to record, so no listeners and no measuring
	if (!content || !article || !isAvailable()) return;
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
