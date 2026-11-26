// « Tags » page (partials/pages/tags.hbs). The grid is already arranged before the first paint by the
// inline script that follows it (src/js/tags/layout.js); this module adds:
//  - « Mélanger »: a new arrangement on demand, animated by a View Transition (a short move of the cells
//    elsewhere; none with reduced motion), announced politely, kept in history.state like the first one;
//  - the previews of the tags (src/js/tags/preview.js).
import { arrange, saveSeed } from "./tags/layout.js";
import { setUpPreviews } from "./tags/preview.js";
import { onReady } from "./helpers";

const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;

const visibleCells = grid =>
	[...grid.querySelectorAll(":scope > .tag-cell")].filter(cell => {
		const box = cell.getBoundingClientRect();
		return box.bottom > 0 && box.top < innerHeight;
	});

// Moves the cells to their new place: a View Transition where available, else the visible cells slide
// from their old position (FLIP)
const animate = (grid, update) => {
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
	const before = visibleCells(grid);
	if (document.startViewTransition) {
		for (const cell of before) cell.style.viewTransitionName = `tag-cell-${cell.dataset.rank}`;
		const transition = document.startViewTransition(update);
		transition.finished.finally(() => {
			for (const cell of before) cell.style.viewTransitionName = "";
		});
		return transition;
	}
	const from = new Map(before.map(cell => [cell, cell.getBoundingClientRect()]));
	update();
	for (const [cell, old] of from) {
		const now = cell.getBoundingClientRect();
		cell.animate(
			[
				{ transform: `translate(${old.left - now.left}px, ${old.top - now.top}px)`, opacity: 0.6 },
				{ transform: "none" },
			],
			{ duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
		);
	}
};

onReady(() => {
	const page = document.querySelector("[data-tags-page]");
	const grid = page?.querySelector("[data-tag-bento]");
	if (!grid) return;
	const previews = setUpPreviews(page, grid);
	const button = page.querySelector("[data-tags-shuffle]");
	const status = page.querySelector("[data-tags-status]");
	if (!button || !grid.hasAttribute("data-arranged")) return;
	let announced = false;
	button.addEventListener("click", () => {
		previews.close();
		const seed = newSeed();
		animate(grid, () => arrange(grid, seed));
		try {
			saveSeed(seed);
		} catch {
			// history.state unavailable: going back draws a new arrangement
		}
		// A different text each time, so that every shuffle is announced
		announced = !announced;
		status.textContent = status.dataset.i18nShuffled + (announced ? "" : " ");
	});
});
