// Seed data: site settings, authors, tags, posts, pages, navigation. Everything is invented and
// contains NO external link (the seed refuses any http(s) URL that is not the local instance).
import { composeBody, enBref, ficheTest, figure } from "./compose.mjs";

export const SITE = {
	title: "GEEKLY",
	description: "L'actu geek, tech et pop",
	locale: "fr",
	timezone: "Europe/Paris",
	accent_color: "#4285F4",
};

export const NAV_PRIMARY = [
	{ label: "Actualités", url: "/tag/actualites/" },
	{ label: "Jeux vidéo", url: "/tag/jeux-video/" },
	{ label: "Anime", url: "/tag/anime/" },
	{ label: "IA", url: "/tag/ia/" },
	{ label: "Dossiers", url: "/tag/dossiers/" },
	{ label: "Test", url: "/tag/test/" },
];
export const NAV_SECONDARY = [
	{ label: "Tags", url: "/tags/" },
	{ label: "Archives", url: "/archives/" },
	{ label: "Auteurs", url: "/authors/" },
	{ label: "À propos", url: "/a-propos/" },
	{ label: "Mentions légales", url: "/mentions-legales/" },
];

// Theme settings (package.json config.custom). Image settings are filled by the seed.
export const THEME_SETTINGS = {
	use_geekly_logo: true,
	arrival_animation: true,
	page_transitions: true,
	home_row_1: "jeux-video",
	home_row_2: "anime",
	home_row_3: "actualites",
	home_row_4: "ia",
	home_row_5: "dossiers",
	article_style: "Card",
	reading_settings: true,
	summary_for_visitors: false,
	embed_consent: true,
	consent_notice: "Notice",
	consent_tools: false,
	about_tags: "actualites,jeux-video,anime,dossiers,ia,test",
	about_page: "",
	subscribe_url: "",
};

export const AUTHORS = {
	alexis: {
		email: "alexis@geekly.test",
		name: "Alexis Moreau",
		slug: "alexis",
		bio: "Développeur et rédacteur. GEEKLY, c'est mon terrain de jeu : j'y écris sur les jeux, l'IA et tout ce qui m'occupe en dehors du travail.",
		location: "Nice, France",
		profile_image: "author-alexis.jpg",
		cover_image: "author-alexis-cover.jpg",
	},
	lea: {
		email: "lea@geekly.test",
		name: "Léa Fontaine",
		slug: "lea",
		bio: "Traductrice et passionnée d'animation japonaise. Je suis les saisons d'anime, le doublage français et les films de studios indépendants.",
		location: "Lyon, France",
		profile_image: "author-lea.jpg",
		cover_image: "author-lea-cover.jpg",
	},
};

export const TAGS = [
	{
		slug: "jeux-video",
		name: "Jeux vidéo",
		image: "tag-jeux-video.jpg",
		description: "L'actualité des jeux qui m'intéressent, mes avis et mes tops de l'année.",
	},
	{
		slug: "anime",
		name: "Anime",
		image: "tag-anime.jpg",
		description: "Les séries à voir en VF chaque saison, et le doublage en général.",
	},
	{
		slug: "actualites",
		name: "Actualités",
		image: "tag-actualites.jpg",
		description: "Ce qui bouge dans la tech, le jeu vidéo et la pop culture, avec mon avis.",
	},
	{
		slug: "ia",
		name: "IA",
		image: "tag-ia.jpg",
		description: "Les outils et les débats autour de l'intelligence artificielle.",
	},
	{
		slug: "dossiers",
		name: "Dossiers",
		image: "tag-dossiers.jpg",
		description: "Les articles longs, quand un sujet mérite qu'on s'y arrête.",
	},
	{
		slug: "test",
		name: "Test",
		image: "tag-test.jpg",
		description: "Logiciels, services et jeux essayés pour de bon.",
	},
	// internal tags used by the theme (name starts with #; Ghost gives them the slug hash-…)
	{ name: "#top", description: "Les plus lus (accueil)" },
	...[1, 2, 3, 4, 5].map(n => ({ name: `#top-${n}`, description: `Rang ${n} des plus lus` })),
	{ name: "#immersif", description: "Force le style Immersif" },
	{ name: "#carte", description: "Force le style Carte" },
	{ name: "#mis-a-jour", description: "Affiche « Mis à jour le … »" },
	{ name: "#serie-pixel-memoire", description: "Pixel & Mémoire · total: 6" },
];

const SERIE = "#serie-pixel-memoire";
const top = n => (n ? ["#top", `#top-${n}`] : ["#top"]);

// ---------------------------------------------------------------- posts
// domain = prose pool; tags: first one is the main tag. `img` = feature image (see gen-images.py).
const P = o => o;
export const POSTS = [
	P({
		slug: "aether-drifters-la-bonne-surprise-de-l-automne",
		title: "Aether Drifters : la bonne surprise de l'automne",
		subject: "Aether Drifters",
		domain: "jeux-video",
		words: 780,
		author: "alexis",
		date: "2026-11-19T09:30:00Z",
		tags: ["jeux-video", "test", ...top(1)],
		featured: true,
		img: "f01-jv-dark.jpg",
		excerpt:
			"Un monde en suspension, des combats lisibles et une bande-son qui reste en tête : nous avons passé vingt heures dans Aether Drifters, et ce n'est pas fini.",
		lead: "Personne n'attendait vraiment <em>Aether Drifters</em>, et c'est sans doute pour cela que la surprise est aussi belle : un petit studio, un monde fait d'îles flottantes et une ambition mesurée, tenue de bout en bout.",
		fiche: {
			type: "VideoGame",
			titre: "Aether Drifters",
			note: "8,5",
			infos: [
				["Plateformes", "PC, PS5, Xbox Series, Switch"],
				["Genre", "Action-aventure"],
				["Développeur", "Studio Brume (fictif)"],
				["Durée", "18 à 25 heures"],
				["Testé sur", "PC (clé fournie par l'éditeur)"],
				["Prix", "34,99 €"],
			],
			plus: [
				"Direction artistique éblouissante",
				"Combats lisibles et variés",
				"Bande-son mémorable",
				"Excellent rapport durée / prix",
			],
			moins: ["Menus un peu chargés", "Quelques bugs mineurs", "Fin de partie un peu longue"],
			verdict: "Une aventure généreuse, soignée et rafraîchissante, à quelques détails près.",
		},
	}),
	P({
		slug: "un-grand-salon-du-jeu-annonce-pour-le-printemps",
		title: "Un grand salon du jeu annoncé pour le printemps",
		subject: "le salon",
		domain: "actualites",
		words: 460,
		author: "alexis",
		date: "2026-11-18T08:00:00Z",
		tags: ["actualites", ...top(5)],
		featured: true,
		img: "f15-ac-geo.jpg",
		excerpt:
			"Les organisateurs ont dévoilé les dates, le lieu et les premiers exposants d'une édition qui promet d'être la plus ouverte au grand public.",
		lead: "C'est officiel : le prochain grand rendez-vous du jeu vidéo en France aura lieu au printemps, et les organisateurs promettent un format repensé.",
	}),
	P({
		slug: "hoshi-no-koro-notre-avis-sur-la-saison-2",
		title: "Hoshi no Kōro : notre avis sur la saison 2",
		subject: "Hoshi no Kōro",
		domain: "anime",
		words: 700,
		author: "lea",
		date: "2026-11-17T17:00:00Z",
		tags: ["anime", "test", ...top(2)],
		featured: true,
		img: "f09-an-aurora.jpg",
		excerpt:
			"La suite d'une des séries les plus attendues de l'année tient-elle ses promesses ? Notre avis, sans spoiler, après avoir vu les douze épisodes.",
		lead: "Douze épisodes plus tard, la deuxième saison de <em>Hoshi no Kōro</em> est terminée, et il faut bien l'avouer : nous n'avions pas vu passer les semaines.",
		fiche: {
			type: "TVSeries",
			titre: "Hoshi no Kōro, saison 2",
			note: "9",
			sur: 10,
			infos: [
				["Format", "12 épisodes de 24 minutes"],
				["Studio", "Atelier Hoshi (fictif)"],
				["Genre", "Drame, fantastique"],
				["Disponibilité", "Streaming, VOSTFR et VF"],
			],
			plus: ["Animation éblouissante", "Écriture des personnages", "Musique originale"],
			moins: ["Un épisode 7 plus faible", "Final qui divisera"],
			verdict: "Une suite maîtrisée, qui prolonge la première saison sans la trahir.",
		},
	}),
	P({
		slug: "dix-usages-concrets-d-un-assistant-ia-pour-un-blog",
		title: "Dix usages concrets d'un assistant IA pour un blog",
		subject: "l'assistant",
		domain: "ia",
		words: 640,
		author: "alexis",
		date: "2026-11-16T10:00:00Z",
		tags: ["ia"],
		img: "f21-ia-aurora.jpg",
		longList: true,
		excerpt:
			"Brouillons, titres, relecture, accessibilité : ce qui marche vraiment dans notre quotidien de rédaction, et ce que nous n'oserions jamais déléguer.",
		lead: "Depuis un an, nous avons intégré un assistant IA à notre quotidien de rédaction. Voici ce qui fonctionne, ce qui ne fonctionne pas, et ce que nous gardons pour nous.",
	}),
	P({
		slug: "les-annonces-a-retenir-de-la-conference-de-novembre",
		title: "Les annonces à retenir de la conférence de novembre",
		subject: "la conférence",
		domain: "actualites",
		extra: ["jeux-video"],
		words: 620,
		author: "alexis",
		date: "2026-11-14T19:00:00Z",
		tags: ["actualites"],
		img: "f19-ac-dark.jpg",
		excerpt:
			"Trois heures de présentation, une dizaine d'annonces : voici l'essentiel de la conférence, sans le bruit.",
		enBref: [
			"Trois jeux inédits annoncés pour le premier semestre de l'an prochain.",
			"Une nouvelle manette adaptative, sans date ni prix pour l'instant.",
			"Un abonnement familial à tarif réduit, disponible en Europe dès janvier.",
		],
		lead: "La conférence de novembre a tenu ses promesses : peu de surprises, mais quelques annonces qui comptent vraiment pour l'année qui vient.",
	}),
	P({
		slug: "les-animes-a-voir-en-vf-cet-hiver",
		title: "Les animes à voir en VF cet hiver",
		subject: "la saison d'hiver",
		domain: "anime",
		words: 560,
		author: "lea",
		date: "2026-11-12T15:00:00Z",
		tags: ["anime"],
		img: "f10-an-geo.jpg",
		excerpt:
			"Notre sélection des séries disponibles en version française pour la saison d'hiver, des plus douces aux plus nerveuses.",
		lead: "La saison d'hiver s'annonce dense, et la bonne nouvelle, c'est que la plupart des séries arrivent désormais en version française dès leur diffusion.",
		blocks: {
			1: [
				figure({
					img: "c03-square.jpg",
					width: "regular",
					caption: "Visuel promotionnel fictif d'une série de la saison.",
					alt: "Portrait stylisé aux teintes violettes",
				}),
			],
			2: [
				figure({
					img: "c04-portrait.jpg",
					width: "regular",
					caption: "Affiche fictive, format portrait.",
					alt: "Affiche d'une série d'animation",
				}),
			],
		},
	}),
	P({
		slug: "les-dix-jeux-independants-a-ne-pas-rater-cette-annee",
		title: "Les dix jeux indépendants à ne pas rater cette année",
		subject: "les jeux indépendants",
		domain: "jeux-video",
		words: 520,
		author: "alexis",
		date: "2026-11-10T09:00:00Z",
		tags: ["jeux-video", ...top(4)],
		img: "f02-jv-busy.jpg",
		imgCaption: "Image d'illustration générée localement.",
		excerpt:
			"Dix jeux nés dans de petites équipes, dix raisons de ne pas passer à côté de cette année très riche pour la scène indépendante.",
		lead: "Chaque année, la scène indépendante nous rappelle que les meilleures idées ne coûtent pas toujours le plus cher. Voici dix jeux (fictifs) qui illustrent cette richesse.",
		top10: [
			["Nébuleuse Blanche", "un monastère flottant à explorer en silence"],
			["Aether Drifters", "des îles, des vents et des combats élégants"],
			["Terra Ardens", "un jeu de survie sans violence gratuite"],
			["Fil de Brume", "un puzzle narratif en noir et blanc"],
			["Kōhai Quest", "un jeu de rôle sur un campus fantastique"],
			["Sous la Lune Rouge", "une enquête dans un village de montagne"],
			["Grésil", "un jeu de course sur glace, pur et nerveux"],
			["Le Dernier Phare", "un huis clos maritime très atmosphérique"],
			["Pixel Pâtissier", "un jeu de gestion dont on ressort affamé"],
			["Orbites", "une méditation spatiale de deux heures"],
		],
	}),
	P({
		slug: "pourquoi-l-ia-ne-remplacera-pas-le-game-design",
		title: "Pourquoi l'IA ne remplacera pas le game design",
		subject: "le game design",
		domain: "ia",
		extra: ["jeux-video"],
		words: 900,
		author: "alexis",
		date: "2026-11-08T11:00:00Z",
		tags: ["ia", "jeux-video"],
		featured: true,
		img: "f24-ia-dark.jpg",
		quote: true,
		excerpt:
			"Les outils génératifs savent produire des textures, des dialogues et du code. Ce qu'ils ne savent pas faire, c'est décider ce qui est amusant.",
		lead: "À chaque nouvelle démonstration d'outil génératif, la même question revient : et si l'IA finissait par concevoir les jeux à notre place ? Notre réponse tient en un mot : non.",
	}),
	P({
		slug: "histoire-du-jeu-de-role-japonais",
		title: "Histoire du jeu de rôle japonais : trois décennies de voyages",
		subject: "le jeu de rôle japonais",
		domain: "dossiers",
		extra: ["jeux-video"],
		words: 3300,
		long: true,
		quote: true,
		longList: true,
		author: "alexis",
		date: "2026-11-05T07:30:00Z",
		tags: ["dossiers", "jeux-video", "#immersif", ...top(0)],
		featured: true,
		img: "f28-do-text.jpg",
		imgCaption: "Une bannière avec un grand texte intégré, volontairement difficile pour le thème.",
		excerpt:
			"Des premières quêtes sur cartouche aux grandes fresques d'aujourd'hui : un grand dossier sur ce genre qui a appris à nous faire pleurer, et à nous faire attendre.",
		enBref: [
			"Le genre naît de contraintes techniques qui obligent à raconter avec peu de moyens.",
			"Les années quatre-vingt-dix fixent les codes : groupe de héros, monde ouvert, musique inoubliable.",
			"Aujourd'hui, les petites équipes réinventent le genre avec des moyens modestes mais des idées fortes.",
		],
		lead: "Il y a une manière très particulière de raconter une histoire avec un groupe de héros, un monde à traverser et une musique qui annonce chaque combat. Ce dossier retrace trente ans de voyages.",
		blocks: {
			3: [
				figure({
					img: "c02-wide.jpg",
					width: "wide",
					caption: "Capture fictive : combat de nuit contre un colosse de pierre.",
					alt: "Combat de nuit contre un colosse de pierre",
				}),
			],
			6: [
				figure({
					img: "c07-full.jpg",
					width: "full",
					caption: "Panorama fictif d'une salle d'arcade éteinte.",
					alt: "Salle d'arcade éteinte",
				}),
			],
		},
	}),
	P({
		slug: "les-sorties-de-la-semaine",
		title: "Les sorties de la semaine : jeux, séries et un peu de silence",
		subject: "la semaine",
		domain: "actualites",
		extra: ["jeux-video", "anime"],
		words: 480,
		author: "alexis",
		date: "2026-11-03T08:30:00Z",
		tags: ["actualites"],
		img: "f17-ac-busy.jpg",
		excerpt:
			"Une semaine chargée côté jeux, une série d'animation très attendue et quelques sorties discrètes qui méritent le détour.",
		lead: "Rien de tel qu'une semaine chargée pour rappeler que l'on ne peut pas tout jouer, ni tout regarder. Voici ce qu'il ne fallait pas manquer.",
		blocks: {
			2: [
				figure({
					img: "c05-wide.jpg",
					width: "wide",
					caption: "Un salon fictif, entre stands et néons.",
					alt: "Vue d'ensemble d'un salon du jeu vidéo",
				}),
			],
		},
	}),
	P({
		slug: "entrainer-un-petit-modele-chez-soi-mode-d-emploi",
		title: "Entraîner un petit modèle chez soi : mode d'emploi",
		subject: "le petit modèle",
		domain: "ia",
		words: 1700,
		long: true,
		author: "alexis",
		date: "2026-10-28T07:45:00Z",
		tags: ["ia", "dossiers", ...top(3)],
		img: "f23-ia-geo.jpg",
		longList: true,
		excerpt:
			"Pas besoin d'un centre de données pour expérimenter : voici comment préparer un corpus, choisir un modèle léger et lancer un premier entraînement, pas à pas.",
		lead: "Entraîner un modèle de langage semble réservé aux grandes entreprises. En réalité, avec un ordinateur raisonnable et un peu de méthode, on peut aller plus loin qu'on ne le croit.",
		code: true,
	}),
	P({
		slug: "nebuleuse-blanche-trois-heures-dans-un-monastere-flottant",
		title: "Nébuleuse Blanche : trois heures dans un monastère flottant",
		subject: "Nébuleuse Blanche",
		domain: "jeux-video",
		words: 650,
		author: "alexis",
		date: "2026-10-22T09:00:00Z",
		tags: ["jeux-video"],
		img: "f03-jv-geo.jpg",
		excerpt:
			"Nous avons joué trois heures à la préversion de ce jeu d'exploration contemplatif. Impressions à chaud, sans note.",
		lead: "Une cloche résonne dans la brume, un escalier de pierre disparaît dans les nuages : <em>Nébuleuse Blanche</em> sait se faire désirer, et c'est tant mieux.",
		blocks: {
			1: [
				figure({
					img: "c01-wide.jpg",
					width: "wide",
					caption: "Le monastère, vu depuis le premier pont.",
					alt: "Un monastère flottant dans la brume",
				}),
			],
			2: [
				figure({
					img: "c02-wide.jpg",
					width: "regular",
					caption: "Un combat de nuit, l'un des rares du jeu.",
					alt: "Combat de nuit contre un colosse de pierre",
				}),
			],
		},
	}),
	P({
		slug: "dans-les-coulisses-du-doublage-francais",
		title: "Dans les coulisses du doublage français",
		subject: "le doublage",
		domain: "anime",
		extra: ["ia"],
		words: 560,
		author: "lea",
		date: "2026-10-15T14:00:00Z",
		tags: ["anime", ...top(0)],
		img: "f11-an-busy.jpg",
		excerpt:
			"Adaptation, casting, enregistrement : comment une série japonaise devient une série française, étape par étape.",
		lead: "Derrière chaque voix française d'un personnage d'animation, il y a une chaîne de métiers que l'on connaît mal. Nous avons voulu en raconter les étapes.",
	}),
	P({
		slug: "une-console-portable-relancee-par-un-petit-studio",
		title: "Une console portable relancée par un petit studio",
		subject: "la console",
		domain: "actualites",
		extra: ["jeux-video"],
		words: 430,
		author: "alexis",
		date: "2026-10-08T08:15:00Z",
		tags: ["actualites"],
		img: "f16-ac-aurora.jpg",
		excerpt:
			"Un petit studio annonce le retour d'une console portable culte, avec un écran moderne et une compatibilité avec les anciennes cartouches.",
		lead: "Personne ne l'attendait, et pourtant : une console portable que l'on croyait enterrée revient, portée par une équipe de passionnés.",
	}),
	P({
		slug: "notre-guide-pour-bien-demarrer-terra-ardens",
		title: "Notre guide pour bien démarrer Terra Ardens",
		subject: "Terra Ardens",
		domain: "jeux-video",
		words: 720,
		author: "alexis",
		date: "2026-09-30T09:00:00Z",
		tags: ["jeux-video", "#mis-a-jour"],
		img: "f06-jv-geo.jpg",
		longList: true,
		excerpt:
			"Ressources, premières constructions, erreurs à éviter : tout ce qu'on aurait aimé savoir avant de lancer notre première partie.",
		lead: "<em>Terra Ardens</em> est généreux, mais il ne prend pas le joueur par la main. Voici les conseils que nous aurions aimé recevoir avant de commencer.",
		blocks: {
			2: [
				figure({
					img: "c10-regular.jpg",
					width: "regular",
					caption: "Bannière en aplat de couleur (fictive).",
					alt: "Bannière fictive en aplat",
				}),
			],
		},
	}),
	P({
		slug: "generateurs-d-images-peut-on-vraiment-s-y-fier",
		title: "Générateurs d'images : peut-on vraiment s'y fier ?",
		subject: "les générateurs d'images",
		domain: "ia",
		words: 580,
		author: "lea",
		date: "2026-09-21T10:30:00Z",
		tags: ["ia"],
		img: "f22-ia-busy.jpg",
		excerpt:
			"Des images toujours plus convaincantes, mais aussi des erreurs de détail et des questions de droits : ce qu'il faut savoir avant de s'en servir.",
		lead: "Les images générées sont partout, des vignettes de blog aux affiches de film. Ont-elles pour autant gagné notre confiance ? Pas tout à fait.",
	}),
	P({
		slug: "le-renouveau-du-cel-animation",
		title: "Le renouveau du cel animation : une mode ou un besoin ?",
		subject: "le cel animation",
		domain: "anime",
		words: 540,
		author: "lea",
		date: "2026-09-12T13:00:00Z",
		tags: ["anime"],
		img: "f13-an-plain.jpg",
		ogImg: "c05-wide.jpg",
		excerpt:
			"Quelques studios reviennent à la peinture sur cellulo. Nostalgie, choix esthétique ou vraie réponse à la fatigue du numérique ?",
		lead: "Alors que tout se fait à l'écran, quelques studios choisissent de revenir à la peinture sur celluloïd. Pourquoi ce retour en arrière ?",
	}),
	P({
		slug: "le-prix-des-abonnements-de-jeu-augmente",
		title: "Le prix des abonnements de jeu augmente",
		subject: "les abonnements",
		domain: "actualites",
		words: 400,
		author: "alexis",
		date: "2026-09-02T08:00:00Z",
		tags: ["actualites"],
		img: "f20-ac-flat.jpg",
		excerpt:
			"Les principaux services d'abonnement revoient leurs tarifs à la hausse. Combien cela change-t-il pour les joueurs, et existe-t-il des alternatives ?",
		lead: "Les tarifs montent, les catalogues aussi : faut-il continuer à s'abonner, ou revenir à l'achat à l'unité ?",
	}),
	P({
		slug: "pourquoi-les-jeux-courts-reviennent-a-la-mode",
		title: "Pourquoi les jeux courts reviennent à la mode",
		subject: "les jeux courts",
		domain: "jeux-video",
		words: 600,
		author: "alexis",
		date: "2026-08-20T09:00:00Z",
		tags: ["jeux-video"],
		img: "f07-jv-dark.jpg",
		excerpt:
			"Trois heures, cinq heures, huit heures : les jeux courts séduisent un public pressé, mais aussi des créateurs lassés des mondes gigantesques.",
		lead: "À l'heure des mondes ouverts interminables, une tendance inverse se dessine : celle des jeux que l'on termine en un week-end.",
	}),
	P({
		slug: "mise-a-jour-majeure-pour-terra-ardens-ce-qui-change",
		title: "Mise à jour majeure pour Terra Ardens : ce qui change",
		subject: "Terra Ardens",
		domain: "actualites",
		extra: ["jeux-video"],
		words: 420,
		author: "alexis",
		date: "2026-08-05T08:30:00Z",
		tags: ["actualites", "jeux-video", "#mis-a-jour"],
		img: "f18-ac-plain.jpg",
		excerpt:
			"Nouvelle région, refonte du système de construction, équilibrage : voici les principales nouveautés de la mise à jour d'été.",
		lead: "La mise à jour d'été de <em>Terra Ardens</em> est arrivée, avec son lot de nouveautés et quelques corrections attendues.",
	}),
	P({
		slug: "preserver-le-jeu-video-un-patrimoine-fragile",
		title: "Préserver le jeu vidéo : un patrimoine fragile",
		subject: "la préservation",
		domain: "dossiers",
		extra: ["jeux-video"],
		words: 3800,
		long: true,
		quote: true,
		longList: true,
		author: "alexis",
		date: "2026-07-18T07:30:00Z",
		tags: ["dossiers", "jeux-video"],
		img: "f29-do-dark.jpg",
		excerpt:
			"Cartouches qui s'effacent, serveurs qui ferment, formats propriétaires : enquête sur celles et ceux qui tentent de sauver nos souvenirs de joueurs.",
		lead: "Un jour, un jeu disparaît : son éditeur ferme, son serveur s'éteint, sa cartouche cesse de fonctionner. Ce dossier part à la rencontre de celles et ceux qui refusent que tout s'efface.",
		blocks: {
			3: [
				figure({
					img: "c05-wide.jpg",
					width: "wide",
					caption: "Un salon fictif, entre stands et néons.",
					alt: "Vue d'ensemble d'un salon du jeu vidéo",
				}),
			],
			7: [
				figure({
					img: "c08-wide.jpg",
					width: "regular",
					caption: "Une manette stylisée, sur fond clair.",
					alt: "Illustration claire d'une manette",
				}),
			],
		},
	}),
	P({
		slug: "ia-et-doublage-un-debat-qui-s-enflamme",
		title: "IA et doublage : un débat qui s'enflamme",
		subject: "le doublage",
		domain: "ia",
		extra: ["anime"],
		words: 650,
		author: "lea",
		coauthor: "alexis",
		date: "2026-06-25T09:00:00Z",
		tags: ["ia", "anime"],
		img: "f25-ia-plain.jpg",
		excerpt:
			"Des voix synthétiques de plus en plus convaincantes, des comédiens inquiets, des éditeurs tentés : où en est-on vraiment ?",
		lead: "Les voix synthétiques sont devenues si convaincantes que la profession s'inquiète. Alexis et Léa ont croisé leurs points de vue.",
	}),
	P({
		slug: "pixel-et-memoire-4-l-age-d-or-du-pixel-art",
		title: "Pixel & Mémoire (4/6) : l'âge d'or du pixel art",
		subject: "le pixel art",
		domain: "jeux-video",
		extra: ["dossiers"],
		words: 700,
		author: "alexis",
		date: "2026-06-11T09:00:00Z",
		tags: ["jeux-video", SERIE],
		img: "f04-jv-aurora.jpg",
		ogImg: "c05-wide.jpg",
		partNo: 4,
		excerpt:
			"Quatrième épisode de notre série : comment quelques dizaines de pixels sont devenues un langage artistique à part entière.",
		lead: "Quatrième étape de notre série : le moment où la contrainte technique devient un choix esthétique assumé.",
	}),
	P({
		slug: "pixel-et-memoire-3-les-premieres-cartouches",
		title: "Pixel & Mémoire (3/6) : les premières cartouches",
		subject: "les cartouches",
		domain: "jeux-video",
		extra: ["dossiers"],
		words: 650,
		author: "alexis",
		date: "2025-05-14T09:00:00Z",
		tags: ["jeux-video", SERIE],
		img: "f05-jv-flat.jpg",
		partNo: 3,
		excerpt:
			"Troisième épisode de notre série : l'arrivée des cartouches change la manière de jouer, de vendre et de conserver les jeux.",
		lead: "Après les salles d'arcade et la guerre des consoles, place à un objet que beaucoup d'entre nous ont soufflé dessus pour le faire marcher : la cartouche.",
	}),
	P({
		slug: "pixel-et-memoire-2-la-guerre-des-consoles",
		title: "Pixel & Mémoire (2/6) : la guerre des consoles",
		subject: "la guerre des consoles",
		domain: "dossiers",
		extra: ["jeux-video"],
		words: 2800,
		long: true,
		quote: true,
		longList: true,
		author: "alexis",
		date: "2025-04-09T07:30:00Z",
		tags: ["dossiers", SERIE, "#carte"],
		img: "f27-do-geo.jpg",
		partNo: 2,
		excerpt:
			"Deuxième épisode de notre grande série : quand les constructeurs se livrent bataille dans les salons, les magasins et les cours de récréation.",
		lead: "Dans le premier épisode, nous avons visité les salles d'arcade. Dans celui-ci, nous suivons les machines qui sont entrées dans les salons.",
		blocks: {
			4: [
				figure({
					img: "c09-regular.jpg",
					width: "regular",
					caption: "Une illustration géométrique (fictive).",
					alt: "Illustration de formes géométriques",
				}),
			],
		},
	}),
	P({
		slug: "pixel-et-memoire-1-naissance-des-salles-d-arcade",
		title: "Pixel & Mémoire (1/6) : naissance des salles d'arcade",
		subject: "les salles d'arcade",
		domain: "dossiers",
		extra: ["jeux-video"],
		words: 3100,
		long: true,
		quote: true,
		longList: true,
		author: "alexis",
		date: "2025-03-12T07:30:00Z",
		tags: ["dossiers", "jeux-video", SERIE, ...top(0)],
		featured: true,
		img: "f26-do-aurora.jpg",
		partNo: 1,
		imgCaption: "Image d'illustration générée localement.",
		excerpt:
			"Premier épisode de notre grande série en six parties : plongée dans l'histoire des salles d'arcade, des premiers bars aux grandes enseignes.",
		enBref: [
			"Les premières bornes arrivent dans des bars et des cafés, bien avant les salles dédiées.",
			"Les salles d'arcade deviennent des lieux de sociabilité, avec leurs codes et leurs légendes.",
			"Leur déclin accompagne l'arrivée des consoles de salon, sans pour autant éteindre la passion.",
		],
		lead: "Avant les consoles de salon, il y avait des salles sombres, des néons et le bruit des pièces qui tombent. Ce premier épisode raconte la naissance des salles d'arcade.",
		blocks: {
			3: [
				figure({
					img: "c07-full.jpg",
					width: "full",
					caption: "Panorama fictif d'une salle d'arcade éteinte.",
					alt: "Salle d'arcade éteinte",
				}),
			],
			6: [
				figure({
					img: "c08-wide.jpg",
					width: "wide",
					caption: "Une manette stylisée, sur fond clair.",
					alt: "Illustration claire d'une manette",
				}),
			],
		},
	}),
	P({
		slug: "cinq-series-d-animation-pour-debuter",
		title: "Cinq séries d'animation pour débuter",
		subject: "les séries",
		domain: "anime",
		words: 520,
		author: "lea",
		date: "2026-02-04T14:00:00Z",
		tags: ["anime"],
		img: "f12-an-dark.jpg",
		excerpt:
			"Vous n'avez jamais vu d'animation japonaise ? Voici cinq séries accessibles pour commencer, sans prérequis.",
		lead: "On nous demande souvent par où commencer avec l'animation japonaise. Voici cinq séries accessibles, pensées pour les curieux.",
	}),
	P({
		slug: "retour-sur-la-saison-e-sport-2025",
		title: "Retour sur la saison e-sport 2025",
		subject: "la saison",
		domain: "jeux-video",
		extra: ["actualites"],
		words: 560,
		author: "alexis",
		date: "2026-01-15T09:00:00Z",
		tags: ["jeux-video"],
		img: "f08-jv-plain.jpg",
		excerpt:
			"Des finales haletantes, des équipes françaises qui montent en puissance et un modèle économique encore fragile : le bilan de la saison.",
		lead: "La saison e-sport 2025 s'est achevée sur des finales mémorables. Retour sur ce qu'il faut en retenir.",
	}),
	P({
		slug: "notre-avis-sur-le-film-lueur-d-aoi",
		title: "Notre avis sur le film Lueur d'Aoi",
		subject: "Lueur d'Aoi",
		domain: "anime",
		words: 560,
		author: "lea",
		date: "2025-11-20T16:00:00Z",
		tags: ["anime"],
		img: "f14-an-aurora.jpg",
		twImg: "c03-square.jpg",
		excerpt: "Un film d'animation délicat, porté par une mise en scène patiente. Notre avis sans spoiler.",
		lead: "<em>Lueur d'Aoi</em> est de ces films qui ne cherchent pas à impressionner, mais à toucher. Et il y parvient plus souvent qu'à son tour.",
	}),
	P({
		slug: "comment-nous-testons-les-jeux-et-les-animes",
		title: "Comment nous testons les jeux et les animes",
		subject: "nos tests",
		domain: "dossiers",
		extra: ["jeux-video", "anime"],
		words: 1000,
		author: "alexis",
		date: "2025-09-10T08:00:00Z",
		tags: ["dossiers", "test"],
		img: "f30-do-busy.jpg",
		excerpt:
			"Durée de jeu, conditions d'essai, grille de notation : la méthode que nous appliquons à chaque test, expliquée en toute transparence.",
		lead: "Chaque test publié sur GEEKLY suit la même méthode. La voici, noir sur blanc, pour que vous sachiez ce que valent nos notes.",
	}),
];

// ---------------------------------------------------------------- HTML assembly
export function postHtml(p) {
	const blocks = { ...p.blocks };
	const top = [];
	if (p.enBref) top.push(enBref(p.enBref));
	blocks.top = top;
	const end = [];
	if (p.fiche) end.push(ficheTest(p.fiche));
	blocks.end = end;

	let html = composeBody({ ...p, blocks });

	// hand-written blocks: numbered list, code, table, internal links
	if (p.top10) {
		const ol = `<ol>${p.top10.map(([t, d]) => `<li><strong>${t}</strong> : ${d}.</li>`).join("")}</ol>`;
		html = html.replace(/(<h2 [^>]*>[^<]*<\/h2>)/, `${ol}\n$1`);
	}
	if (p.code) {
		const py = await_code("python");
		const sh = await_code("bash");
		const table =
			`<table><thead><tr><th>Modèle</th><th>Mémoire vive</th><th>Durée de l'entraînement</th></tr></thead><tbody>` +
			`<tr><td>Petit (60 millions de paramètres)</td><td>8 Go</td><td>environ 2 heures</td></tr>` +
			`<tr><td>Moyen (350 millions)</td><td>16 Go</td><td>environ 9 heures</td></tr>` +
			`<tr><td>Grand (1,5 milliard)</td><td>48 Go</td><td>plusieurs jours</td></tr></tbody></table>`;
		// after the first section heading paragraph: shell snippet; after the third: python + table
		html = html.replace(
			/(<h2 [^>]*>[^<]*<\/h2>\n<p>[^\n]*<\/p>)/,
			`$1\n<pre><code class="language-bash">${sh}</code></pre>`,
		);
		let n = 0;
		html = html.replace(/(<h2 [^>]*>[^<]*<\/h2>\n<p>[^\n]*<\/p>)/g, m =>
			++n === 3 ? `${m}\n<pre><code class="language-python">${py}</code></pre>\n${card(table)}` : m,
		);
	}
	if (p.partNo) {
		const prev = POSTS.find(x => x.partNo === p.partNo - 1);
		const intro = prev
			? `<p>Si vous n'avez pas lu l'épisode précédent, il se trouve <a href="/${prev.slug}/">ici</a> : ce texte s'y appuie largement.</p>`
			: "";
		html = html.replace(/(<\/p>)/, `$1\n${intro}`);
	}
	if (p.slug.startsWith("dix-usages") || p.slug.startsWith("entrainer")) {
		html = html.replace(
			/(<h2 [^>]*>)/,
			`<p>Cet article fait suite à nos dossiers du tag <a href="/tag/ia/">IA</a>.</p>\n$1`,
		);
	}
	return html;
}
const card = h => `<!--kg-card-begin: html-->${h}<!--kg-card-end: html-->`;
import { CODE } from "./prose.mjs";
const await_code = k => CODE[k].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- pages
const dl = rows => `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;

export const PAGES = [
	{ slug: "archives", title: "Archives", excerpt: "Tous les articles, par date.", html: "" },
	{ slug: "favoris", title: "À lire plus tard", html: "" },
	{ slug: "tags", title: "Tags", excerpt: "Tous les tags de GEEKLY, en un coup d'œil.", html: "" },
	{ slug: "authors", title: "Auteurs", excerpt: "Les personnes qui écrivent sur GEEKLY.", html: "" },
	{
		slug: "a-propos",
		title: "À propos",
		excerpt:
			"Un blog personnel : j'y publie ce qui me fait envie, autour de l'informatique, de la culture pop, des jeux vidéo et des animés, et parfois sur tout autre chose.",
		html: "<p>GEEKLY est une publication indépendante consacrée à la culture geek, à la tech et à la pop culture. Ce site de test est une copie locale, remplie de textes inventés pour vérifier le thème.</p><p>Les articles, les images et les noms de jeux ou de séries qui s'y trouvent sont fictifs. Aucune donnée n'est envoyée à des services extérieurs.</p>",
	},
	{
		slug: "abonnement",
		title: "S'abonner",
		excerpt:
			"C'est gratuit : recevez les derniers articles directement dans votre boîte mail et profitez des outils de lecture réservés aux abonnés.",
		html: `<p>En vous inscrivant, vous déclarez avoir lu et accepté les <a href="/mentions-legales/">mentions légales</a>. Votre adresse sert seulement à vous envoyer les articles et vos liens de connexion ; elle n'est pas revendue.</p>`,
	},
	{
		slug: "mentions-legales",
		title: "Mentions légales",
		excerpt: "Qui publie GEEKLY, qui l'héberge, ce que le site fait de vos données et comment me joindre.",
		html: [
			"<p>GEEKLY est une publication indépendante consacrée à la culture geek, à la tech et à la pop culture, écrite par une petite équipe. Cette page dit qui la publie, qui l'héberge, ce que le site fait de vos données et comment nous contacter. <strong>Texte de test : les informations ci-dessous sont fictives.</strong></p>",
			"<h2>L'essentiel</h2>",
			"<ul><li>Le site n'affiche pas de publicité et ne vend aucune donnée.</li><li>Si vous vous abonnez, nous gardons votre adresse e-mail et, si vous l'indiquez, votre nom.</li><li>Le seul cookie sert à rester connecté quand vous êtes abonné (voir <a href=\"/cookies/\">Cookies et confidentialité</a>).</li><li>Les polices de caractères sont servies par le site lui-même.</li></ul>",
			"<h2>Éditeur du site</h2>",
			`<!--kg-card-begin: html-->${dl([
				["Site", "GEEKLY (instance de test locale)"],
				["Éditeur et directeur de la publication", "Alexis Moreau"],
				["Adresse", "1 rue de l'Exemple, 06000 Nice, France"],
				["Contact", '<a href="mailto:contact@geekly.test">contact@geekly.test</a>'],
			])}<!--kg-card-end: html-->`,
			"<h2>Hébergement</h2>",
			`<!--kg-card-begin: html-->${dl([
				["Hébergeur", "Machine locale de développement"],
				["Adresse", "localhost"],
			])}<!--kg-card-end: html-->`,
			"<p>Le site fonctionne avec un logiciel libre de publication, installé sur un ordinateur de développement. Aucune statistique de fréquentation n'est collectée.</p>",
			"<h2>Propriété intellectuelle</h2>",
			"<p>Les textes, les images originales et le logo GEEKLY sont la propriété de l'éditeur. Les reproduire, les modifier ou les republier, en tout ou en partie, demande une autorisation écrite préalable. Les courtes citations restent libres, à condition d'indiquer l'auteur.</p>",
			"<p>Les noms de jeux, de séries et de studios cités sur ce site de test sont inventés.</p>",
			"<h2>Données personnelles</h2>",
			"<h3>Qui est responsable</h3>",
			"<p>Le responsable du traitement de vos données est l'éditeur. Pour toute question ou demande sur vos données, écrivez à l'adresse de contact ci-dessus.</p>",
			"<h3>Abonnement, compte et newsletter</h3>",
			"<ul><li><strong>Données</strong> : votre adresse e-mail, et votre nom si vous le donnez (facultatif).</li><li><strong>Pourquoi</strong> : vous permettre de vous connecter et d'utiliser les outils de lecture réservés aux abonnés.</li><li><strong>Durée</strong> : tant que vous restez abonné.</li></ul>",
			"<h3>Vos droits</h3>",
			"<p>Vous pouvez à tout moment accéder à vos données, les faire corriger ou supprimer, et retirer votre consentement à la newsletter. Pour exercer ces droits, écrivez à l'adresse de contact.</p>",
			"<h2>Cookies et stockage dans le navigateur</h2>",
			'<p>Le site ne dépose aucun cookie publicitaire ni de mesure d\'audience. Le détail, toujours à jour, est sur la page <a href="/cookies/">Cookies et confidentialité</a>.</p>',
			"<h2>Droit applicable</h2>",
			"<p>Ces mentions sont soumises au droit français.</p>",
			"<h2>Mises à jour</h2>",
			"<p>Cette page peut évoluer. La date de la dernière mise à jour est indiquée en haut de la page.</p>",
		].join("\n"),
	},
	{
		slug: "cookies",
		title: "Cookies et confidentialité",
		excerpt: "Ce que ce site garde dans votre navigateur, à quoi cela sert, et comment l'effacer.",
		html: [
			"<p>Cette page dit, en langage simple, ce que le site enregistre dans votre navigateur et comment le retirer. <strong>Texte de test.</strong></p>",
			"<h2>En bref</h2>",
			"<ul><li>Le site ne dépose aucun cookie publicitaire.</li><li>Il ne mesure pas votre audience.</li><li>Vos préférences (thème clair ou sombre, réglages de lecture) restent dans votre navigateur.</li></ul>",
			"<h2>Le cookie de connexion</h2>",
			"<p>Si vous êtes abonné, un cookie vous garde connecté. Il est nécessaire au service demandé et ne sert à rien d'autre.</p>",
			"<h2>Contenus intégrés</h2>",
			"<p>Certains articles peuvent intégrer des contenus venant d'autres sites. Tant que vous n'avez pas accepté, rien n'est demandé à ces services : à sa place, un encadré explique ce que l'afficher enverrait.</p>",
			"<h2>Questions</h2>",
			'<p>Pour toute question, consultez les <a href="/mentions-legales/">mentions légales</a>.</p>',
		].join("\n"),
	},
	{
		slug: "confidentialite",
		title: "Politique de confidentialité",
		excerpt:
			"Les informations sur vos données personnelles sont rassemblées dans les mentions légales et la page des cookies.",
		html: '<p>Les informations sur vos données personnelles sont rassemblées dans les <a href="/mentions-legales/">mentions légales</a> et sur la page <a href="/cookies/">Cookies et confidentialité</a>.</p><h2>Ce que nous collectons</h2><p>Une adresse e-mail, si vous vous abonnez. Rien d\'autre.</p><h2>Vos droits</h2><p>Accès, correction, suppression : écrivez à l\'adresse de contact des mentions légales.</p>',
	},
];
