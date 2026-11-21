// Ready-made `render` options for harness.open() on the article template (post.hbs):
//   open({ render: article() })                                    visitor, default settings
//   open({ render: article({ member: true, html: SUMMARY_CARD }) })  a member, with « En bref »
//   open({ render: article({ series: { parts: 24, published: 12, current: 12, description: "… total: 24" } }) })
// Options:
//  - member        true for a signed-in member
//  - custom        @custom settings merged over the theme defaults (ARTICLE_CUSTOM)
//  - html          the post content (default LONG_HTML: headings, paragraphs, a figure, code)
//  - internal      internal tag names of the post, e.g. ["#mis-a-jour", "#immersif"]
//  - series        { parts, published, current, description }: the post is part `current` of a
//                  series of `published` published parts (the others are scheduled: not in the site)
//  - image         feature image URL or null
//  - pages         pages of the site (default: an « À propos » page, slug a-propos)
//  - tags          public tag slugs of the post (default actualites, jeux-video)
//  - authors       number of authors with published posts (default 1: single-author site)
//  - comments      Settings > Membership > Commenting: "all" (default), "paid" or "off"
//  - paid          true for a paid member (with member: true)
import { createSite } from "./site.js";
import { DEFAULT_CUSTOM } from "./pages.js";

export const MEMBER = { uuid: "member-1", email: "reader@example.com", name: "Reader", paid: false };

// Theme settings as Ghost gives them by default (package.json config.custom)
export const ARTICLE_CUSTOM = {
	...DEFAULT_CUSTOM,
	article_style: "Card",
	reading_settings: true,
	summary_for_visitors: false,
	about_page: "",
};

const words = n =>
	Array.from({ length: n }, (_, i) => (i % 9 === 8 ? "anticonstitutionnellement" : "lecture")).join(" ");
const paragraph = n => `<p>${words(n)}.</p>`;

export const LONG_HTML = [
	paragraph(120),
	'<h2 id="premiere-partie">Première partie</h2>',
	paragraph(140),
	'<h3 id="un-detail">Un détail</h3>',
	paragraph(140),
	'<figure class="kg-card kg-image-card kg-card-hascaption"><img src="/src/tests/fixtures/photo.svg?content" class="kg-image" alt="Une image" width="1600" height="900" loading="lazy"><figcaption>Une légende</figcaption></figure>',
	paragraph(160),
	'<h2 id="deuxieme-partie">Deuxième partie</h2>',
	'<pre><code class="language-bash">curl -sSL https://example.com/install.sh | sh</code></pre>',
	paragraph(200),
	'<h2 id="conclusion">Conclusion</h2>',
	paragraph(220),
].join("");

// The documented « En bref » snippet (docs/guide-auteur.md)
export const SUMMARY_CARD = `<!--kg-card-begin: html-->
<ol class="en-bref">
  <li>Blizzard relance son jeu avec une saison par an et une vraie histoire.</li>
  <li>Cinq nouveaux héros arrivent dès la première saison.</li>
  <li>Les problèmes d’équilibrage persistent malgré tout.</li>
</ol>
<!--kg-card-end: html-->`;

// The same, written by an optional AI integration
export const AI_SUMMARY_CARD = `<!--kg-card-begin: html-->
<ol class="en-bref" data-source="ia">
  <li>Point généré un.</li>
  <li>Point généré deux.</li>
</ol>
<!--kg-card-end: html-->`;

// The documented « Fiche de test » snippet (docs/guide-auteur.md)
export const REVIEW_CARD = `<!--kg-card-begin: html-->
<aside class="fiche-test">
  <p class="fiche-test__type">Fiche de test</p>
  <h2 class="fiche-test__titre">Jeu Fictif 2077</h2>
  <p class="fiche-test__note"><strong>8,5</strong>/10</p>
  <dl class="fiche-test__infos">
    <dt>Plateformes</dt><dd>PC, PS5</dd>
    <dt>Genre</dt><dd>Action-RPG</dd>
  </dl>
  <div class="fiche-test__plus">
    <p>Points forts</p>
    <ul><li>Direction artistique</li><li>Bande-son</li><li>Durée de vie</li></ul>
  </div>
  <div class="fiche-test__moins">
    <p>Points faibles</p>
    <ul><li>Quelques bugs</li><li>Interface chargée</li></ul>
  </div>
  <p class="fiche-test__verdict"><strong>Verdict</strong> · Un excellent jeu, à quelques détails près.</p>
</aside>
<!--kg-card-end: html-->`;

const internalTag = name => ({
	id: `tag-${name}`,
	name,
	slug: `hash-${name.slice(1)}`,
	visibility: "internal",
	url: "/404/",
	description: null,
});

export const article = (options = {}) => {
	const {
		member = false,
		custom = {},
		html = LONG_HTML,
		internal = [],
		series = null,
		image = "/src/tests/fixtures/photo.svg?header",
		pages = [{ id: "page-1", title: "À propos", slug: "a-propos", url: "/a-propos/" }],
		tags = ["actualites", "jeux-video"],
		authors = 1,
		comments = "all",
		paid = false,
	} = options;
	const site = createSite({ authors });
	// Settings > Membership > Commenting: @site.comments_enabled (boolean) and @site.comments_access
	site.settings.comments_enabled = comments !== "off";
	site.settings.comments_access = comments;
	const base = site.posts[1];
	const publicTags = tags.map(slug => site.tags.find(t => t.slug === slug)).filter(Boolean);
	const post = {
		...base,
		// As the Content API gives a public post: access, and comments = access and commenting not off
		comment_id: base.id,
		access: true,
		comments: comments !== "off",
		html,
		feature_image: image,
		updated_at: "2026-06-02T10:00:00.000Z",
		tags: [...publicTags, ...internal.map(internalTag)],
		primary_tag: publicTags[0] || null,
	};
	site.posts[1] = post;

	if (series) {
		const tag = {
			...internalTag("#serie-test"),
			description: series.description ?? null,
		};
		const start = Date.UTC(2025, 11, 1, 8, 0, 0);
		const parts = Array.from({ length: series.published }, (_, i) => {
			const number = i + 1;
			if (number === series.current) return post;
			return {
				...base,
				id: `part-${number}`,
				uuid: `part-uuid-${number}`,
				title: `Jour ${number} — partie de la série`,
				slug: `serie-partie-${number}`,
				url: `/serie-partie-${number}/`,
				featured: false,
				published_at: new Date(start + i * 86400000).toISOString(),
				tags: [tag],
				primary_tag: null,
			};
		});
		post.published_at = new Date(start + (series.current - 1) * 86400000).toISOString();
		post.tags = [...post.tags, tag];
		site.posts.push(...parts.filter(p => p !== post));
	}

	site.pages = pages;
	return {
		template: "post",
		site,
		context: { post },
		contexts: ["post"],
		member: member ? { ...MEMBER, paid } : null,
		custom: { ...ARTICLE_CUSTOM, ...custom },
		locale: options.locale || "fr",
	};
};
