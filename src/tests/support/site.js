// An in-memory Ghost site for rendering the templates in tests (see ghost.js): real titles and
// tags from geekly.blog, local placeholder images. createSite(options) returns
// { settings, posts, tags, authors, now }; every option can switch a part of the data off to test
// the fallbacks of the templates.
//  - image(post, index): feature image URL of a post, or null (default: a local SVG)
//  - ogImage(post, index) / twitterImage(post, index): the post's images set for sharing (Ghost
//    Admin > Post settings > Social preview), null by default as in Ghost when none is set
//  - tagImage(tag): feature image URL of a tag, or null
//  - featured: false to remove the "featured" flag from every post
//  - top: false to remove the #top / #top-N internal tags
//  - settings: merged over the default site settings
//  - extra: number of generated posts appended after the real ones (older, one every 9 days), to test
//    lists of more than 100 posts
//  - series: true to put the internal tag #serie-test on 3 posts (indexes 3, 6 and 9)
//  - authors: number of authors with published posts (default 1, a single-author site); the others
//    (up to 4 more) each write two posts (indexes 2n and 2n + 1 from the 3rd post), Alexis the rest

const TAGS = [
	["Actualité", "actualites", true],
	["Jeux vidéo", "jeux-video", true],
	["VF", "vf", false],
	["Anime", "anime", false],
	["IA", "ia", true],
	["Informatique", "informatique", true],
	["Dossier", "dossiers", true],
	["Test", "test", true],
	["Programmation", "programmation", false],
];

// title, slug, reading time, tag slugs (first public tag = primary), featured, internal tags
const POSTS = [
	["Les animes à voir en VF pour la saison d’hiver 2026", "anime-vf-hiver-2026", 4, ["anime", "vf"], false, []],
	[
		"Overwatch est-il en train de renaître ?",
		"overwatch-renaissance",
		11,
		["actualites", "jeux-video"],
		false,
		["#top", "#top-1"],
	],
	["Mon top des jeux auquel j’ai joué en 2025", "top-jeux-2025", 20, [], false, ["#top", "#top-4"]],
	["Hytale peut-il battre des records dès sa sortie ?", "hytale-records", 2, ["actualites", "jeux-video"], false, []],
	[
		"Pas encore lancé, Hytale se targue d’avoir des mods déjà prêts à sortir",
		"hytale-mods",
		2,
		["actualites", "jeux-video"],
		false,
		[],
	],
	[
		"Voici les votes (objectifs) de 4 IA pour les Game Awards",
		"votes-ia-game-awards",
		10,
		["actualites", "jeux-video", "ia"],
		false,
		[],
	],
	["Hytale est sauvé ! Qu’attendre du remplaçant à Minecraft ?", "hytale-sauve", 2, [], false, []],
	["Les animes à voir en VF pour la saison d’automne 2025", "anime-vf-automne-2025", 3, ["anime", "vf"], false, []],
	[
		"To Be Hero X : l’anime phénomène de l’année qui mérite plus de reconnaissance",
		"to-be-hero-x",
		3,
		["anime"],
		false,
		[],
	],
	[
		"Test de Dokploy : une alternative sérieuse à Coolify",
		"test-dokploy",
		7,
		["test", "programmation", "informatique"],
		true,
		[],
	],
	[
		"Annonce de Battlefield 6, le retour aux sources tant attendu ?",
		"battlefield-6",
		5,
		["actualites", "jeux-video"],
		false,
		[],
	],
	["Les animes à voir en VF pour la saison d’été 2025", "anime-vf-ete-2025", 4, ["anime", "vf"], true, []],
	["Quelle VF de WITCH WATCH choisir", "witch-watch-vf", 11, ["vf", "anime"], false, []],
	["Voici Knowless, une alternative gratuite à KCulture", "knowless", 7, ["informatique"], true, []],
	[
		"Le boss final d’Expedition 33 est trop simple ? Voici comment rééquilibrer le combat",
		"expedition-33-boss",
		3,
		["jeux-video"],
		false,
		[],
	],
	[
		"Anglais ou français, quelle est la véritable VO de Clair Obscur : Expedition 33 ?",
		"vo-clair-obscur",
		5,
		["jeux-video", "vf"],
		true,
		["#top", "#top-2"],
	],
	[
		"ChatGPT peut désormais générer des images et les réseaux sociaux s’en donnent à cœur joie",
		"chatgpt-images",
		3,
		["actualites", "ia"],
		false,
		[],
	],
	["Lorsque la paranoïa de l’IA s’installe dans le monde du doublage", "ia-doublage", 6, ["ia", "vf"], false, []],
	["Mon top des jeux auquel j’ai joué en 2024", "top-jeux-2024", 17, ["jeux-video"], true, []],
	[
		"Rockstar persiste à ne pas proposer de VF pour GTA VI et c’est un problème",
		"gta-vi-vf",
		9,
		["jeux-video", "vf"],
		true,
		["#top", "#top-3"],
	],
	["Bluesky peut-il devenir le Twitter de demain ?", "bluesky", 9, ["dossiers", "informatique"], false, ["#top"]],
	[
		"Quel est le meilleur format d’image pour le web ?",
		"format-image-web",
		13,
		["dossiers", "informatique"],
		false,
		[],
	],
	[
		"Game Awards : la cérémonie de plus en plus critiquée",
		"game-awards-critiques",
		18,
		["dossiers", "jeux-video"],
		false,
		[],
	],
	[
		"Le guide ultime pour un thème Windows adaptatif : mode sombre la nuit, mode clair le jour",
		"theme-windows",
		11,
		["dossiers", "informatique"],
		false,
		[],
	],
	["Où en sommes nous avec les IA génératives d’image ?", "ia-generatives-image", 11, ["dossiers", "ia"], false, []],
];

const slugToTag = slug => {
	if (slug.startsWith("#")) {
		const name = slug;
		return { id: `tag-${name}`, name, slug: `hash-${name.slice(1)}`, visibility: "internal", url: "/404/" };
	}
	const [name, , withImage] = TAGS.find(t => t[1] === slug);
	return { id: `tag-${slug}`, name, slug, visibility: "public", url: `/tag/${slug}/`, withImage };
};

export const createSite = (options = {}) => {
	const {
		image = (post, i) => `/src/tests/fixtures/photo.svg?${i}`,
		ogImage = () => null,
		twitterImage = () => null,
		tagImage = tag => (tag.withImage ? `/src/tests/fixtures/photo.svg?tag-${tag.slug}` : null),
		featured = true,
		top = true,
		settings = {},
		count = POSTS.length,
		extra = 0,
		series = false,
		authors: authorCount = 1,
	} = options;

	const author = {
		id: "author-1",
		name: "Alexis De Chiara",
		slug: "alexis",
		url: "/author/alexis/",
		profile_image: null,
		bio: "Développeur front-end et designer UX/UI, il écrit sur la culture geek.",
		twitter: "@geeklyFR",
	};

	const OTHERS = [
		{ name: "Camille Martin", slug: "camille", bio: "Elle teste les jeux indépendants.", location: "Lyon" },
		{
			name: "Jean-Baptiste de La Rochefoucauld-Montmorency",
			slug: "jean-baptiste",
			bio: null,
			website: "https://example.com",
		},
		{ name: "Inès", slug: "ines", bio: "Anime et doublage." },
		{ name: "Noé", slug: "noe", bio: null },
	];
	const others = OTHERS.slice(0, Math.max(0, authorCount - 1)).map((a, n) => ({
		id: `author-${n + 2}`,
		url: `/author/${a.slug}/`,
		profile_image: null,
		...a,
	}));
	const authorOf = i => (i >= 2 && others[Math.floor((i - 2) / 2)]) || author;

	const start = Date.UTC(2026, 2, 25, 9, 0, 0);
	const generated = Array.from({ length: extra }, (_, n) => [
		`Archive post ${n + 1}`,
		`archive-post-${n + 1}`,
		3,
		[n % 2 ? "informatique" : "anime"],
		false,
		[],
	]);
	const SERIES = [3, 6, 9];
	const posts = [...POSTS.slice(0, count), ...generated].map(
		([title, slug, minutes, tagSlugs, isFeatured, internal], i) => {
			const own = [...internal, ...(series && SERIES.includes(i) ? ["#serie-test"] : [])];
			const tags = [...tagSlugs, ...(top ? own : own.filter(t => !t.startsWith("#top")))].map(slugToTag);
			const post = {
				id: `post-${i + 1}`,
				uuid: `uuid-${i + 1}`,
				title,
				slug,
				url: `/${slug}/`,
				featured: featured && isFeatured,
				published_at: new Date(start - i * 9 * 86400000).toISOString(),
				reading_time: minutes,
				// Ghost's {{#get "posts"}} returns the html too (Content API, formats=html by default)
				html: "<p>Texte de l’article.</p>",
				custom_excerpt: null,
				excerpt:
					"L’année démarre très fort. On retrouve, dès cette première saison, pas mal de grosses licences qui reviennent, quelques suites très attendues, et aussi une ou deux nouveautés qui pourraient bien créer la surprise.",
				tags,
				primary_tag: tags.find(t => t.visibility === "public") || null,
				authors: [authorOf(i)],
				primary_author: authorOf(i),
			};
			post.feature_image = image(post, i);
			// Like Ghost 6 (posts_meta flattened onto the post by the Content API): always present, null
			// when the author set no image for sharing; Ghost's ghost_head falls back to the feature
			// image at render time only, never in these fields
			post.og_image = ogImage(post, i);
			post.twitter_image = twitterImage(post, i);
			return post;
		},
	);

	const tags = TAGS.map(([, slug]) => {
		const tag = slugToTag(slug);
		return {
			...tag,
			description: null,
			feature_image: tagImage(tag),
			count: { posts: posts.filter(p => p.tags.some(t => t.slug === slug)).length },
		};
	}).concat(
		["#top", "#top-1", "#top-2", "#top-3", "#top-4", ...(series ? ["#serie-test"] : [])].map(name => ({
			...slugToTag(name),
			count: { posts: 1 },
		})),
	);

	return {
		now: new Date(start).toISOString(),
		posts,
		tags,
		authors: [author, ...others].map(a => ({
			...a,
			count: { posts: posts.filter(p => p.primary_author.id === a.id).length },
		})),
		settings: {
			title: "Geekly",
			description: "L’actu geek, tech et pop",
			url: "http://theme.test",
			logo: null,
			icon: null,
			cover_image: null,
			twitter: "@geeklyFR",
			facebook: null,
			members_enabled: true,
			members_invite_only: false,
			paid_members_enabled: false,
			comments_enabled: true,
			comments_access: "all",
			navigation: [
				{ label: "Home", url: "/" },
				{ label: "Newsletter", url: "/newsletter/" },
				{ label: "Dossier", url: "/tag/dossiers/" },
				{ label: "News", url: "/tag/actualites/" },
			],
			secondary_navigation: [
				{ label: "About", url: "/about/" },
				{ label: "Contact", url: "/contact/" },
			],
			...settings,
		},
	};
};

// The context Ghost gives index.hbs for one page of the post list.
export const indexContext = (site, { page = 1, perPage = 7 } = {}) => {
	const sorted = [...site.posts].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
	const pages = Math.max(1, Math.ceil(sorted.length / perPage));
	return {
		posts: sorted.slice((page - 1) * perPage, page * perPage),
		pagination: {
			page,
			limit: perPage,
			pages,
			total: sorted.length,
			next: page < pages ? page + 1 : null,
			prev: page > 1 ? page - 1 : null,
		},
	};
};
