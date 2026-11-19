# Guide de l'auteur — thème Attibling

Ce guide explique, fonctionnalité par fonctionnalité, ce qu'il faut faire dans Ghost pour qu'une partie du
thème s'affiche : quel réglage changer, quel tag ajouter, quelle page créer, et ce qui se passe quand rien
n'est fait (chaque fonctionnalité a un comportement par défaut : le thème marche sans réglage).

## Sommaire

1. [Notions de base](#1-notions-de-base)
   - [Où sont les réglages du thème](#où-sont-les-réglages-du-thème)
   - [Les tags internes](#les-tags-internes)
   - [Visiteurs et abonnés (« membres »)](#visiteurs-et-abonnés-membres)
2. [Identité et en-tête](#2-identité-et-en-tête)
   - [Logo GEEKLY coloré, logo image ou titre](#logo-geekly-coloré-logo-image-ou-titre)
   - [Navigation et menu « Plus »](#navigation-et-menu-plus)
   - [Bouton « S'abonner »](#bouton-sabonner)
   - [Thème clair, sombre, automatique](#thème-clair-sombre-automatique)
   - [Polices personnalisées](#polices-personnalisées)
3. [Page d'accueil](#3-page-daccueil)
   - [Le grand bandeau (hero) et les articles « à la une »](#le-grand-bandeau-hero-et-les-articles-à-la-une)
   - [« Derniers articles » et la pagination](#derniers-articles-et-la-pagination)
   - [L'encart d'abonnement (visiteurs)](#lencart-dabonnement-visiteurs)
   - [« Reprendre la lecture » et « À lire plus tard » (abonnés)](#reprendre-la-lecture-et-à-lire-plus-tard-abonnés)
   - [« Les plus lus » : le tag #top](#les-plus-lus--le-tag-top)
   - [Les rangées par rubrique](#les-rangées-par-rubrique)
4. [Signets « À lire plus tard » sur les tuiles](#4-signets-à-lire-plus-tard-sur-les-tuiles)
5. [Récapitulatif des réglages du thème](#5-récapitulatif-des-réglages-du-thème)
- [Pages du site](#pages-du-site)
   - [Créer une page et lui donner son modèle](#créer-une-page-et-lui-donner-son-modèle)
   - [Rubriques (pages de tag)](#rubriques-pages-de-tag)
   - [Pages d'auteur](#pages-dauteur)
   - [Pages « Tags » et « Auteurs »](#pages-tags-et-auteurs)
   - [Archives](#archives)
   - [Mes favoris](#mes-favoris)
   - [À propos](#à-propos)
   - [Page d'abonnement](#page-dabonnement)
   - [Pages ordinaires (mentions légales…)](#pages-ordinaires-mentions-légales)
   - [Page 404](#page-404)
   - [Fichier routes.yaml](#fichier-routesyaml)
   - [Dépannage](#dépannage)
- [Articles](#articles)
   - [Les deux styles : « Carte » et « Immersif »](#les-deux-styles--carte-et-immersif)
   - [En-tête, sommaire, partage](#en-tête-sommaire-partage)
   - [Séries : le tag #serie-…](#séries--le-tag-serie-)
   - [« En bref » : le résumé en points numérotés](#en-bref--le-résumé-en-points-numérotés)
   - [Résumé par IA (facultatif)](#résumé-par-ia-facultatif)
   - [Fiche de test](#fiche-de-test)
   - [« Mis à jour le » : le tag #mis-a-jour](#mis-à-jour-le--le-tag-mis-a-jour)
   - [Boîte auteur](#boîte-auteur)
   - [Réglages d'affichage (abonnés)](#réglages-daffichage-abonnés)
   - [Copier un lien, copier du code](#copier-un-lien-copier-du-code)
   - [Dépannage des articles](#dépannage-des-articles)

Les articles (séries, « En bref », fiche de test, réglages d'affichage…) sont décrits dans la section
[Articles](#articles).

---

## 1. Notions de base

### Où sont les réglages du thème

Ghost Admin → **Settings** (roue dentée en bas à gauche) → **Design & branding** → bouton **Customize**.
À droite, quatre onglets : **Brand** (couleur, logo, couverture, polices), **Site wide** (réglages communs du
thème), **Homepage** (réglages de la page d'accueil) et **Post** (réglages des articles). Les réglages propres au thème Attibling sont dans
**Site wide** et **Homepage**. Cliquez sur **Save** en haut à droite.

### Les tags internes

Un tag dont le nom commence par `#` est **interne** : il n'apparaît nulle part sur le site (ni page de tag,
ni étiquette sur l'article) ; il sert seulement au thème. On l'ajoute comme un tag normal : dans l'éditeur
d'un article, ouvrez le panneau des réglages (icône en haut à droite) → champ **Tags** → tapez par exemple
`#top` puis Entrée. Ghost crée le tag la première fois. Son « slug » (identifiant) devient `hash-top`.

### Visiteurs et abonnés (« membres »)

Un **visiteur** n'est pas connecté. Un **abonné** (membre Ghost, gratuit ou payant) s'est inscrit et connecté
par la fenêtre d'abonnement de Ghost (Portal). Certaines fonctions sont réservées aux abonnés connectés
(signets, « Reprendre la lecture ») : elles n'apparaissent jamais pour un visiteur. Leurs données restent dans
le navigateur du lecteur (stockage local) : rien n'est envoyé au serveur, et la liste n'existe que sur cet
appareil et ce navigateur. Les abonnements doivent être activés : Settings → **Membership**.

---

## 2. Identité et en-tête

### Logo GEEKLY coloré, logo image ou titre

Le logo (en-tête, page d'accueil, menu mobile, pied de page) suit cet ordre :

1. Réglage **Use geekly logo** (onglet *Homepage*) activé : les lettres **G E E K** aux couleurs du site et
   « ly » en écriture manuscrite. « ly » est noir sur fond clair et blanc sur fond sombre ou sur image. Les
   lecteurs d'écran lisent le titre du site.
2. Sinon, le **logo image** du site (Settings → Design & branding → Brand → *Publication logo*). Le réglage
   **Dark mode logo** (onglet *Site wide*) donne une version claire du logo, utilisée en mode sombre et sur
   l'image du bandeau d'accueil. Conseil : un logo PNG/SVG à fond transparent.
3. Sinon, le **titre du site** en texte.

Sur la page d'accueil, l'en-tête n'a pas de logo tant que le grand logo du bandeau est visible : il
« s'amarre » dans l'en-tête dès que vous faites défiler la page. Les autres pages montrent toujours le logo.

### Navigation et menu « Plus »

Settings → **Navigation** :

- **Primary navigation** : les liens de l'en-tête (pastilles). Le lien de la page en cours est mis en avant.
  Les intitulés sont les vôtres (« Dossier », « News »… rien n'est écrit en dur dans le thème).
- **Secondary navigation** : les liens du menu **« Plus »** de l'en-tête et du pied de page (Tags,
  Rédacteur, À propos, Mentions légales…).

Si les liens principaux ne tiennent pas dans la barre (écran étroit, intitulés longs), ceux de la fin
passent automatiquement dans le menu « Plus », et reviennent quand il y a de la place. Sans navigation
secondaire ni lien en trop, le bouton « Plus » n'apparaît pas.

Sur téléphone : la navigation principale devient une rangée de pastilles qui défile sous la barre, et le
bouton menu (trois traits) ouvre un panneau avec toute la navigation, le changement de thème et
« S'abonner » / « Compte ».

### Bouton « S'abonner »

Les boutons « S'abonner » (en-tête, bandeau d'accueil, encart d'abonnement) mènent à :

- l'adresse du réglage **Subscribe url** (onglet *Site wide*), par exemple `/newsletter/` pour une page
  d'abonnement (une page Ghost dont le slug est `newsletter` utilise le modèle `page-newsletter.hbs`) ;
- si ce réglage est vide, la fenêtre d'inscription de Ghost (Portal).

Ils n'apparaissent que si les abonnements sont activés et ouverts à tous (Settings → Membership →
*Subscription access* : « Anyone can sign up »). Un abonné connecté voit à la place l'icône **Compte**, qui
ouvre son compte dans Portal.

### Thème clair, sombre, automatique

Le bouton rond (demi-cercle) de l'en-tête fait tourner : automatique (suit le réglage de l'appareil) →
sombre → clair → automatique. Le choix est gardé dans le navigateur du lecteur et appliqué avant
l'affichage (pas de flash). Rien à régler dans Ghost.

### Polices personnalisées

Par défaut : **Onest** pour l'interface et les titres, **Literata** pour le texte des articles, **Pacifico**
pour le « ly » du logo. Si vous choisissez des polices dans Settings → Design & branding → Brand →
*Typography*, la police des titres remplace Onest dans les titres, et la police du corps remplace Onest dans
l'interface et Literata dans les articles. Le logo garde ses polices.

---

## 3. Page d'accueil

Ordre de la page : bandeau → « Derniers articles » → encart d'abonnement (visiteurs) **ou** « Reprendre la
lecture / À lire plus tard » (abonnés) → « Les plus lus » → rangées par rubrique → pied de page.

### Le grand bandeau (hero) et les articles « à la une »

Le bandeau montre, sur l'image de l'article, le logo, la description du site (Settings → General → *Site
description*, par exemple « L'actu geek, tech et pop ») et, pour un visiteur, le bouton « S'abonner ». À
droite : la pastille « À la une », le titre de l'article, sa rubrique et son temps de lecture ; tout le
bandeau est un lien vers l'article.

**Pour choisir l'article affiché** : dans l'éditeur de l'article → panneau des réglages → cochez
**Feature this post**, et donnez-lui une **image à la une** (*Post feature image*) large (2000 px conseillé),
de préférence avec le sujet au centre (le bandeau assombrit les côtés pour la lisibilité du logo et du
titre). Le bandeau prend l'article mis en avant **le plus récent** ; avec plusieurs articles mis en avant
(jusqu'à 6), des points permettent de passer de l'un à l'autre (verticalement à droite sur ordinateur, en
bas sur téléphone ; flèches du clavier). Pas de défilement automatique.

Sans aucun article mis en avant : le bandeau garde le logo et la description sur l'image de couverture du
site (Settings → Design & branding → Brand → *Publication cover*), ou sur un fond sombre uni.

### « Derniers articles » et la pagination

Le dernier article publié s'affiche en grand (pastille « Nouveau », rubrique, titre, extrait, date et temps
de lecture), les 6 suivants en liste à droite. L'extrait est le champ *Excerpt* de l'article s'il est rempli,
sinon le début du texte. « Tout voir » mène à la page 2 de la liste.

Le thème affiche **7 articles par page** (réglage `posts_per_page` du thème) : la page 2 commence donc
exactement après les 7 articles de l'accueil. Les pages 2, 3… montrent une grille simple, sans bandeau.
Les pages de tag et d'auteur affichent aussi 7 articles par page.

### L'encart d'abonnement (visiteurs)

Sous « Derniers articles », un **visiteur** voit l'encart « S'abonner à *titre du site* » : la phrase
« C'est gratuit… », le bouton « S'abonner gratuitement » (même destination que les autres boutons
« S'abonner », voir plus haut), « Déjà abonné ? Se connecter » et la liste des avantages (nouveaux articles
par e-mail, « En bref », « À lire plus tard », reprendre la lecture, réglages de lecture et, si les
commentaires sont ouverts à tous les abonnés — Settings → Membership → *Commenting* : « All members » —,
commenter les articles).

- Un abonné connecté ne le voit jamais.
- La croix le ferme **définitivement** sur ce navigateur (il revient seulement si le lecteur efface les
  données du site ou change d'appareil). Les autres boutons « S'abonner » restent.
- Il n'apparaît pas si les abonnements sont désactivés ou sur invitation seulement.

Les textes viennent des fichiers de traduction du thème (`locales/fr.json`) : pas de réglage.

### « Reprendre la lecture » et « À lire plus tard » (abonnés)

À la place de l'encart, un **abonné connecté** voit une section avec deux listes gardées dans son
navigateur :

- **Reprendre la lecture** : les articles commencés et pas finis, avec une barre de progression et « 40 % lu
  • reste environ 7 min » (6 au plus ; un article lu à plus de 90 % sort de la liste). La liste est remplie
  par les pages d'article.
- **À lire plus tard** : les articles gardés avec le signet (voir section 4).

Le titre de la section est un bouton : cliquez-le pour passer d'une liste à l'autre. La section s'ouvre sur
« Reprendre la lecture » s'il y a une lecture en cours, sinon sur « À lire plus tard ». Chaque carte est un
lien vers l'article et a un bouton « Retirer » ; « Tout effacer » vide la liste de lecture ; « Tout voir »
(liste « À lire plus tard ») mène à la page **Mes favoris** — créez une page Ghost dont le slug est
`favoris` (voir la section des autres pages). Quand les deux listes sont vides, la section n'existe pas.
Rien à régler dans Ghost.

### « Les plus lus » : le tag #top

Un thème Ghost ne connaît pas le nombre de vues : c'est vous qui choisissez les articles et leur ordre.

1. Ajoutez le tag interne **`#top`** aux articles à mettre dans la rangée.
2. Pour fixer l'ordre, ajoutez aussi **un** tag de rang parmi `#top-1`, `#top-2`, … `#top-10`
   (`#top-1` = premier). Exemple : l'article n° 1 porte `#top` et `#top-1`, l'article n° 2 porte `#top` et
   `#top-2`.
3. Les articles qui portent `#top` sans tag de rang viennent ensuite, du plus récent au plus ancien.

Les gros chiffres derrière les tuiles se numérotent tout seuls (1, 2, 3…), même s'il manque un rang. Aucun
nombre de vues n'est affiché. Sans aucun article `#top`, la rangée n'apparaît pas. Pour retirer un
article, enlevez-lui `#top` (et son tag de rang). Astuce : regardez vos statistiques Ghost (Analytics) pour
choisir.

### Les rangées par rubrique

Sous « Les plus lus », le thème enchaîne des rangées de formes différentes, toujours dans cet ordre (deux
rangées voisines n'ont jamais la même forme) :

| Ordre | Forme | Réglage (onglet *Homepage*) | Sans réglage |
|---|---|---|---|
| 1 | Étagère de vignettes 16:9 qui défile | **Home row 1** | le tag le plus utilisé |
| 2 | Tuiles des rubriques (6 tags les plus utilisés, image du tag ou teinte) | — | toujours |
| 3 | Affiches 2:3 qui défilent, puis « Tous les articles » | **Home row 2** | le 2ᵉ tag le plus utilisé |
| 4 | Liste numérotée de 6 titres, du plus récent au plus ancien | **Home row 3** | le 3ᵉ |
| 5 | Bannière de collection (image du tag, 3 articles) | **Home row 4** | le 4ᵉ |
| 6 | Un grand article et quatre petits | **Home row 5** | le 5ᵉ |

**Pour choisir le tag d'une rangée** : tapez son **slug** dans le réglage (le slug est visible dans Ghost
Admin → Tags → le tag → champ *Slug*, par exemple `jeux-video` pour « Jeux vidéo »). Exemple pour GEEKLY :

| Réglage | Valeur |
|---|---|
| Home row 1 | `jeux-video` |
| Home row 2 | `anime` |
| Home row 3 | `actualites` |
| Home row 4 | `ia` |
| Home row 5 | `dossiers` |

- **Masquer une rangée** : écrivez un slug qui n'existe pas, par exemple `none`.
- Une rangée dont le tag n'a aucun article disparaît d'elle-même. Seuls les tags publics comptent (pas les
  tags internes `#…`).
- Sans réglage, les rangées prennent les tags les plus utilisés dans l'ordre : le thème fonctionne sur
  n'importe quel site. Si vous fixez certaines rangées et pas d'autres, un même tag peut apparaître deux fois :
  fixez alors les cinq.
- Pour de belles rangées : donnez une **image** à vos tags (Tags → le tag → *Tag image*) pour les tuiles de
  rubriques et la bannière, et des images à la une à vos articles. Sans image, les tuiles et les affiches ont
  un fond teinté avec le titre en grand.
- Les pastilles « Format long » s'affichent seules sur les articles de 10 minutes de lecture ou plus.

---

## 4. Signets « À lire plus tard » sur les tuiles

Pour un **abonné connecté**, chaque tuile d'article porte un signet rond dans son coin supérieur (à gauche) :

- sur ordinateur, il apparaît au survol ou au focus clavier de la tuile ; un article déjà gardé garde une
  petite pastille pleine ;
- sur écran tactile, il est toujours visible, en plus petit ;
- un clic garde l'article (signet plein) ou le retire ; tous les signets du même article suivent.

Les articles gardés remplissent « À lire plus tard » sur l'accueil et la page « Mes favoris ». Un visiteur ne
voit jamais les signets ; si le navigateur bloque le stockage (navigation privée stricte), les signets ne
sont pas affichés plutôt que de faire semblant. Rien à régler dans Ghost.

---

## 5. Récapitulatif des réglages du thème

| Réglage (Ghost Admin) | Onglet | Par défaut | Effet |
|---|---|---|---|
| Dark mode logo | Site wide | vide | Logo clair pour le mode sombre et le bandeau d'accueil |
| Disable fade animation | Site wide | non | Coupe les animations d'apparition |
| Subscribe url | Site wide | vide (Portal) | Destination des boutons « S'abonner » |
| Use geekly logo | Homepage | non | Logo GEEKLY coloré |
| Home row 1 à Home row 5 | Homepage | vide (tags les plus utilisés) | Tag (slug) de chaque rangée de l'accueil ; `none` la masque |
| About tags | Site wide | vide (6 tags les plus utilisés) | Rubriques listées sur la page « À propos » : slugs séparés par des virgules |
| Article style | Post | Card | Style des articles : Card (« Carte ») ou Immersive (« Immersif ») |
| Reading settings | Post | oui | Les abonnés ont la roue « Réglages d'affichage » sur les articles |
| Summary for visitors | Post | non | « En bref » visible aussi par les visiteurs |
| About page | Post | vide (`a-propos` ou `about`) | Page liée par « À propos » dans la boîte auteur |

Les tags internes utilisés par le thème : `#top`, `#top-1` … `#top-10` (accueil), `#serie-…`,
`#mis-a-jour`, `#immersif`, `#carte` (articles, voir [Articles](#articles)).

---

## Pages du site

Les pages autres que l'accueil et les articles : rubriques (pages de tag), auteurs, « Tags », « Auteurs »,
« Archives », « Mes favoris », « À propos », la page d'abonnement, les pages ordinaires et la page 404.
Aucun fichier `routes.yaml` n'est nécessaire : tout repose sur des **pages Ghost** et des **modèles** du thème.

### Créer une page et lui donner son modèle

Une page « spéciale » (archives, favoris, à propos, abonnement, tags, auteurs) est une page Ghost ordinaire,
souvent vide, à laquelle le thème applique un modèle. Deux façons, au choix :

1. **Par le slug (rien d'autre à faire)** : si l'adresse de la page est exactement le slug par défaut du
   tableau ci-dessous, Ghost applique le modèle tout seul.
2. **Par le menu « Template »** (pour une autre adresse, par exemple un site en anglais qui veut `/about/`) :
   dans les réglages de la page, choisissez le modèle dans la liste **Template**.

| Page | Slug par défaut (modèle automatique) | Nom dans le menu « Template » | Ce que vous écrivez dans Ghost |
|---|---|---|---|
| Archives | `archives` | Archives | rien (le contenu, s'il y en a, s'affiche en introduction) |
| Mes favoris | `favoris` | Saved Posts | rien (seul le titre sert) |
| À propos | `a-propos` | About | titre, extrait, texte (voir plus bas) |
| Abonnement | `newsletter` | Subscribe | extrait (accroche) et une ligne légale (voir plus bas) |
| Tous les tags | `tags` | Tags | titre, extrait facultatif |
| Tous les auteurs | `authors` | Authors | titre, extrait facultatif |

Pas à pas :

1. Ghost Admin → **Pages** → **New page**.
2. Tapez le **titre** (il devient le grand titre de la page : « Archives », « Mes favoris », « À propos »…).
3. Ouvrez les réglages de la page (icône en haut à droite) :
   - **Page URL** : le slug du tableau (`archives`, `favoris`, `a-propos`, `newsletter`, `tags`, `authors`) ;
   - ou, pour une autre adresse, **Template** → le modèle voulu ;
   - **Excerpt** (extrait) : la phrase d'accroche quand la page en utilise une (à propos, abonnement, tags,
     auteurs).
4. **Publish**.
5. Pour la rendre visible : Settings → **Navigation** → ajoutez le lien (par exemple dans la navigation
   secondaire, qui forme le pied de page et le menu « Plus » : « Archives » → `/archives/`, « Mes favoris » →
   `/favoris/`).

> Le lien « Tout voir » de « À lire plus tard » (accueil), le bouton « Voir ma liste » de la page
> d'abonnement et « Voir toute la série » (articles) pointent vers `/favoris/` et `/archives/` : gardez ces
> slugs, ou prévoyez une redirection (Settings → Labs → Redirects) si vous en choisissez d'autres.

### Rubriques (pages de tag)

Chaque tag public a sa page (`/tag/<slug>/`) : un en-tête habillé, l'article « À la une de la rubrique », puis
la grille des autres articles (7 par page) et la pagination.

- **Image** : Ghost Admin → **Tags** → le tag → **Tag image**. Elle remplit la droite de l'en-tête et se fond
  dans le fond sombre sous le texte (sur téléphone, toute la carte, sous un voile). Sans image : carte sombre
  unie.
- **Description** : même écran, champ **Description**. Elle s'affiche sous le nom (et sur la page
  « À propos »). Vide : la ligne disparaît.
- **Nombre d'articles** : automatique (« 24 articles avec ce mot clé »).
- **Article en tête** : le plus récent des articles du tag marqués **Feature this post** (réglages de
  l'article). S'il n'y en a aucun, l'article le plus récent du tag. Il n'est pas répété dans la grille de la
  page 1 ; les pages 2 et suivantes n'ont que la grille.
- Les tags internes (`#…`) n'ont pas de page : c'est le comportement de Ghost.

### Pages d'auteur

`/author/<slug>/` montre la photo, le nom, la bio, le lieu, les liens et les articles de l'auteur. Tout se règle
dans Ghost Admin → **Settings** → **Staff** → l'auteur : **Profile picture**, **Cover picture** (image de
l'en-tête), **Bio** (250 caractères au plus, limite de Ghost), **Location**, **Website** et les comptes
sociaux (X, Facebook, LinkedIn, Bluesky, Threads, Mastodon, TikTok, YouTube, Instagram). Chaque élément vide
disparaît.

### Pages « Tags » et « Auteurs »

Créez une page `tags` (ou le modèle **Tags**) : toutes les rubriques publiques qui ont des articles, en tuiles
(image du tag ou surface teintée, nom, nombre d'articles), par ordre alphabétique. Ghost renvoie au plus 100
tags par requête ; le modèle en fait deux, soit 200 tags.

Créez une page `authors` (ou le modèle **Authors**) : une carte par auteur (photo, nom, nombre d'articles,
bio, liens), du plus prolifique au moins prolifique.

### Archives

La page liste **tous** les articles publiés, du plus récent au plus ancien, groupés par année puis par mois
(jour, titre, rubrique, durée). En haut, une barre sans bordure filtre la liste sans recharger la page :
boutons d'année (« Toutes », puis chaque année trouvée), champ « Rechercher un titre » (sans tenir compte des
accents ni des majuscules), liste « Rubrique » (tags publics avec leur nombre d'articles sur tout le site) et
le nombre d'articles affichés. Avec une année choisie, des boutons mènent à l'année suivante et à la
précédente. La recherche de Ghost (loupe de l'en-tête) reste là pour chercher dans le texte des articles.

- **À créer** : une page `archives` (ou le modèle **Archives**), vide. Si vous y écrivez un texte, il
  s'affiche en introduction sous le titre.
- **Plus de 100 articles** : Ghost renvoie au plus 100 articles par requête. Le modèle enchaîne dix requêtes
  de 100 (pages 1 à 10), soit **1 000 articles** ; les requêtes vides n'affichent rien. Au-delà, ajoutez une
  ligne `{{#get "posts" limit="100" page="11" include="tags"}}…` dans `partials/pages/archives.hbs`.
  Le site local de test (102 articles) les affiche bien tous.
- **Adresse filtrée** : les filtres se reflètent dans l'adresse (`?year=2025`, `?q=hytale`, `?tag=anime`),
  qu'on peut partager. `?tag=` accepte **n'importe quel tag, interne compris** : `/archives/?tag=hash-serie-avent`
  montre la série `#serie-avent` du plus ancien au plus récent, avec « Série : avent » et un bouton
  « Tous les articles ». C'est là que mène « Voir toute la série » dans un article.
- **Sans JavaScript** : la barre est cachée et la liste complète reste lisible (chaque ligne porte sa date
  complète).

### Mes favoris

Réservée aux **abonnés connectés** : la grille des articles gardés avec le signet (« À lire plus tard »), du
dernier gardé au premier, avec un bouton « Retirer » sous chaque tuile et « Tout retirer » en haut (avec
confirmation). La liste est gardée **dans le navigateur, sur cet appareil** (elle ne suit pas l'abonné sur un
autre appareil et disparaît si l'on efface les données du site) ; la phrase sous le titre le dit. Liste vide :
« Aucun article enregistré pour l'instant » et le geste à faire. Stockage bloqué (navigation privée stricte) :
un message l'explique. Un **visiteur** voit une invitation à s'abonner ou à se connecter.

À créer : une page `favoris` (ou le modèle **Saved Posts**), vide ; son titre (« Mes favoris ») est le grand
titre. Ajoutez-la à la navigation secondaire si vous voulez un lien permanent.

### À propos

Une page que vous remplissez dans Ghost ; le thème n'écrit aucun texte personnel. Créez une page `a-propos`
(ou le modèle **About**). Voici où va chaque texte, avec les brouillons de la maquette à coller :

1. **Titre** de la page : `À propos`.
2. **Excerpt** (réglages de la page) = l'accroche, en grand sous le titre :
   > Mon blog personnel : j'y publie ce qui me fait envie, autour de l'informatique, de la culture pop, des
   > jeux vidéo et des animés.
3. **« Ce que vous trouverez ici »** = vos rubriques, tirées des **tags** :
   - lesquelles : réglage du thème **About tags** (Site wide), les slugs séparés par des virgules, par exemple
     `actualites,jeux-video,anime,dossiers,ia,test` (affichés du plus fourni au moins fourni). Vide : les
     6 tags publics les plus utilisés ;
   - la phrase de chaque rubrique = la **Description** du tag (Ghost Admin → Tags → le tag). Les textes de la
     maquette :

     | Tag | Description à coller |
     |---|---|
     | Actualité | Ce qui bouge dans la tech, le jeu vidéo et la pop culture, avec mon avis. |
     | Jeux vidéo | L'actualité des jeux qui m'intéressent, mes avis et mes tops de l'année. |
     | Anime | Les séries à voir en VF chaque saison, et le doublage en général. |
     | Dossier | Les articles longs, quand un sujet mérite qu'on s'y arrête. |
     | IA | Les outils et les débats autour de l'intelligence artificielle. |
     | Test | Logiciels, services et jeux essayés pour de bon. |

     (Ces descriptions s'affichent aussi en tête des pages de rubrique.) Sans description, la pastille reste
     seule ;
   - l'**icône** de chaque pastille vient de mots du **slug** du tag : `actu`, `news` → journal ; `jeu`,
     `game`, `esport` → manette ; `anime`, `manga`, `serie`, `film`, `cinema`, `video`, `tv` → écran ;
     `dossier`, `guide`, `long` → dossier ; `ia` (seul, ou `ia-…`/`…-ia`), `ai`, `intelligence` → étincelle ;
     `test`, `review`, `avis` → coche ; `informatique`, `tech`, `code`, `dev`, `program`, `web` → chevrons ;
     tout autre slug → `#`. La liste est dans `partials/about/tag-icon.hbs` (une ligne à ajouter pour un
     nouveau mot).
4. **Le texte de la page** (l'éditeur) s'affiche **après les rubriques** :
   > Et comme c'est mon blog, j'y fais ce que je veux : vous tomberez parfois sur un article qui sort de ces
   > rubriques, simplement parce que j'avais envie d'en parler.
5. **« Qui écrit »** = les auteurs du site qui ont publié : photo, nom, **Bio** et liens de leur fiche
   (Settings → Staff), puis « Tous ses articles ». Ghost limite la bio à **250 caractères** : le texte de la
   maquette (environ 600) est trop long ; une version courte possible :
   > Développeur front-end et designer UX/UI en freelance (Nuxt, Tailwind, Figma). GEEKLY, c'est mon terrain
   > de jeu : j'y écris seul, à mon rythme, sur ce qui m'occupe en dehors du travail.

   Pour garder le texte complet, mettez-le dans le texte de la page (point 4).
6. **« Suivre le blog »** = les comptes sociaux du **site** (Settings → General → **Social accounts** :
   X, Facebook, LinkedIn, Bluesky, Threads, Mastodon, TikTok, YouTube, Instagram), le flux RSS, et
   « S'abonner » pour les visiteurs. Pour des liens que Ghost ne connaît pas (portfolio, GitHub…), ajoutez
   dans le texte de la page une carte **HTML** (bouton `+` → HTML) :

   ```html
   <ul class="about-links">
     <li><a href="https://alexisdechiara.fr">Portfolio</a></li>
     <li><a href="https://github.com/alexisdechiara">GitHub</a></li>
   </ul>
   ```

   Le thème déplace ces liens en tête de « Suivre le blog », en pastilles. Sans JavaScript ils restent où vous
   les avez mis, avec le même style.

### Page d'abonnement

La page vers laquelle mènent tous les boutons « S'abonner » : une grande bande sombre d'au moins la hauteur
de l'écran (titre « S'abonner à GEEKLY », accroche, formulaire, avantages), puis les questions fréquentes
repliables et un rappel « Prêt à vous abonner ? » qui ramène au formulaire.

1. **Créer la page** : slug `newsletter` (ou le modèle **Subscribe**). Son titre ne s'affiche pas (le grand
   titre est « S'abonner à » + le nom du site).
2. **Relier les boutons** : réglage du thème **Subscribe url** (Site wide) = `/newsletter/`. Vide, les
   boutons ouvrent la fenêtre d'abonnement de Ghost (Portal).
3. **Accroche** = l'**Excerpt** de la page. Vide : la phrase du thème (« C'est gratuit : recevez les derniers
   articles directement dans votre boîte mail et profitez des outils de lecture réservés aux abonnés. »).
4. **Ligne légale** = le **texte de la page** (l'éditeur), affiché en petit sous le formulaire. À coller :
   > En vous inscrivant, vous déclarez avoir lu et accepté les [mentions légales](/mentions-legales/). Votre
   > adresse sert seulement à vous envoyer les articles et vos liens de connexion ; elle n'est pas revendue.

   Gardez-le court (une ou deux phrases) : c'est l'endroit pour tout ce qui est propre à votre site
   (consentement, usage de l'adresse).
5. **Dans Ghost** : Settings → **Membership** → inscription ouverte à tous (**Anyone can sign up**) et au
   moins une newsletter active (Settings → **Newsletters**). Si l'inscription est fermée ou sur invitation, le
   formulaire et le rappel final ne s'affichent pas.

Ce que le thème écrit lui-même (identique pour tout site utilisant le thème, donc vrai partout) : la liste
des avantages (la newsletter, puis les outils de lecture du thème réservés aux abonnés : « En bref »,
« À lire plus tard », « Reprendre la lecture », « Réglages de lecture » ; « Commenter les articles » seulement
si les commentaires sont ouverts à tous les abonnés, Settings → Membership → Commenting), « Aucun paiement ·
désinscription en un clic depuis chaque e-mail », et les trois questions (gratuit ? mot de passe ?
désinscription ?), qui décrivent le fonctionnement de Ghost (inscription gratuite, connexion par lien envoyé
par e-mail, lien de désinscription dans chaque e-mail).

Le formulaire est celui de Ghost (`data-members-form`) : pendant l'envoi le bouton montre une roue, puis
« Super ! Vous vous êtes inscrit avec succès. Regardez votre boîte mail… » ; en cas d'erreur, le message de
Ghost s'affiche sous le champ. **Abonné connecté** : à la même adresse, « Vous êtes abonné à GEEKLY », son
adresse e-mail, les boutons **Compte** (Portal : e-mails et profil), **Retour à l'accueil**, **Se
déconnecter**, et ses outils (avec « Voir ma liste » → `/favoris/`).

### Pages ordinaires (mentions légales…)

Toute autre page utilise une colonne de lecture calme (police de lecture, cartes Ghost à leur largeur :
large, pleine largeur). Le titre, l'extrait et l'image s'affichent, sauf si vous décochez **Show title and
feature image** dans les réglages de la page (le titre reste lisible par les lecteurs d'écran).

### Page 404

Rien à faire : textes « Page non trouvée », un grand bouton « Ouvrir la recherche » (la recherche de Ghost,
qui reçoit le focus à l'arrivée), « Aller à la page d'accueil » et les trois premières rubriques de la
navigation principale, puis les 4 derniers articles.

### Fichier routes.yaml

Aucun n'est nécessaire : toutes ces pages sont des pages Ghost avec un modèle. Laissez le `routes.yaml` par
défaut (Settings → Labs → Routes).

### Dépannage

| Symptôme | Cause et solution |
|---|---|
| La page « Archives » (ou « Mes favoris », « À propos », abonnement) a l'air d'une page ordinaire | Son slug n'est pas le slug par défaut : corrigez **Page URL**, ou choisissez le modèle dans **Template**. |
| « Voir toute la série », « Tout voir » ou « Voir ma liste » mènent à une 404 | La page `archives` ou `favoris` n'existe pas, ou a un autre slug : créez-la avec ce slug ou ajoutez une redirection. |
| Les boutons « S'abonner » ouvrent une fenêtre au lieu de la page | Réglage **Subscribe url** vide : mettez `/newsletter/`. |
| Pas de formulaire sur la page d'abonnement | Inscription fermée ou sur invitation (Settings → Membership), ou vous êtes connecté (vue abonné). |
| Le formulaire affiche une erreur à chaque essai | Ghost n'arrive pas à envoyer l'e-mail : vérifiez la configuration e-mail du serveur (Mailgun / SMTP). |
| Une rubrique n'a pas de phrase sur « À propos » ou en tête de sa page | Le tag n'a pas de **Description**. |
| Une rubrique manque sur « À propos » | Slug mal tapé dans **About tags** (vérifiez dans Tags), ou tag sans article. |
| Une icône de rubrique est un `#` | Aucun mot connu dans le slug : voir la liste plus haut. |
| La bio ne s'enregistre pas | Ghost limite la bio à 250 caractères. |
| « Mes favoris » dit que le navigateur bloque la liste | Navigation privée ou données du site bloquées : rien à faire côté site. |
| L'article « À la une » d'une rubrique n'est pas le bon | C'est le plus récent des articles du tag marqués **Feature this post** ; retirez la marque des autres. |

---

## Articles

Tout ce qui suit concerne la page d'un article (modèle `post.hbs`). Rien n'est obligatoire : un article sans
tag interne ni carte particulière s'affiche en style « Carte », avec son sommaire, son partage, la boîte
auteur et « Recommandé pour vous ».

Les « cartes HTML » mentionnées plus bas s'insèrent dans l'éditeur Ghost : tapez `/html` (ou cliquez sur le
« + » à gauche d'une ligne vide → **HTML**), collez le modèle, modifiez le texte, puis cliquez hors de la
carte. Astuce : une fois une carte remplie, son menu (« … ») propose **Save as snippet** ; elle se réinsère
ensuite avec `/` + le nom du snippet.

### Les deux styles : « Carte » et « Immersif »

- **Carte** (par défaut) : l'image à la une dans une carte sombre arrondie, le titre posé dessus ; le texte
  dans une colonne de lecture (Literata, environ 60 à 72 caractères par ligne, justifié sur ordinateur et
  aligné à gauche sur téléphone) ; le sommaire dans la marge de droite sur grand écran.
- **Immersif** : l'image d'en-tête d'un bord à l'autre, le texte et les images sur toute la largeur de la
  page (moins les marges) ; sur un écran très large, seul le texte est plafonné à 1 808 px et centré.
  L'encadré de série et « En bref » se placent côte à côte (l'un sous l'autre sous 900 px environ), et le
  sommaire devient un bouton « Sommaire » en haut du texte.

Qui décide, du plus fort au plus faible :
1. l'abonné, s'il a choisi un style dans ses [réglages d'affichage](#réglages-daffichage-abonnés) ;
2. l'article : tag interne **`#immersif`** (force Immersif) ou **`#carte`** (force Carte) ;
3. le site : réglage **Article style** (Settings → Design & branding → Customize → onglet **Post**),
   `Card` par défaut ou `Immersive`.

### En-tête, sommaire, partage

- En-tête : rubrique principale (pastille) et deuxième tag public, titre, auteur, date, temps de lecture ;
  pour un abonné, le bouton « À lire plus tard » (le même signet que sur les tuiles). Sans image à la une,
  le titre s'affiche sur le fond de la page.
- Légende de l'image à la une : celle saisie dans Ghost sous l'image (« Add a caption »).
- Sommaire : construit automatiquement à partir des intertitres H2 et H3 ; il n'apparaît qu'à partir de deux
  intertitres. Rien à faire.
- Anneau de progression en bas à droite : il se remplit pendant la lecture ; un clic remonte en haut.
- En fin d'article : la ligne « Publié le · Mis à jour le » (voir plus bas), la ligne « Précédent /
  Suivant » de la série (toujours le dernier élément), les mots clés (tags publics) et le partage (X,
  Facebook, LinkedIn, e-mail).
- Commentaires : ceux de Ghost (Settings → **Membership** → **Commenting**), titre « Discussion entre
  abonnés ».
- « Recommandé pour vous » : trois autres articles qui partagent un tag avec celui-ci, du plus récent au plus
  ancien.

### Séries : le tag #serie-…

Une **série** = les articles publiés qui portent le même tag interne dont le nom commence par `#serie-`.

1. Sur chaque partie, ajoutez le même tag interne, par exemple **`#serie-avent`** (son slug devient
   `hash-serie-avent`). Une seule série par article.
2. Facultatif mais conseillé : dans Ghost Admin → **Tags** → onglet **Internal tags** → ouvrez le tag →
   champ **Description**, écrivez le **nom de la série** et, si vous connaissez le nombre de parties prévu,
   `total: N`. Exemples testés :
   - `Calendrier de l’Avent 2025 · total: 24`
   - `Construire son homelab` (pas de total : le total est le nombre de parties publiées)

Ce que voit le lecteur, en haut du texte : « Série », le nom, « Partie 12 sur 24 » (« 12 / 24 » sur
téléphone), une barre de progression, la liste des parties dans l'ordre de publication (la partie lue est
surlignée), « Précédent » / « Suivant » et « Voir toute la série ». Une longue série (plus de 7 parties)
est condensée : première partie, « ⋯ 9 parties » (un bouton qui les déplie), précédente, actuelle,
suivante, « ⋯ 10 parties », dernière. Avec `total:`, les parties pas encore publiées sont annoncées par une
ligne « 12 parties à venir ». La même navigation « Précédent / Suivant », avec le titre des parties, termine
l'article.

- Les articles **programmés** ou en **brouillon** n'apparaissent jamais : Ghost ne les donne pas au thème.
  Pendant un calendrier de l'Avent, la liste s'allonge chaque jour toute seule.
- « Voir toute la série » mène à la page Archives filtrée sur la série (`/archives/?tag=hash-serie-avent`,
  du plus ancien au plus récent) : la page Archives doit exister avec le slug `archives` (voir
  [Archives](#archives)). Les tags internes n'ont pas de page à eux.
- Une seule partie publiée, ou pas de tag de série : pas d'encadré.
- Sans JavaScript : la liste complète s'affiche et le total est le nombre de parties publiées.
- Au plus 100 parties (limite de Ghost par requête).

### « En bref » : le résumé en points numérotés

Quelques points clés en tête de l'article. C'est l'auteur qui les écrit, dans une carte HTML placée **tout en
haut** de l'article (le thème la place de toute façon au-dessus du texte, sous l'encadré de série) :

```html
<ol class="en-bref">
  <li>Blizzard relance son jeu avec une saison par an et une vraie histoire.</li>
  <li>Cinq nouveaux héros arrivent dès la première saison.</li>
  <li>Les problèmes d’équilibrage persistent malgré tout.</li>
</ol>
```

Mettez autant de `<li>` que de points (trois est un bon nombre). Le titre « En bref » et la mention
« Résumé de l'auteur » sont ajoutés par le thème : ne les écrivez pas.

- **Abonnés** : ils voient le bloc. Il s'affiche sans JavaScript.
- **Visiteurs** : à la place, un encart « En bref — Résumé réservé aux abonnés » avec « S'abonner » et « Se
  connecter » (seulement sur les articles qui ont une carte `en-bref`). Le texte des points reste dans le
  code de la page (il est masqué, pas retiré) : ne mettez pas d'information secrète dans un résumé.
- Pour montrer le résumé à tout le monde : réglage **Summary for visitors** (onglet **Post**).
- Un abonné peut masquer « En bref » dans ses réglages d'affichage.
- Pas de carte `en-bref` : pas de bloc, pas d'encart.

### Résumé par IA (facultatif)

Le thème n'appelle aucun service d'IA. Si un jour une intégration (un petit service externe branché sur les
webhooks de Ghost, par exemple « Post published ») génère un résumé, elle doit l'**enregistrer avec
l'article**, par l'Admin API, sous la même forme avec en plus `data-source="ia"` :

```html
<ol class="en-bref" data-source="ia">
  <li>Point généré un.</li>
  <li>Point généré deux.</li>
</ol>
```

Contrat : une carte HTML (`<!--kg-card-begin: html-->…<!--kg-card-end: html-->` en HTML source, ou une carte
HTML Lexical) contenant `ol.en-bref[data-source="ia"]` et des `<li>` en texte simple, placée en tête de
l'article. Le thème l'affiche avec la mention « Résumé généré par IA », avec les mêmes règles
abonnés / visiteurs. Si l'article contient **aussi** un résumé de l'auteur (sans `data-source`), c'est
celui de l'auteur qui s'affiche. Sans aucune des deux cartes : pas de bloc.

### Fiche de test

La carte récapitulative d'un test (jeu, anime, outil…), à placer à la fin de l'article, avant la conclusion
ou après :

```html
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
```

- La note s'écrit `<strong>8,5</strong>/10` (virgule ou point ; `/5`, `/20`… marchent aussi).
- Un champ vide (`<dd></dd>`, liste sans point, paragraphe vide) est masqué ; vous pouvez aussi supprimer la
  ligne. On peut ajouter d'autres paires `<dt>…</dt><dd>…</dd>` (« Testé sur », « Prix »…).
- Le titre (H2) entre dans le sommaire de l'article.
- Données structurées : quand la note est présente, le thème ajoute pour les moteurs de recherche une
  donnée « Review » (note, meilleure note, nom de l'œuvre, auteur, date, verdict). Pour un jeu vidéo,
  vous pouvez préciser le type : `<aside class="fiche-test" data-type="VideoGame">`.
- Sur téléphone, la carte passe sur une colonne.

### « Mis à jour le » : le tag #mis-a-jour

Ghost change la date de modification à chaque enregistrement, même pour une coquille. Le thème n'affiche donc
la mise à jour que si l'article porte le tag interne **`#mis-a-jour`** : « Mis à jour le … » sous la date dans
l'en-tête, et la ligne « Publié le … · Mis à jour le … » à la fin du texte. La date affichée est celle du
dernier enregistrement : ajoutez le tag quand la mise à jour compte, puis enregistrez. Sans le tag : seule la
date de publication.

### Boîte auteur

Remplie depuis la fiche de l'auteur principal : Ghost Admin → Settings → **Staff** → l'auteur → photo,
**Bio**. Elle affiche « Écrit par », le nom, la bio, puis deux boutons :
- **À propos** : la page dont le slug est le réglage **About page** (onglet **Post**) ; s'il est vide, la
  page `a-propos` ou, à défaut, `about`. Pas de page trouvée : pas de bouton.
- **Tous ses articles** : la page de l'auteur.
Sans photo : une icône ; sans bio : la ligne disparaît.

### Réglages d'affichage (abonnés)

Un abonné connecté voit, sur les articles seulement, une roue crantée dans l'en-tête (à côté de la recherche
et du bouton clair / sombre). Elle ouvre « Réglages d'affichage » (un panneau sur ordinateur, une feuille
qui monte du bas sur téléphone) :

| Réglage | Choix (défaut en premier) |
|---|---|
| Thème | GEEKLY (nom du site), Désert, Encre, Forêt — chacun en clair et en sombre, selon le bouton clair / sombre |
| Police des titres | Onest, Space Grotesk, Libre Baskerville, Poppins, Lora, JetBrains Mono |
| Police du texte | Literata, Merriweather, IBM Plex Serif, Inter, Noto Sans, Fira Mono |
| Largeur de l'article | M, S, L (en Immersif : L pleine largeur, M 1 200 px, S 864 px) |
| Taille du texte | M (19 px), S (17 px), L (21 px) |
| Interligne | Normal, Serré, Aéré |
| Alignement | Justifié (aligné à gauche sur téléphone), À gauche, Centré, À droite — paragraphes seulement |
| Style des liens | Soulignés, Couleur (souligné au survol) |
| Image de couverture | Afficher, Masquer |
| Style de l'article | Carte / Immersif (le défaut est celui de l'article) |
| Résumé « En bref » | Afficher, Masquer |

« Réinitialiser » remet tout par défaut. Les choix sont gardés dans le navigateur de l'abonné (sur cet
appareil) et appliqués avant l'affichage de la page, sans clignotement. Le thème choisi habille toute la page
de l'article, en-tête et pied de page compris. Les polices autres que celles par défaut ne sont téléchargées
que si l'abonné les choisit, depuis fonts.bunny.net (le même service que les polices personnalisées de
Ghost). Pour retirer la roue : réglage **Reading settings** (onglet **Post**). Les visiteurs ne la voient
jamais.

Si vous avez choisi des polices personnalisées dans Ghost (Brand → Typography), elles remplacent Onest et
Literata par défaut ; la liste garde les noms « Onest » et « Literata » pour l'option par défaut.

### Copier un lien, copier du code

Rien à faire. Au survol (ou au clavier) d'un intertitre H2 ou H3, un bouton « lien » copie l'adresse de la
section (« Lien copié ») ; sur téléphone il est après le titre. Chaque bloc de code a un bouton « Copier »
(« Copié » pendant 2 s) et affiche sa langue si elle est choisie dans la carte Code de Ghost (`bash`,
`javascript`…).

### Dépannage des articles

- **L'encadré de série n'apparaît pas** : le tag doit être interne (nom commençant par `#`) et commencer par
  `#serie-` ; il faut au moins deux parties **publiées** portant exactement le même tag.
- **« Partie 3 sur 3 » alors que la série en compte plus** : ajoutez `total: N` dans la description du tag.
- **« Voir toute la série » mène à une page 404** : créez la page Archives (slug `archives`, voir
  [Archives](#archives)).
- **« En bref » ne s'affiche pas** : la carte doit être une carte **HTML** (pas un paragraphe) et la liste doit
  avoir la classe `en-bref` ; un visiteur voit l'encart à la place ; l'abonné l'a peut-être masqué dans ses
  réglages (« Réinitialiser »).
- **La fiche de test n'a pas de style** : vérifiez la classe `fiche-test` et que c'est une carte HTML.
- **« Mis à jour le » n'apparaît pas** : il manque le tag interne `#mis-a-jour`.
- **Pas de bouton « À propos » dans la boîte auteur** : aucune page `a-propos` / `about`, ou le réglage
  About page ne correspond à aucune page publiée.
- **Pas de roue crantée** : réservée aux abonnés connectés, sur les articles, réglage Reading settings
  activé ; elle reste cachée si le navigateur bloque le stockage local (navigation privée stricte).
- **Le style Immersif ne s'applique pas** : un abonné qui a choisi « Carte » dans ses réglages garde son
  choix sur tous les articles.
