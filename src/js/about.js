// « À propos » (partials/pages/about.hbs): links the author typed in the page as an HTML card
// <ul class="about-links"><li><a href="…">GitHub</a></li>…</ul> join « Suivre le blog », on their own
// line under the social icons and the RSS feed. The text cell is removed when nothing else was written
// in it. Without JavaScript the links stay where they were typed, styled the same way.
import { onReady } from "./helpers";

onReady(() => {
	const target = document.querySelector("[data-about-links]");
	const note = document.querySelector("[data-about-note]");
	if (!target || !note) return;
	note.querySelectorAll(".about-links").forEach(list => {
		target.append(...list.children);
		const card = list.closest(".kg-card, .kg-html-card") || list;
		list.remove();
		if (card !== list && !card.textContent.trim()) card.remove();
	});
	if (!note.textContent.trim() && !note.querySelector("img, iframe, video, figure")) note.remove();
});
