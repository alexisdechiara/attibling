// Fiche de test (HTML card <aside class="fiche-test">, docs/guide-auteur.md): adds Review structured
// data (JSON-LD) for search engines, only when the card gives a score such as « 8,5/10 », a type of
// reviewed item that Google shows review snippets for (data-type), and the post has an author name.
export const parseScore = value => {
	const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*(?:\/|sur|out of)\s*(\d+(?:[.,]\d+)?)/i);
	if (!match) return null;
	const rating = Number(match[1].replace(",", "."));
	const best = Number(match[2].replace(",", "."));
	return rating >= 0 && best > 0 && rating <= best ? { rating, best } : null;
};

// The types of itemReviewed Google accepts for a review snippet (Search Central, « Review snippet »,
// read in November 2026), then schema.org subtypes of them that a blog reviews. Any other type, such as
// the generic CreativeWork, is valid schema.org but earns no snippet and a warning in Search Console:
// without one of these, no structured data is written at all.
const REVIEWED_TYPES = [
	"Book",
	"Course",
	"CreativeWorkSeason",
	"CreativeWorkSeries",
	"Episode",
	"Event",
	"Game",
	"HowTo",
	"LocalBusiness",
	"MediaObject",
	"Movie",
	"MusicPlaylist",
	"MusicRecording",
	"Organization",
	"Product",
	"Recipe",
	"SoftwareApplication",
	// Subtypes: of Game and SoftwareApplication
	"VideoGame",
	"MobileApplication",
	"WebApplication",
	// of CreativeWorkSeries, CreativeWorkSeason and Episode
	"TVSeries",
	"MovieSeries",
	"BookSeries",
	"VideoGameSeries",
	"PodcastSeries",
	"TVSeason",
	"PodcastSeason",
	"TVEpisode",
	"PodcastEpisode",
	// of Book, MusicPlaylist and MediaObject
	"Audiobook",
	"MusicAlbum",
	"AudioObject",
	"VideoObject",
];

// The type as schema.org spells it, whatever the case the author typed; null when it is not one of them
export const reviewedType = value => {
	const wanted = String(value || "")
		.trim()
		.toLowerCase();
	return REVIEWED_TYPES.find(type => type.toLowerCase() === wanted) || null;
};

export const setUpReview = (content, article) => {
	const card = content.querySelector(".fiche-test");
	if (!card || document.querySelector("script[data-review-jsonld]")) return;
	const score = parseScore(card.querySelector(".fiche-test__note")?.textContent);
	const name = card.querySelector("h2, .fiche-test__titre")?.textContent.trim();
	const type = reviewedType(card.dataset.type);
	const author = article?.dataset.author?.trim();
	if (!score || !name || !type || !author) return;
	// The verdict sentence, without its « Verdict · » label (the <strong> that starts it)
	const verdictEl = card.querySelector(".fiche-test__verdict")?.cloneNode(true);
	verdictEl?.querySelector(":scope > strong:first-child")?.remove();
	const verdict = verdictEl?.textContent.replace(/^[\s·:–—-]+/, "").trim();
	const data = {
		"@context": "https://schema.org",
		"@type": "Review",
		itemReviewed: { "@type": type, name },
		reviewRating: { "@type": "Rating", ratingValue: score.rating, bestRating: score.best, worstRating: 0 },
		author: { "@type": "Person", name: author },
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
