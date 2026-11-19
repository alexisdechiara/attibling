// « En bref »: the author's numbered points, an HTML card <ol class="en-bref"> at the top of the post
// (docs/guide-auteur.md). The CSS shows and styles it without any script (members only, unless the
// theme setting summary_for_visitors is on); this moves it into the box above the text, next to the
// series box (side by side in the « Immersif » style), and names the list for screen readers.
//
// Optional AI summary: an integration may store one with the post as <ol class="en-bref"
// data-source="ia"> (labelled « Résumé généré par IA »). The author's own summary wins when both exist.
export const setUpSummary = (content, intro) => {
	const summaries = [...content.querySelectorAll(".en-bref")];
	if (!summaries.length || !intro) return;
	const chosen = summaries.find(el => el.dataset.source !== "ia") || summaries[0];
	const label = getComputedStyle(chosen.closest("[data-article]") || document.documentElement)
		.getPropertyValue("--label-summary")
		.trim()
		.replace(/^["']|["']$/g, "");
	if (label) chosen.setAttribute("aria-label", label);
	// An HTML card wraps it in nothing, but Ghost may leave an empty paragraph around it
	const teaser = intro.querySelector("[data-summary-teaser]");
	intro.insertBefore(chosen, teaser);
	summaries.filter(el => el !== chosen).forEach(el => (el.hidden = true));
};
