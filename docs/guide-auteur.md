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

Les sections des articles (séries, « En bref », fiche de test, réglages d'affichage…) et des autres pages
(archives, favoris, à propos, abonnement) sont ajoutées à la suite de ce guide.

---

## 1. Notions de base

### Où sont les réglages du thème

Ghost Admin → **Settings** (roue dentée en bas à gauche) → **Design & branding** → bouton **Customize**.
À droite, trois onglets : **Brand** (couleur, logo, couverture, polices), **Site wide** (réglages communs du
thème) et **Homepage** (réglages de la page d'accueil). Les réglages propres au thème Attibling sont dans
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

Les tags internes utilisés par ces sections : `#top`, `#top-1` … `#top-10`.
