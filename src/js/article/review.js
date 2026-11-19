// Fiche de test (HTML card <aside class="fiche-test">, docs/guide-auteur.md): adds Review structured
// data (JSON-LD) for search engines, only when the card gives a score such as « 8,5/10 ».
export const parseScore = value => {
	const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*(?:\/|sur|out of)\s*(\d+(?:[.,]\d+)?)/i);
	if (!match) return null;
	const rating = Number(match[1].replace(",", "."));
	const best = Number(match[2].replace(",", "."));
	return rating >= 0 && best > 0 && rating <= best ? { rating, best } : null;
};

export const setUpReview = (content, article) => {
	const card = content.querySelector(".fiche-test");
	if (!card || document.querySelector("script[data-review-jsonld]")) return;
	const score = parseScore(card.querySelector(".fiche-test__note")?.textContent);
	const name = card.querySelector("h2, .fiche-test__titre")?.textContent.trim();
	if (!score || !name) return;
	// The verdict sentence, without its « Verdict · » label (the <strong> that starts it)
	const verdictEl = card.querySelector(".fiche-test__verdict")?.cloneNode(true);
	verdictEl?.querySelector(":scope > strong:first-child")?.remove();
	const verdict = verdictEl?.textContent.replace(/^[\s·:–—-]+/, "").trim();
	const data = {
		"@context": "https://schema.org",
		"@type": "Review",
		itemReviewed: { "@type": card.dataset.type || "CreativeWork", name },
		reviewRating: { "@type": "Rating", ratingValue: score.rating, bestRating: score.best, worstRating: 0 },
		author: { "@type": "Person", name: article?.dataset.author || "" },
		datePublished: article?.dataset.published || undefined,
		reviewBody: verdict || undefined,
		url: location.origin + location.pathname,
	};
	const script = document.createElement("script");
	script.type = "application/ld+json";
	script.dataset.reviewJsonld = "";
	script.textContent = JSON.stringify(data);
	document.head.append(script);
};
