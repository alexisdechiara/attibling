// « À propos » (partials/pages/about.hbs): links the author typed in the page as an HTML card
// <ul class="about-links"><li><a href="…">GitHub</a></li>…</ul> join « Suivre le blog » (first, before
// the social icons and the RSS feed). Without JavaScript they stay where they were typed, styled the same way.
import { onReady } from "./helpers";

onReady(() => {
	const follow = document.querySelector("[data-about-follow]");
	document.querySelectorAll(".about__content .about-links").forEach(list => {
		follow.prepend(...list.children);
		const card = list.closest(".kg-card, .kg-html-card") || list;
		list.remove();
		if (card !== list && !card.textContent.trim()) card.remove();
	});
});
