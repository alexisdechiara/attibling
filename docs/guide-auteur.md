# Guide de l'auteur — thème Attibling

Ce guide explique, fonctionnalité par fonctionnalité, ce qu'il faut faire dans Ghost pour qu'une partie du
thème s'affiche : quel réglage changer, quel tag ajouter, quelle page créer, et ce qui se passe quand rien
n'est fait (chaque fonctionnalité a un comportement par défaut : le thème marche sans réglage).

## Sommaire

0. [Mise en route en 10 minutes](#0-mise-en-route-en-10-minutes)
1. [Notions de base](#1-notions-de-base) — réglages du thème, tags internes, visiteurs et abonnés, navigateurs pris en charge
2. [Identité et en-tête](#2-identité-et-en-tête) — logo, navigation, menu « ••• », en-tête qui se range, pied de page, « S'abonner », clair / sombre, polices
3. [Page d'accueil](#3-page-daccueil) — bandeau, derniers articles, encart, listes des abonnés, « Les plus lus », rangées, vignette d'un article (image des cartes)
4. [Signets « À lire plus tard » sur les tuiles](#4-signets--à-lire-plus-tard--sur-les-tuiles)
5. [Pages du site](#5-pages-du-site) — pages de tag, auteurs, page « Tags », archives, « À lire plus tard », à propos, abonnement, mentions légales, cookies et confidentialité (page, panneau, consentement), ce que le thème garde dans le navigateur, ce que le navigateur charge et d'où, 404
6. [Articles](#6-articles) — styles, séries, « En bref », résumé IA, fiche de test, mise à jour, boîte auteur, réglages d'affichage, article réservé aux abonnés, impression, vidéos et contenus intégrés
7. [Animations, transitions et préchargement](#7-animations-transitions-et-préchargement)
8. [Référence : les réglages du thème](#8-référence--les-réglages-du-thème)
9. [Référence : les conventions](#9-référence--les-conventions)
10. [Dépannage](#10-dépannage)

Vocabulaire : **visiteur** = lecteur non connecté ; **abonné** = membre Ghost connecté (gratuit ou payant) ;
**réglage du thème** = Design & branding → Customize ; **slug** = l'identifiant d'une page ou d'un tag dans son
adresse (`jeux-video`).

---

## 0. Mise en route en 10 minutes

Pour un site comme GEEKLY, dans cet ordre. Chaque étape renvoie à la section qui la détaille.

1. **Activer le thème** : Ghost Admin → Settings → **Design & branding** → **Change theme** → *Upload theme*
   → `attibling.zip` → **Activate**.
2. **Réglages du thème** (Design & branding → **Customize**, voir [section 8](#8-référence--les-réglages-du-thème)) :

   | Onglet | Réglage | Valeur pour GEEKLY |
   |---|---|---|
   | Homepage | Use geekly logo | activé |
   | Homepage | Arrival animation | activé (défaut) |
   | Homepage | Home row 1 | `jeux-video` |
   | Homepage | Home row 2 | `anime` |
   | Homepage | Home row 3 | `actualites` |
   | Homepage | Home row 4 | `ia` |
   | Homepage | Home row 5 | `dossiers` |
   | Site wide | Subscribe url | vide (la page `newsletter` est trouvée seule) ou `/newsletter/` |
   | Site wide | Page transitions | activé (défaut) |
   | Site wide | About tags | `actualites,jeux-video,anime,dossiers,ia,test` (facultatif) |
   | Post | Article style | `Card` (défaut) |

   Le reste garde sa valeur par défaut. Cliquez sur **Save**.
3. **Site** : Settings → General → *Site description* = `L'actu geek, tech et pop` (la phrase sous le logo du
   bandeau) ; Settings → Membership → *Anyone can sign up* ; au moins une newsletter active.
4. **Pages à créer** (Pages → New page, réglage *Page URL*, voir [section 5](#5-pages-du-site)) : `newsletter`
   (abonnement), `archives`, `favoris` (titre « À lire plus tard »), `a-propos`, `tags`, `authors`. Ajoutez-les à la
   navigation secondaire (Settings → Navigation) : Tags `/tags/`, Archives `/archives/`, À propos `/a-propos/`.
5. **Tags** : une *Tag image* et une *Description* pour les tags (Actualité, Jeux vidéo, Anime, Dossier,
   IA, Test) ; les tags internes au fil des articles : `#top` + `#top-1`…`#top-10` (« Les plus lus »),
   `#serie-…` (séries, `total: 24` dans la description du tag), `#mis-a-jour`, `#immersif` / `#carte`.
6. **Articles à mettre en avant** : *Feature this post* sur les articles du bandeau (jusqu'à 6), avec une image
   à la une large.
7. **Cartes HTML** dans les articles, si voulu : « En bref » (`<ol class="en-bref">`), fiche de test
   (`<aside class="fiche-test">`) — modèles en [section 6](#6-articles), récapitulatif en
   [section 9](#9-référence--les-conventions).
8. **Code injection** : retirez de Settings → **Code injection** → *Site header* les lignes qui chargent des
   polices depuis Google (le thème sert ses polices lui-même) — détail dans
   [Polices du thème](#polices-du-thème-et-polices-personnalisées).
9. **Confidentialité** (aucun bandeau à afficher) : créez la page `cookies` avec le texte de
   `docs/cookies-proposition.md` ; dans Settings → **Analytics**, désactivez *Newsletter opens*,
   *Newsletter clicks* et *Member sources* ; laissez *Consent notice* sur `Notice` (aucune carte : chaque
   vidéo ou publication d'un autre site demande l'accord à sa place, dans son encadré) et *Consent tools*
   éteint — détail dans
   [Cookies et confidentialité](#cookies-et-confidentialité--la-page-le-panneau-le-consentement).
10. **Vérifier** : ouvrez l'accueil dans une fenêtre privée (visiteur) puis connecté (abonné) ; en cas de
   surprise, voir le [dépannage](#10-dépannage).

Aucun fichier `routes.yaml` n'est nécessaire.

---

## 1. Notions de base

### Où sont les réglages du thème

Ghost Admin → **Settings** (roue dentée en bas à gauche) → **Design & branding** → bouton **Customize**.
À droite, quatre onglets : **Brand** (couleur, logo, couverture, polices), **Site wide** (réglages communs du
thème), **Homepage** (réglages de la page d'accueil) et **Post** (réglages des articles). Les réglages propres
au thème Attibling sont dans **Site wide**, **Homepage** et **Post** (liste complète : [section 8](#8-référence--les-réglages-du-thème)).
Cliquez sur **Save** en haut à droite.

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

### Navigateurs pris en charge

Le thème vise les navigateurs « Baseline largement disponible » : **Chrome et Edge 125, Firefox 126,
Safari 17.5 (macOS et iPhone/iPad) et toutes les versions suivantes** (sorties à partir de mai 2024). Sur
ces navigateurs, toutes les pages se lisent et s'utilisent entièrement. Les effets plus récents (transitions
entre les pages, en-tête animé au défilement, ouverture en fondu des menus, menus placés par le navigateur,
liste déroulante stylée des réglages d'affichage…) ne s'ajoutent que là où le navigateur les connaît :
ailleurs, la même page s'affiche sans l'effet. Un navigateur plus ancien que ces versions reçoit encore le
contenu, mais sa mise en page n'est plus vérifiée.

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

**Attention, « Use geekly logo » est désactivé par défaut, et Ghost garde les réglages du thème par nom de
thème** : un thème téléversé sous un nouveau nom (ou réinstallé après suppression) repart avec ce réglage
désactivé, et c'est alors le **logo image** qui s'affiche. Le fichier `geekly-logo.webp` de GEEKLY a son
« ly » dessiné **en blanc** (il était fait pour l'en-tête sombre de l'ancien thème) : sur l'en-tête clair,
ce « ly » disparaissait. Le thème le corrige de lui-même : quand un logo image a une bonne part de traits
blancs posés sur la transparence (et non à l'intérieur d'une forme colorée, comme les lettres blanches d'un
badge), ces traits blancs prennent la couleur du texte sur les fonds clairs (en-tête, pied de page, menu du
téléphone) ; les couleurs du logo ne changent pas, et en mode sombre et sur l'image du bandeau le logo
s'affiche tel quel. Pour GEEKLY, le plus simple reste d'**activer « Use geekly logo »** (lettres dessinées
par le thème, nettes à toutes les tailles) ; avec un logo image, l'idéal est un logo à traits sombres en
*Publication logo* et sa version claire en *Dark mode logo*.

Sur la page d'accueil, le logo est **soit dans le bandeau, soit dans l'en-tête**, jamais entre les deux : tant
que le grand logo du bandeau est visible, l'en-tête n'a pas de logo ; dès que le grand logo va passer sous la
barre, il **s'envole d'un seul coup** jusqu'à sa place dans l'en-tête (environ 0,4 s, en rapetissant), même si
vous arrêtez de faire défiler ; en remontant, il repart de la même façon dans le bandeau. Il faut remonter un peu
plus bas que le point de départ pour qu'il reparte (pas de clignotement à la limite). Son « ly » passe du blanc
(sur l'image) à la couleur de l'en-tête : noir en mode clair, blanc en mode sombre. Avec « réduire les
animations » : un simple fondu. Page rechargée déjà défilée : le logo est directement dans l'en-tête. Sans
JavaScript : le logo de l'en-tête apparaît une fois la page défilée de quelques centaines de pixels (ou est
toujours visible dans les navigateurs plus anciens). Les autres pages montrent toujours le logo.

### L'en-tête qui se range au défilement

Comme dans l'ancien thème, l'en-tête **se range** quand vous descendez vite (plus de 40 px d'un coup) et
**revient** dès que vous remontez (plus de 20 px) ou près du haut de la page (15 px). Il ne se range jamais
quand un menu (« Plus », « ••• », réglages d'affichage, menu du téléphone) est ouvert, ni quand le focus du
clavier est dans l'en-tête : passer sur l'un de ses boutons avec Tab le fait revenir. Le sommaire collant des
articles remonte avec lui. Avec « réduire les animations », il disparaît sans glisser. Rien à régler.

### Navigation et menu « Plus »

Settings → **Navigation** :

- **Primary navigation** : les liens de l'en-tête (pastilles). Le lien de la page en cours est mis en avant.
  Les intitulés sont les vôtres (« Dossier », « News »… rien n'est écrit en dur dans le thème).
- **Secondary navigation** : les liens du menu **« Plus »** de l'en-tête et du pied de page (Tags,
  À propos, Mentions légales…). Site à un seul auteur : retirez le lien « Rédacteur » (voir
  [Un seul auteur](#un-seul-auteur--pas-de-page-dauteur)) ; le thème n'en ajoute aucun de lui-même.

Si les liens principaux ne tiennent pas dans la barre (écran étroit, intitulés longs), ceux de la fin
passent automatiquement dans le menu « Plus », et reviennent quand il y a de la place. Sans navigation
secondaire ni lien en trop, le bouton « Plus » n'apparaît pas.

À côté de « Plus », le bouton **« ••• »** (celui de l'ancien thème) ouvre un panneau sous la barre, rangé
comme le sous-menu de l'ancien thème : en haut, les **6 derniers articles** en petites cartes (vignette, titre,
tag et date ; une rangée de six sur grand écran, trois par rangée sur un écran plus étroit), puis,
**en dessous**, le titre « Tags » avec « Tous les tags » (page `/tags/`) et les **12 tags** les plus
utilisés en **simples liens en gras** à la suite, sans pastilles. Il se remplit tout seul : rien à régler.
Échap ou un clic à côté le ferme. Sur téléphone, le même contenu est en bas du menu (bouton trois traits) :
les 4 derniers articles en liste, puis les tags.

Sur téléphone : la navigation principale devient une rangée de pastilles qui défile sous la barre, et le
bouton menu (trois traits) ouvre un panneau avec toute la navigation, le changement de mode et
« S'abonner » / « Compte ».

### Pied de page

Le pied de page de tout le site se remplit avec les données de Ghost, en deux parties :

- **en haut** : à gauche le logo et, dessous, la **description du site** (Settings → General → *Site
  description*) ; à droite les liens de la **navigation secondaire** (Settings → Navigation → *Secondary
  navigation*), les icônes des **comptes sociaux** remplis dans Settings → General → *Social accounts* (X,
  Facebook, LinkedIn, Bluesky, Threads, Mastodon, TikTok, YouTube, Instagram : seules celles qui sont remplies
  apparaissent) et le lien **RSS** ;
- **en bas**, sur une barre discrète séparée par un filet : à gauche « GEEKLY © 2026 » (titre du site et année
  en cours), à droite « Publié avec Ghost » et « Informations sur la licence JavaScript » (la page des
  licences des scripts du thème, demandée par l'extension LibreJS : gardez ce lien).

Sur téléphone, tout s'empile dans cet ordre. Rien à régler dans le thème ; le thème n'y met aucun lien
d'auteur (site à un seul auteur).

### Bouton « S'abonner » et « Se connecter »

Tous les boutons « S'abonner » / « S'abonner gratuitement » (en-tête, menu du téléphone, bandeau d'accueil,
encart d'abonnement, encart « Résumé réservé aux abonnés » des articles, page « À lire plus tard », page « À
propos ») et tous les liens « Se connecter » mènent à **la page d'abonnement du thème**, jamais à la fenêtre
de Ghost (Portal), dès que cette page existe. Le thème la trouve dans cet ordre :

1. le réglage **Subscribe url** (onglet *Site wide*), s'il est rempli (par exemple `/newsletter/`, ou
   l'adresse d'une page qui a le modèle **Subscribe**) : il a toujours le dernier mot ;
2. sinon, une page **publiée** dont le slug est `newsletter`, `abonnement` ou `subscribe` (le thème habille
   ces trois slugs en page d'abonnement sans rien choisir) : **aucun réglage n'est nécessaire** ;
3. sinon seulement (le site n'a pas de page d'abonnement), la fenêtre de Ghost (Portal), pour que le bouton
   marche toujours sur une installation neuve.

« S'abonner » ouvre la page sur son formulaire d'inscription (`…/newsletter/#inscription`), « Se connecter »
sur son formulaire de connexion (`…/newsletter/#connexion`), avec le curseur déjà dans le premier champ. Si
vous avez plusieurs de ces pages, ou une page d'abonnement avec un autre slug, remplissez **Subscribe url**
(sans `#` à la fin).

Un lien vers Portal tapé dans un article (`#/portal/signup`, `#/portal/signin`) mène lui aussi à la page.

Les boutons « S'abonner » n'apparaissent que si les abonnements sont activés et ouverts à tous (Settings →
Membership → *Subscription access* : « Anyone can sign up »). Un abonné connecté voit à la place l'icône
**Compte**, qui ouvre son compte dans Portal (voir [Ce qui passe encore par Portal](#ce-qui-passe-encore-par-portal)).

> Pourquoi les boutons ouvraient la fenêtre de Ghost (version 2.0.0) : leur destination dépendait du seul
> réglage **Subscribe url**, vide par défaut — et Ghost garde les réglages du thème **par nom de thème** :
> envoyer le thème sous un autre nom les remet à vide. Le bouton recevait alors `data-portal="signup"`, que
> Portal intercepte. Depuis, la page est trouvée par son slug, sans réglage.

### Mode clair, sombre, automatique

Le bouton rond (demi-cercle) de l'en-tête fait tourner : automatique (suit le réglage de l'appareil) →
sombre → clair → automatique. Le choix est gardé dans le navigateur du lecteur et appliqué avant
l'affichage (pas de flash). Rien à régler dans Ghost.

### Polices du thème et polices personnalisées

Par défaut : **Onest** pour l'interface et les titres, **Literata** pour le texte des articles uniquement (les pages — page ordinaire, document, « À propos », abonnement — sont en Onest comme le reste du site),
**Pacifico** pour le « ly » du logo. **Les trois sont servies par le site lui-même** (dossier
`assets/fonts/` du thème) : le thème ne contacte aucun service de polices (ni Google Fonts, ni un autre), il
n'y a rien à régler. Ce que le lecteur télécharge :

- Onest et Literata sont des polices « variables » (un seul fichier pour toutes les graisses), découpées par
  alphabet : latin, latin étendu (polonais, tchèque, turc…), cyrillique, cyrillique étendu, vietnamien. Le
  navigateur ne télécharge que les morceaux dont la page a besoin : pour un site en français, Onest latin
  (25 Ko) partout et Literata latin (79 Ko) sur les articles ; l'italique de Literata (48 Ko)
  seulement si le texte en contient. Pacifico ne contient que les lettres « l » et « y » du logo (3 Ko) et
  n'est téléchargée que si le logo GEEKLY coloré est affiché.
- Ces deux fichiers sont annoncés au navigateur dès le début de la page (`preload`) : le texte s'affiche tout
  de suite dans une police système ajustée aux mêmes dimensions (Arial pour Onest, Times New Roman pour
  Literata), puis la police du thème la remplace sans faire sauter la mise en page.
- Japonais, coréen, chinois, arabe, hébreu, persan, thaï : ces alphabets ne sont pas dans Onest et Literata,
  le navigateur prend les polices du système du lecteur (rien n'est téléchargé).
- Licence : SIL Open Font License 1.1 (fichiers `OFL.txt` à côté des polices), qui autorise cet usage.

**Polices personnalisées de Ghost.** Si vous choisissez des polices dans Settings → Design & branding →
Brand → *Typography*, la police des titres remplace Onest dans les titres, et la police du corps remplace
Onest dans l'interface et Literata dans les articles. Le logo garde ses polices. Attention : c'est **Ghost**
qui charge alors ces polices, depuis **Bunny Fonts** (`fonts.bunny.net`, voir plus bas) ; à mentionner dans vos
mentions légales si vous vous en servez.

**Les polices choisies par un abonné** dans ses réglages d'affichage (une dizaine de familles, voir
[Réglages d'affichage](#réglages-daffichage-abonnés)) viennent aussi de Bunny Fonts, et seulement pour
l'abonné qui en choisit une. Bunny Fonts déclare une politique « zero-tracking and no-logging » (aucun suivi,
aucun journal) et que « no data or logs are ever collected or passed to a third party » ; le service est
exploité par BunnyWay d.o.o., société établie dans l'Union européenne (Slovénie), et servi par son réseau
mondial (page https://fonts.bunny.net/about, consultée le 19 novembre 2026). Le navigateur de l'abonné lui
transmet tout de même son adresse IP, comme à tout serveur. Héberger ces familles dans le thème coûterait
une vingtaine de fichiers par famille (graisses, italiques, alphabets) pour un choix que peu de lecteurs
font, et grossirait le thème pour tous les sites : le thème garde donc Bunny Fonts pour ce cas.

**Ce qu'il faut retirer de l'injection de code (GEEKLY).** Le site GEEKLY charge en plus, depuis Settings →
**Code injection** → *Site header*, des polices chez Google. Ces trois lignes, en tête du champ, sont à
**supprimer** :

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto&family=Pacifico&display=swap" rel="stylesheet">
```

Pourquoi : Pacifico est déjà servie par le thème ; « Noto » n'est utilisée nulle part par le thème ; et ces
lignes font contacter Google (fonts.googleapis.com, fonts.gstatic.com) à chaque visite, ce que le thème
évite désormais. Gardez le reste du champ (la ligne `analytics.geekly.blog` de Plausible, le bloc
`application/ld+json`). Le petit script qui cherche `.l-post-content h4` et le style `.after-h4` visaient
l'ancien thème : ils ne font plus rien et peuvent partir aussi. Puis **Save**.

---

## 3. Page d'accueil

Ordre de la page : bandeau → « Derniers articles » → encart d'abonnement (visiteurs) **ou** « Reprendre la
lecture / À lire plus tard » (abonnés) → « Les plus lus » → rangées par tag → pied de page.

### Le grand bandeau (hero) et les articles « à la une »

Le bandeau montre, sur l'image de l'article, le logo, la description du site (Settings → General → *Site
description*, par exemple « L'actu geek, tech et pop ») et, pour un visiteur, le bouton « S'abonner ». Avec le
logo GEEKLY coloré (grand : 148 px sur un écran large, il occupe un peu moins de la moitié gauche du bandeau), la description
se glisse **juste sous « GEEK », collée aux lettres, à gauche de la boucle du « y »** : gardez-la courte (une
ligne ; plus longue, elle passe sur deux lignes au plus dans la largeur de « GEEK »). À droite : la
pastille « À la une », le titre de l'article, son extrait (sur ordinateur, quand le champ *Excerpt* de l'article
est rempli), son tag et son temps de lecture. **Seul ce groupe à droite est un lien** vers l'article (il
s'éclaire au survol) : le logo, la description et le fond de l'image ne mènent nulle part.

**Pour choisir l'article affiché** : dans l'éditeur de l'article → panneau des réglages → cochez
**Feature this post**, et donnez-lui une **image à la une** (*Post feature image*) large (2000 px conseillé),
de préférence avec le sujet au centre. L'image reste visible sur tout le bandeau sous un voile léger, un peu
plus sombre vers la gauche (le logo) et vers la droite (le titre) ; le thème dose ce voile image par image,
plus fort sur une image claire ou chargée, plus léger sur une image sombre. Évitez une bannière qui porte
elle-même un **grand texte** (un logo ou un nom écrit en gros, comme l'image de l'article sur Dokploy) : ce
texte reste visible derrière le logo et le titre du bandeau et se mélange avec eux ; préférez une bannière
sans texte. Le bandeau prend l'article mis en avant **le plus récent** ; avec plusieurs articles mis en avant
(jusqu'à 6), des points permettent de passer de l'un à l'autre (verticalement à droite sur ordinateur, en
bas sur téléphone ; flèches du clavier). Pas de défilement automatique : pour montrer qu'on peut cliquer, les
points ondulent une fois par visite quand le bandeau apparaît, grossissent au survol (sur ordinateur, le titre
de l'article s'affiche à côté du point), et le point choisi se remplit pendant que le nouvel article apparaît.

Le fond du bandeau est toujours l'**image à la une** (la bannière) de l'article, comme l'en-tête de l'article,
même quand l'article a une [vignette](#vignette-dun-article-image-des-cartes) différente : une image de partage
porte souvent son propre texte, qui se heurterait au logo et au titre du bandeau (choix validé par le
propriétaire du site).

Sans aucun article mis en avant : le bandeau garde le logo et la description sur l'image de couverture du
site (Settings → Design & branding → Brand → *Publication cover*), ou sur un fond sombre uni.

À la première visite de l'accueil, le logo se dessine sur un écran sombre puis rejoint le bandeau : voir
[l'animation d'arrivée](#lanimation-darrivée-de-laccueil).

### « Derniers articles » et la pagination

Le dernier article publié s'affiche en grand (pastille « Nouveau », tag, titre, extrait, date et temps
de lecture), les 6 suivants en liste à droite. L'extrait est le champ *Excerpt* de l'article s'il est rempli,
sinon le début du texte. « Tout voir » mène à la page 2 de la liste. Sur un site sans aucun article publié, la
section affiche « Aucun article ».

Le thème affiche **7 articles par page** (réglage `posts_per_page` du thème) : la page 2 commence donc
exactement après les 7 articles de l'accueil. Les pages 2, 3… montrent une grille simple, sans bandeau.
Les pages de tag et d'auteur affichent aussi 7 articles par page.

### L'encart d'abonnement (visiteurs)

Sous « Derniers articles », un **visiteur** voit l'encart « S'abonner à *titre du site* » : la phrase
« C'est gratuit… », le bouton « S'abonner gratuitement » (même destination que les autres boutons
« S'abonner », voir plus haut), « Déjà abonné ? Se connecter » (le formulaire de connexion de la page
d'abonnement) et la liste des avantages (nouveaux articles
par e-mail, « En bref », « À lire plus tard », reprendre la lecture, réglages de lecture et, si les
commentaires sont ouverts à tous les abonnés — Settings → Membership → *Commenting* : « All members » —,
commenter les articles).

- Un abonné connecté ne le voit jamais.
- La croix le ferme **définitivement** sur ce navigateur (il revient seulement si le lecteur efface les
  données du site ou change d'appareil). Les autres boutons « S'abonner » restent.
- Il n'apparaît pas si les abonnements sont désactivés ou sur invitation seulement.

Les textes viennent des fichiers de traduction du thème (`locales/fr.json`) : pas de réglage Chaque avantage
garde son nom sur une ligne et son explication sur deux lignes au plus, quelle que soit la largeur ou la langue
(au-delà, le texte est coupé par « … » : gardez vos traductions courtes).

### « Reprendre la lecture » et « À lire plus tard » (abonnés)

À la place de l'encart, un **abonné connecté** voit une section avec deux listes gardées dans son
navigateur :

- **Reprendre la lecture** : les articles commencés et pas finis, avec une barre de progression et « 40 % lu
  • reste environ 7 min » (6 au plus ; un article lu à plus de 90 % sort de la liste). La liste est remplie
  par les pages d'article.
- **À lire plus tard** : les articles ajoutés avec le signet (voir [section 4](#4-signets--à-lire-plus-tard--sur-les-tuiles)).

Le titre de la section est un bouton : cliquez-le pour passer d'une liste à l'autre. La section s'ouvre sur
« Reprendre la lecture » s'il y a une lecture en cours, sinon sur « À lire plus tard ». Chaque carte est un
lien vers l'article et a un bouton « Retirer » ; « Tout retirer » vide la liste affichée ; « Tout voir »
(liste « À lire plus tard ») mène à la page du même nom — créez une page Ghost dont le slug est
`favoris` et le titre « À lire plus tard » (voir [Pages du site](#5-pages-du-site)). Quand les deux listes sont vides, la section n'existe pas.
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
article, enlevez-lui `#top` (et son tag de rang). Sans aucun article `#top`, rien ne s'affiche : ni titre,
ni espace vide. Astuce : regardez vos statistiques Ghost (Analytics) pour
choisir.

### Les rangées par tag

Sous « Les plus lus », le thème enchaîne des rangées de formes différentes, toujours dans cet ordre (deux
rangées voisines n'ont jamais la même forme) :

| Ordre | Forme | Réglage (onglet *Homepage*) | Sans réglage |
|---|---|---|---|
| 1 | Étagère de vignettes 16:9 qui défile | **Home row 1** | le tag le plus utilisé |
| 2 | Tuiles des tags (6 tags les plus utilisés, image du tag ou teinte) | — | toujours |
| 3 | Affiches 2:3 qui défilent, puis « Tous les articles » | **Home row 2** | le 2ᵉ tag le plus utilisé |
| 4 | Liste numérotée de 6 titres, du plus récent au plus ancien | **Home row 3** | le 3ᵉ |
| 5 | Bannière de collection (image du tag en fond, « Tag · N articles », 3 articles) | **Home row 4** | le 4ᵉ |
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
  n'importe quel site. Si vous ne fixez que certaines rangées, un tag fixé n'apparaît jamais deux fois : la
  rangée sans réglage qui retomberait sur un tag que vous avez fixé ailleurs est **omise** (par exemple, avec
  seulement *Home row 1* = `anime` alors qu'« Anime » est le 4ᵉ tag le plus utilisé, la rangée n° 4 disparaît).
  Pour avoir cinq rangées, fixez les cinq.
- Pour de belles rangées : donnez une **image** à vos tags (Tags → le tag → *Tag image*) pour les tuiles de
  tags et la bannière, et des images à la une à vos articles. **Bannière** : l'image du tag de *Home row 4*
  remplit le fond, assombrie à gauche pour que le nom reste lisible (une image large, 2000 px, sujet à droite) ;
  sans image, un fond sombre avec deux lueurs aux couleurs du logo.
- Au survol (ou au focus du clavier), les vignettes et les cartes **se soulèvent** légèrement, comme dans
  l'ancien thème, sans soulignement. Sans image, les tuiles et les affiches ont
  un fond teinté avec le titre en grand.
- Les pastilles « Format long » s'affichent seules sur les articles de 10 minutes de lecture ou plus.

### Vignette d'un article (image des cartes)

Les **cartes** d'un article (accueil : « Derniers articles », « Les plus lus », toutes les rangées ; pages de
tag et d'auteur ; articles liés en bas d'un article ; menu « ••• » ; page 404 ; « À lire plus tard » (accueil et page)
et « Reprendre la lecture ») montrent sa **vignette** :

1. l'**image de partage** de l'article, s'il en a une (Facebook d'abord, sinon X) ;
2. sinon son **image à la une** (la bannière de l'en-tête de l'article) ;
3. sinon le fond teinté avec le titre en grand.

L'**en-tête de l'article** et le **grand bandeau de l'accueil** gardent toujours l'image à la une.

**Pour donner à un article une vignette différente de sa bannière** : dans l'éditeur de l'article → panneau
des réglages (icône en haut à droite) → **Facebook card** → **téléverser l’image** (cliquez sur la zone d’image de la carte). Si
vous ne remplissez que la carte **X card**, c'est elle qui sert. C'est un champ natif de Ghost : Ghost n'a pas
de champ « miniature » séparé, et l'image de partage est déjà, par nature, l'image qui représente l'article
hors de sa page. Elle continue de servir aux réseaux sociaux exactement comme avant (le thème ne change rien à
ce que Ghost met dans les balises de partage).

C'est le cas typique d'une **bannière en aplat de couleur** (un fond uni derrière le titre de l'article) : sans
image de partage, la carte serait un rectangle de couleur ; avec elle, la carte montre la vraie illustration.

- **Taille conseillée** : 1200 × 675 px (16:9) ou plus, jusqu'à 1920 × 1080 ; les images de partage
  classiques en 1200 × 630 (1,91:1) conviennent aussi (les tuiles 16:9 en rognent un peu les côtés). Gardez
  l'essentiel loin des bords. Le thème la sert en WebP, à la bonne taille : un PNG lourd ne pénalise pas
  l'accueil.
- **Texte dans l'image** : il est permis (la carte affiche aussi le titre en dessous) ; écrivez-le assez
  grand pour rester lisible sur une petite vignette (152 px de large dans les listes compactes).
- **Affiches 2:3** (rangée *Home row 2*) : une image de partage y est montrée **en entier**, centrée, sur la
  bannière de l'article floutée (ou l'image elle-même floutée, sans bannière) plutôt que rognée en hauteur, ce
  qui couperait son texte. Avec une bannière en aplat de la même couleur que le fond de l'image de partage, le
  raccord est invisible. Un article sans image de partage garde son image à la une rognée en hauteur.
- **Transition entre les pages** : une carte qui montre une image de partage ne « glisse » pas jusqu'à
  l'en-tête de l'article (ce n'est pas la même image) ; la page passe en fondu.
- **Pas de texte alternatif** à remplir : sur les cartes, l'image est décorative (le titre suit).
- Les listes « À lire plus tard » et « Reprendre la lecture » gardent l'image enregistrée au moment où
  l'article a été gardé ou lu : un article gardé avant l'ajout d'une image de partage garde l'ancienne
  vignette jusqu'à ce qu'il soit gardé ou lu de nouveau.
- Rien à régler dans le thème : c'est toujours actif.

---

## 4. Signets « À lire plus tard » sur les tuiles

Pour un **abonné connecté**, chaque tuile d'article porte un signet rond dans son coin supérieur (à gauche) :

- sur ordinateur, il apparaît au survol ou au focus clavier de la tuile ; un article déjà dans la liste garde une
  petite pastille pleine ;
- sur écran tactile, il est toujours visible, en plus petit ;
- un clic ajoute l'article à « À lire plus tard » (signet plein) ou l'en retire ; tous les signets du même article suivent.

Ces articles remplissent la liste « À lire plus tard » de l'accueil et la page du même nom. Un visiteur ne
voit jamais les signets ; si le navigateur bloque le stockage (navigation privée stricte), les signets ne
sont pas affichés plutôt que de faire semblant. Rien à régler dans Ghost.

---

## 5. Pages du site

Les pages autres que l'accueil et les articles : pages de tag, auteurs, « Tags », « Auteurs »,
« Archives », « À lire plus tard », « À propos », la page d'abonnement, les pages ordinaires et la page 404.
Aucun fichier `routes.yaml` n'est nécessaire : tout repose sur des **pages Ghost** et des **modèles** du thème.

### Créer une page et lui donner son modèle

Une page « spéciale » (archives, « À lire plus tard », à propos, abonnement, tags, auteurs) est une page Ghost ordinaire,
souvent vide, à laquelle le thème applique un modèle. Deux façons, au choix :

1. **Par le slug (rien d'autre à faire)** : si l'adresse de la page est exactement le slug par défaut du
   tableau ci-dessous, Ghost applique le modèle tout seul.
2. **Par le menu « Template »** (pour une autre adresse, par exemple un site en anglais qui veut `/about/`) :
   dans les réglages de la page, choisissez le modèle dans la liste **Template**.

| Page | Slug par défaut (modèle automatique) | Nom dans le menu « Template » | Ce que vous écrivez dans Ghost |
|---|---|---|---|
| Archives | `archives` | Archives | rien (le contenu, s'il y en a, s'affiche en introduction) |
| À lire plus tard | `favoris` | Saved Posts | rien (seul le titre sert : « À lire plus tard ») |
| À propos | `a-propos` | About | titre, extrait, texte (voir plus bas) |
| Abonnement | `newsletter` (ou `abonnement`, `subscribe`) | Subscribe | extrait (accroche) et une ligne légale (voir plus bas) |
| Tous les tags | `tags` | Tags | titre, contenu ou extrait facultatif (introduction) |
| Tous les auteurs | `authors` | Authors | titre, extrait facultatif |
| Mentions légales (ou toute page de référence) | `mentions-legales` | Document | titre, extrait facultatif, texte avec intertitres (voir plus bas) |

Pas à pas :

1. Ghost Admin → **Pages** → **New page**.
2. Tapez le **titre** (il devient le grand titre de la page : « Archives », « À lire plus tard », « À propos »…).
3. Ouvrez les réglages de la page (icône en haut à droite) :
   - **Page URL** : le slug du tableau (`archives`, `favoris`, `a-propos`, `newsletter`, `tags`, `authors`) ;
   - ou, pour une autre adresse, **Template** → le modèle voulu ;
   - **Excerpt** (extrait) : la phrase d'accroche quand la page en utilise une (à propos, abonnement, tags,
     auteurs).
4. **Publish**.
5. Pour la rendre visible : Settings → **Navigation** → ajoutez le lien (par exemple dans la navigation
   secondaire, qui forme le pied de page et le menu « Plus » : « Archives » → `/archives/`, « À lire plus tard » →
   `/favoris/`).

> Le lien « Tout voir » de « À lire plus tard » (accueil), le bouton « Voir ma liste » de la page
> d'abonnement et « Voir toute la série » (articles) pointent vers `/favoris/` et `/archives/` : gardez ces
> slugs, ou prévoyez une redirection (Settings → Labs → Redirects) si vous en choisissez d'autres.

### Pages de tag

Chaque tag public a sa page (`/tag/<slug>/`) : un en-tête habillé, l'article « À la une de ce tag », puis
la grille des autres articles (7 par page) et la pagination.

- **Image** : Ghost Admin → **Tags** → le tag → **Tag image**. Elle remplit la droite de l'en-tête et se fond
  dans le fond sombre sous le texte (sur téléphone, toute la carte, sous un voile). Sans image : carte sombre
  unie.
- **Description** : même écran, champ **Description**. Elle s'affiche sous le nom (et sur la page
  « À propos »). Vide : la ligne disparaît.
- **Nombre d'articles** : automatique (« 24 articles avec ce tag »).
- **Article en tête** : le plus récent des articles du tag marqués **Feature this post** (réglages de
  l'article). S'il n'y en a aucun, l'article le plus récent du tag. Il n'est pas répété dans la grille de la
  page 1 ; les pages 2 et suivantes n'ont que la grille. Un tag qui n'a qu'**un seul article** n'affiche que
  cet article en tête, sans section « Tous les articles » vide dessous.
- **Tag sans article** : l'en-tête dit « Aucun article avec ce tag » et la page affiche « Aucun article ».
- Les tags internes (`#…`) n'ont pas de page : c'est le comportement de Ghost.

### Pages d'auteur

`/author/<slug>/` montre la photo, le nom, la bio, le lieu, les liens et les articles de l'auteur. Tout se règle
dans Ghost Admin → **Settings** → **Staff** → l'auteur : **Profile picture**, **Cover picture** (image de
l'en-tête), **Bio** (250 caractères au plus, limite de Ghost), **Location**, **Website** et les comptes
sociaux (X, Facebook, LinkedIn, Bluesky, Threads, Mastodon, TikTok, YouTube, Instagram). Chaque élément vide
disparaît.

### Un seul auteur : pas de page d’auteur

Sur un blog écrit par une seule personne, la page d'auteur répète l'accueil. La règle du thème, automatique :
**quand un seul auteur a des articles publiés**, le thème ne fait jamais de lien vers une page d'auteur ni vers
la page « Auteurs » :

- en-tête d'article : le nom et la photo de l'auteur sont du texte, pas des liens ;
- boîte auteur en fin d'article : nom et photo sans lien, et **pas** de bouton « Tous ses articles » (il
  reste « À propos ») ;
- page « À propos » : le nom de l'auteur n'est pas un lien ;
- tuiles, 404, pied de page : le thème n'y met aucun lien d'auteur (il n'y en a pas sur les tuiles).

Le thème compte les auteurs qui ont **au moins un article (ou une page) publié** — un membre de l'équipe qui
n'a rien publié ne compte pas. Dès qu'un deuxième auteur publie, les liens reviennent partout, sans rien
régler. Le calcul est une requête Ghost d'une ligne (`{{#get "authors" limit="1"}}` et son total) faite
dans `post.hbs` pour l'en-tête et pour la boîte auteur, et une fois sur « À propos » ; jamais dans une boucle.

Ghost garde l'adresse `/author/<slug>/` (un thème ne peut pas supprimer une route). Sur un site à un seul
auteur, elle affiche toujours la liste de ses articles, mais demande aux moteurs de recherche de ne pas
l'indexer (`<meta name="robots" content="noindex, follow">`). Deux choses à faire de votre côté :

1. **Retirez « Rédacteur » de la navigation** : Ghost Admin → **Settings** → **Navigation** → la ligne
   « Rédacteur » (`/author/alexis/`) dans **Secondary navigation** → la corbeille → **Save**. Ce lien vous
   appartient, le thème ne le cache pas.
2. **(Facultatif) Redirigez la page d'auteur**, par exemple vers « À propos » : créez un fichier
   `redirects.yaml` (remplacez `alexis` par votre slug, visible dans Settings → Staff → votre profil) :

   ```yaml
   301:
     ^\/author\/alexis\/(page\/\d+\/)?$: /a-propos/
   ```

   puis Ghost Admin → **Settings** → **Labs** → **Redirects** → **Upload redirects file**. La page d'auteur
   et ses pages 2, 3… mènent alors à « À propos » (testé sur Ghost 6) ; le flux `/author/alexis/rss/` reste
   en place. Ghost liste encore l'adresse dans `sitemap-authors.xml` : sans gravité, la redirection suffit.

### Pages « Tags » et « Auteurs »

Créez une page `tags` (ou le modèle **Tags**) : tous les tags publics qui ont des articles, en
mosaïque, détaillée juste en dessous ([Page « Tags » : la mosaïque](#page--tags---la-mosaïque)).

Créez une page `authors` (ou le modèle **Authors**) : une carte par auteur (photo, nom, nombre d'articles,
bio, liens), du plus prolifique au moins prolifique. Elle sert aux sites à plusieurs auteurs ; sur un site à un
seul auteur elle fonctionne encore (une seule carte) mais le thème n'y fait aucun lien, et vous n'avez pas
besoin de la créer.

### Page « Tags » : la mosaïque

**Ce qu'on voit.** Le titre de la page, le nombre de tags, une introduction (le **contenu** de la page, à
défaut son **extrait**), un bouton **« Mélanger »**, puis une mosaïque (« bento ») de tous les tags publics
qui ont au moins un article : des cases de tailles variées (1×1, 2×1, 1×2, 2×2) sur 2 colonnes (téléphone),
4 (tablette) ou 6 (ordinateur), sans trou. Chaque case montre l'**image du tag** sous un voile sombre (texte
lisible sur toute image) ou, sans image, une **surface teintée** ; une icône choisie d'après le slug du tag
(la même règle que les tags de la page À propos, voir plus bas) ; puis le nom et le nombre d'articles. Les grandes cases (2×2) affichent aussi la **description** du tag. En bas,
un lien « Tous les articles, par date » mène à `/archives/` (créez la page Archives, voir plus bas).

**Rendre la page plus riche (Ghost Admin → Tags → le tag) :**
- **Tag image** : c'est elle qui fait la page. Les grandes cases vont de préférence aux tags qui ont une image
  et beaucoup d'articles ; un tag sans image, sans description et hors des 3 plus fournis n'est jamais en 2×2.
- **Description** : affichée dans les grandes cases et dans l'aperçu (ci-dessous). Une ou deux phrases.
- Les tags internes (`#…`) et les tags sans article n'apparaissent pas.

**Une disposition différente à chaque visite.** Quelles cases sont grandes et dans quel ordre elles viennent
change à chaque visite (et à chaque rechargement), tiré au hasard mais pondéré : les tags les plus fournis et
illustrés restent plutôt en tête et plutôt grands. Le tirage se fait avant l'affichage (rien ne bouge sous les
yeux du lecteur) ; l'ordre du clavier et des lecteurs d'écran suit l'ordre visuel (les cases sont réellement
réordonnées dans la page). En revenant sur la page (bouton Précédent), le lecteur retrouve la disposition qu'il
avait quittée. **« Mélanger »** tire une nouvelle disposition, avec une courte animation (aucune si le lecteur
a demandé moins d'animations).
Sans JavaScript, ou avec le mode « économie de données » du navigateur, la page garde l'ordre par défaut : du
tag le plus fourni au moins fourni, le premier en grand. Il n'y a pas de réglage pour couper le hasard : si
vous le voulez, retirez de `partials/pages/tags.hbs` la ligne `{{> "tags/prepaint"}}` (au début du fichier,
dans le bloc `{{#contentFor "preload"}}`). L'ordre par défaut reste, sans « Mélanger » ni le nombre de tags
sous le titre. À refaire après chaque mise à jour du thème.

**L'aperçu au survol.** Avec une souris, laisser le pointeur environ une demi-seconde sur une case l'agrandit
en une carte posée au-dessus des autres : image, nom, nombre d'articles, description, **les 3 derniers
articles du tag** (titre, date, temps de lecture) et un bouton **« Voir le tag »**. La carte se ferme quand
le pointeur s'en va, avec Échap, en cliquant ailleurs ou en faisant défiler la page. Au clavier et sur écran
tactile, le petit bouton **(i) « Détails »** dans le coin de la case ouvre la même carte (un clic ou un
toucher sur la case, lui, ouvre toujours la page du tag) ; Échap ou « Fermer » la referme.
Les derniers articles viennent des **200 articles les plus récents** du site, lus une seule fois par la page :
un tag dont tous les articles sont plus anciens montre seulement son nombre d'articles. (Mesuré sur un Ghost 6
local de 102 articles et 32 tags : 145 ms pour la page avec ces articles, contre 177 ms avec une requête par
tag, qui monterait vers 0,8 s avec 200 tags.)

**Plus de 200 tags.** Ghost renvoie au plus 100 tags par requête ; le modèle en fait deux, soit 200 tags.
Pour aller au-delà, ajoutez dans `partials/pages/tags.hbs` un bloc
`{{#get "tags" limit="100" page="3" include="count.posts" filter="visibility:public" order="count.posts desc"}}…{{/get}}`
sur le modèle du deuxième.

### Archives

La page liste **tous** les articles publiés, du plus récent au plus ancien, groupés par année puis par mois
(jour, titre, tag, durée). En haut, une barre sans bordure filtre la liste sans recharger la page :
boutons d'année (« Toutes », puis chaque année trouvée), champ « Rechercher un titre » (sans tenir compte des
accents ni des majuscules), liste « Tag » (tags publics avec leur nombre d'articles sur tout le site) et
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

### La page « À lire plus tard »

Réservée aux **abonnés connectés** : la grille des articles ajoutés avec le signet, du
dernier ajouté au premier, avec un bouton « Retirer » sous chaque tuile et « Tout retirer » en haut (avec
confirmation). La liste est gardée **dans le navigateur, sur cet appareil** (elle ne suit pas l'abonné sur un
autre appareil et disparaît si l'on efface les données du site) ; la phrase sous le titre le dit. Liste vide :
« Rien à lire plus tard pour l'instant » et le geste à faire. Stockage bloqué (navigation privée stricte) :
un message l'explique. Un **visiteur** voit une invitation à s'abonner ou à se connecter.

À créer : une page `favoris` (ou le modèle **Saved Posts**), vide ; son titre est le grand titre : donnez-lui
le nom de la liste, **« À lire plus tard »** (partout ailleurs, le thème n'emploie que ce nom : bouton des
articles, signets, liste de l'accueil, page d'abonnement, page « Cookies et confidentialité »). L'adresse
reste `/favoris/` : c'est celle que visent « Tout voir » et « Voir ma liste ». Si la page existe déjà sous
un autre titre, renommez-la (son titre seulement, pas son slug), ainsi que son lien dans la navigation. Ajoutez-la à la navigation secondaire si vous voulez un lien permanent. La page demande aux moteurs de
recherche de ne pas l'indexer (`noindex, follow`) : sa liste est propre à chaque lecteur, il n'y a rien à référencer.

### À propos

Une page que vous remplissez dans Ghost ; le thème n'écrit aucun texte personnel. Créez une page `a-propos`
(ou le modèle **About**). La page tient en peu de titres : le titre, l'accroche, puis **un seul bloc en
mosaïque** (« bento ») qui porte tout le reste, dans cet ordre de lecture (le même sur téléphone, où les
cases s'empilent en une colonne ; 2 colonnes sur tablette, 4 sur ordinateur) :

1. les **tags**, une case chacune ;
2. **votre texte** (l'éditeur de la page) ;
3. **l'auteur** ;
4. **un chiffre** : le nombre d'articles publiés et l'année du premier ;
5. **« Suivre le blog »**.

Voici où va chaque texte et chaque image, avec les brouillons de la maquette à coller :

1. **Titre** de la page : `À propos`.
2. **Excerpt** (réglages de la page : la roue crantée en haut à droite de l'éditeur → **Excerpt**) =
   l'accroche, en grand sous le titre. Une seule phrase, qui dit aussi que vous écrivez hors des tags :
   > Mon blog personnel : j'y publie ce qui me fait envie, autour de l'informatique, de la culture pop, des
   > jeux vidéo et des animés, et parfois sur tout autre chose, simplement parce que j'ai envie d'en parler.

   Ne répétez pas cette idée dans le texte de la page (point 4).
3. **Les tags** : une case par tag public. Chaque case mène à la page du tag et montre son nom, sa description,
   son nombre d'articles, et son image :
   - lesquelles : réglage du thème **About tags** (Site wide), les slugs séparés par des virgules, jusqu'à 12,
     par exemple `actualites,jeux-video,anime,dossiers,ia,test`. Vide : les 6 tags publics les plus utilisés ;
   - **ordre et tailles** : du tag le plus fourni au moins fourni (l'ordre de la liste du réglage ne compte
     pas). La première case est la plus grande (2 × 2 sur ordinateur, toute la largeur sur tablette, plus
     haute sur téléphone), la deuxième est large, les suivantes vont par quatre ; une dernière rangée
     incomplète élargit ses cases pour ne laisser aucun trou. Cela marche de 1 à 12 tags ;
   - la **phrase** de chaque case = la **Description** du tag (Ghost Admin → Tags → le tag). Les textes de la
     maquette :

     | Tag | Description à coller |
     |---|---|
     | Actualité | Ce qui bouge dans la tech, le jeu vidéo et la pop culture, avec mon avis. |
     | Jeux vidéo | L'actualité des jeux qui m'intéressent, mes avis et mes tops de l'année. |
     | Anime | Les séries à voir en VF chaque saison, et le doublage en général. |
     | Dossier | Les articles longs, quand un sujet mérite qu'on s'y arrête. |
     | IA | Les outils et les débats autour de l'intelligence artificielle. |
     | Test | Logiciels, services et jeux essayés pour de bon. |

     (Ces descriptions s'affichent aussi en tête des pages de tag.) Sans description, la case garde le
     nom et le nombre d'articles ;
   - l'**image** de la case = l'image du tag (Ghost Admin → Tags → le tag → **Tag image**), assombrie sous le
     texte pour qu'il reste lisible quelle que soit la photo. Sans image : une surface teintée (quatre teintes
     qui alternent) ;
   - l'**icône** de chaque case vient de mots du **slug** du tag : `actu`, `news` → journal ; `jeu`,
     `game`, `esport` → manette ; `anime`, `manga`, `serie`, `film`, `cinema`, `video`, `tv` → écran ;
     `dossier`, `guide`, `long` → dossier ; `ia` (seul, ou `ia-…`/`…-ia`), `ai`, `intelligence` → étincelle ;
     `test`, `review`, `avis` → coche ; `informatique`, `tech`, `code`, `dev`, `program`, `web` → chevrons ;
     tout autre slug → `#`. La liste est dans `partials/about/tag-icon.hbs` (une ligne à ajouter pour un
     nouveau mot).
4. **Le texte de la page** (l'éditeur) est **facultatif**. S'il y en a, il s'affiche juste après les
   tags, en grand, dans la police de lecture, sans cadre (plusieurs paragraphes, une image y tiennent).
   Sans texte — ou avec seulement la carte `about-links` du point 7, ce que fait GEEKLY — ce bloc
   disparaît et les cases de l'auteur, du chiffre et de « Suivre » suivent directement les tags.
5. **L'auteur** = les auteurs du site qui ont publié : photo, nom, **Bio**, **Location** et **Website** de
   leur fiche (Settings → Staff ; chaque élément vide disparaît). Un seul auteur : une grande case, le nom
   n'est pas un lien (voir [Un seul auteur](#un-seul-auteur--pas-de-page-dauteur)). Plusieurs : une case
   sur toute la largeur, les auteurs côte à côte, chaque nom menant à sa page (12 au plus). Ghost limite la
   bio à **250 caractères** : le texte de la maquette (environ 600) est trop long ; une version courte :
   > Développeur front-end et designer UX/UI en freelance. GEEKLY, c'est mon terrain de jeu : j'y écris seul,
   > à mon rythme, sur ce qui m'occupe en dehors du travail.

   Pour garder le texte complet, mettez-le dans le texte de la page (point 4).
6. **Le chiffre** : « 102 articles publiés depuis 2023 », calculé par Ghost (tous les articles publiés,
   réservés aux abonnés compris, et l'année du plus ancien). Rien à régler ; sans article publié, la case
   disparaît.
7. **« Suivre le blog »** = les comptes sociaux du **site**, le flux RSS, et « S'abonner » pour les
   visiteurs. Les comptes se saisissent dans Ghost Admin → **Settings** → **General** → **Social
   accounts** : X, Facebook, LinkedIn, **Bluesky** (votre identifiant, par exemple `monblog.bsky.social`),
   Threads, Mastodon, TikTok, YouTube, Instagram. Chaque compte rempli devient une icône (avec son nom
   pour les lecteurs d'écran) ici **et** dans le pied de page de tout le site ; un compte vide n'apparaît
   nulle part. Pour des liens que Ghost ne connaît pas (portfolio, GitHub…), ajoutez
   dans le texte de la page une carte **HTML** (bouton `+` → HTML) :

   ```html
   <ul class="about-links">
     <li><a href="https://alexisdechiara.fr">Portfolio</a></li>
     <li><a href="https://github.com/alexisdechiara">GitHub</a></li>
   </ul>
   ```

   Le thème déplace ces liens dans « Suivre le blog », en pastilles, sous les icônes. Sans JavaScript ils
   restent où vous les avez mis, avec le même style.

### Page d'abonnement

La page vers laquelle mènent tous les boutons « S'abonner » et « Se connecter ». Elle suit le mode clair ou
sombre du site comme toutes les pages (fond de la page, pas de bande sombre, pas de carte) : une section
d'au moins la hauteur de l'écran, son contenu centré, avec à gauche le formulaire et à droite ce que
l'abonnement apporte ; puis les questions fréquentes repliables. Pas de rappel en bas de page (elle est
courte).

1. **Créer la page** : slug `newsletter` (ou `abonnement`, ou `subscribe` ; pour un autre slug, choisissez le
   modèle **Subscribe** et remplissez le réglage **Subscribe url**). Son titre ne s'affiche pas (le grand
   titre est « S'abonner à » + le nom du site).
2. **Relier les boutons** : rien à faire pour ces trois slugs (voir
   [Bouton « S'abonner »](#bouton--sabonner--et--se-connecter-)). Le réglage **Subscribe url** reste possible
   pour forcer une autre adresse.
3. **Accroche** = l'**Excerpt** de la page. Vide : la phrase du thème (« C'est gratuit : recevez les derniers
   articles directement dans votre boîte mail et profitez des outils de lecture réservés aux abonnés. »).
4. **Ligne légale** = le **texte de la page** (l'éditeur), affiché en petit sous le formulaire. À coller :
   > En vous inscrivant, vous déclarez avoir lu et accepté les [mentions légales](/mentions-legales/). Votre
   > adresse sert seulement à vous envoyer les articles et vos liens de connexion ; elle n'est pas revendue.

   Gardez-le court (une ou deux phrases) : c'est l'endroit pour tout ce qui est propre à votre site
   (consentement, usage de l'adresse).
5. **Dans Ghost** : Settings → **Membership** → inscription ouverte à tous (**Anyone can sign up**) et au
   moins une newsletter active (Settings → **Newsletters**). Inscription sur invitation : la page ne montre
   que le formulaire de connexion. Abonnements désactivés : ni l'un ni l'autre.

**Deux états, une seule page** :

- **S'abonner** (par défaut, `#inscription`) : « Votre nom (facultatif) » puis « Votre adresse e-mail »,
  bouton « S'abonner ». Le nom est enregistré dans la fiche de l'abonné (Members). Une adresse vide ou mal
  écrite est signalée poliment sous le champ (« Veuillez saisir votre adresse e-mail », « Veuillez entrer une
  adresse e-mail valide ») sans rien envoyer. Pendant l'envoi le bouton montre une roue, puis « Super ! Vous
  vous êtes inscrit avec succès. Regardez votre boîte mail… » : l'abonné confirme en cliquant le lien reçu.
  En cas d'erreur (envoi d'e-mail impossible…), le message de Ghost s'affiche sous le champ.
- **Se connecter** (`#connexion`, ou « Déjà abonné ? Se connecter ») : l'adresse e-mail, bouton « Recevoir un
  lien de connexion ». Ghost envoie un lien de connexion par e-mail (pas de mot de passe). Le message de
  réussite dit « Si cette adresse est abonnée, un lien de connexion arrive » : Ghost répond de la même façon
  pour une adresse inconnue (il ne dit pas qui est abonné) mais n'envoie alors rien. « Pas encore abonné ?
  S'abonner » revient au premier état.

Ce que le thème écrit lui-même (identique pour tout site utilisant le thème, donc vrai partout) : la liste
des avantages — chacun un titre sur une ligne et une explication de deux lignes au plus (la newsletter, puis
les outils de lecture du thème réservés aux abonnés : « En bref », « À lire plus tard », « Reprendre la
lecture », « Réglages de lecture » ; « Commenter les articles » seulement si les commentaires sont ouverts à
tous les abonnés, Settings → Membership → Commenting) —, « Aucun paiement · désinscription en un clic depuis
chaque e-mail », et les trois questions (gratuit ? mot de passe ? désinscription ?).

**Abonné connecté** : à la même adresse, « Vous êtes abonné à GEEKLY », son adresse e-mail, **Gérer mon
compte** (Portal : e-mails, newsletters, profil), **Retour à l'accueil**, **Se déconnecter**, et ses outils
(avec « Voir ma liste » → `/favoris/`).

### Ce qui passe encore par Portal

Portal est la fenêtre de Ghost pour les comptes abonnés. Le thème l'a remplacée pour **s'abonner** et **se
connecter** (sa page d'abonnement, avec les formulaires natifs de Ghost). Restent dans Portal :

- **Compte** (icône de l'en-tête pour un abonné connecté, « Gérer mon compte » sur la page d'abonnement) :
  préférences d'e-mail, choix des newsletters, nom, désinscription. Ghost n'offre aucun équivalent qu'un
  thème puisse construire : ces écrans n'existent que dans Portal ;
- la page d'abonnement elle-même tant qu'elle n'existe pas (dernier recours des boutons) ;
- les abonnements **payants** (Stripe) s'il y en a : le choix d'une offre et le paiement passent par Portal.

**Ce qu'on peut changer dans Portal** — dans Ghost Admin, pas dans le thème : Portal s'affiche dans une
fenêtre (iframe) que les styles du thème n'atteignent pas.

- Settings → **Design & branding** → **Accent color** : la couleur des boutons et liens de Portal (mettez
  celle du thème, `#4285F4` pour GEEKLY) ; le logo / l'icône du site apparaissent aussi en haut de Portal.
- Settings → **Membership** → **Portal settings** (*Customize*) : *Signup options* (afficher le champ nom,
  les offres, un texte de conditions, la case à cocher obligatoire), *Look & feel* (le bouton flottant
  « Subscribe » en bas à droite : **désactivez « Show Portal button »**, le thème a les siens ; son style,
  son icône, son texte), *Account page* (adresse de contact affichée).
- Les textes de Portal suivent la langue du site (Settings → General → *Publication language*).

Rien d'autre (police, coins, mise en page) n'est réglable : c'est la limite de Ghost, pas du thème.

### Pages ordinaires

Toute autre page utilise une colonne de lecture calme (police du site, Onest, en 17 px avec un interligne
généreux, 65 à 69 caractères par ligne environ, cartes Ghost à leur largeur : large, pleine largeur). Le titre, l'extrait et l'image s'affichent,
sauf si vous décochez **Show title and feature image** dans les réglages de la page (le titre reste lisible
par les lecteurs d'écran). Ce que le thème soigne pour toutes les pages :

- **Listes** et **listes de définitions** (`<dl>` : un terme et sa valeur côte à côte, l'un sous l'autre sur
  téléphone) ;
- **Tableaux** : ligne d'en-tête marquée, cellules alignées en haut ; un tableau trop large pour un téléphone
  défile dans son propre cadre (une ombre indique qu'il reste à voir), jamais la page entière ;
- **Impression** : seuls le titre, l'extrait et le texte sont imprimés, en noir sur blanc, l'adresse de
  chaque lien externe entre parenthèses ; ni en-tête, ni pied de page, ni boutons.

### Mentions légales et pages de référence

Pour une page longue que l'on consulte pour y trouver une réponse (mentions légales, politique de
confidentialité, conditions d'utilisation), le thème a un modèle **Document** :

- le titre, l'extrait, puis **« Dernière mise à jour le … »** et un bouton **Imprimer** (caché sur téléphone,
  où le menu du navigateur suffit) ;
- un **sommaire** construit tout seul à partir des intertitres : sur grand écran (à partir de 1152 px) il
  reste visible à droite du texte et suit la lecture (les sous-titres de la section en cours s'ouvrent) ;
  sur tablette et téléphone c'est un bouton « Sommaire » qui se déplie au-dessus du texte ;
- un bouton « copier le lien » sur chaque intertitre, comme dans les articles ;
- un trait fin entre les grandes sections, et les **listes de définitions** (`<dl>` : éditeur, hébergeur,
  contact…) présentées comme un bloc d'identité encadré.

**Comment l'appliquer.** Par le slug : une page dont l'adresse est `mentions-legales` prend ce modèle toute
seule (fichier `page-mentions-legales.hbs`). Pour toute autre adresse (`confidentialite`, `legal`…) :
réglages de la page → **Template** → **Document**.

**Écrire le texte.** Le sommaire ne connaît que les intertitres : utilisez **Heading 2** (`##`) pour les
grandes sections et **Heading 3** (`###`) pour leurs sous-parties ; il apparaît dès qu'il y a deux
intertitres. Le plus simple pour un texte préparé à l'avance :

1. Ouvrez la page dans Ghost, effacez l'ancien contenu (ancienne carte HTML comprise).
2. Tapez `/markdown` puis Entrée : une carte Markdown s'ouvre.
3. Collez le texte (pour GEEKLY : tout ce qui se trouve entre les deux commentaires « Texte à coller » et
   « Fin du texte à coller » de `docs/mentions-legales-proposition.md`, après avoir rempli les crochets).
4. Réglages de la page : **Excerpt** = la phrase d'accroche (facultatif) ; vérifiez **Page URL** =
   `mentions-legales` ou **Template** = Document.
5. **Update**. La date « Dernière mise à jour » se met à jour toute seule.

Un bloc d'identité s'écrit en HTML dans la carte Markdown (Ghost l'accepte tel quel) :

```html
<dl>
<dt>Éditeur et directeur de la publication</dt>
<dd>Prénom Nom</dd>
<dt>Contact</dt>
<dd><a href="mailto:contact@exemple.fr">contact@exemple.fr</a></dd>
</dl>
```

Les tableaux s'écrivent en Markdown (`| Nom | Durée |` puis `|---|---|`).

**La date.** C'est la date du dernier enregistrement de la page dans Ghost (`updated_at`) : corriger une
faute la change aussi. Pour une page de mentions légales, c'est ce qu'on attend (la page a été revue ce
jour-là).

**Sans JavaScript** : pas de sommaire ni de bouton Imprimer (le texte, les intertitres et leurs ancres
restent). Un abonné qui a choisi une autre palette de lecture garde le mode clair / sombre du site sur cette
page (les palettes de lecture ne s'appliquent qu'aux articles).

### Cookies et confidentialité : la page, le panneau, le consentement

> Ce qui suit est une aide à la rédaction et à la conception, **pas un conseil juridique**. Les sources et
> les points incertains sont listés à la fin de cette section.

**Le principe du thème : ne demander qu'au moment et à l'endroit où c'est nécessaire.** Réglé comme il est
livré (et comme décrit dans la liste « Pour un site sans consentement » plus bas), le site ne lit ni n'écrit
rien dans le navigateur qui demande un accord préalable : le thème ne dépose aucun cookie ; ce qu'il garde
dans le stockage du navigateur est soit un choix d'interface fait par le lecteur (mode sombre, réglages
d'affichage, encart fermé), soit nécessaire à un service que le lecteur utilise (ses listes d'abonné), soit
ses propres choix de confidentialité ; les polices sont servies par le site ; la mesure d'audience Plausible,
sans cookie, entre dans l'exemption de la CNIL (voir plus bas). La seule chose qui demande l'accord, ce sont
les **contenus d'autres sites** (vidéos YouTube, publications X…) : ils ne se chargent jamais sans lui.

D'où ce qui s'affiche, et seulement là :

- **sur une page sans contenu intégré** (accueil, pages de tag, la plupart des articles) : **rien**, jamais ;
- **sur un article qui en contient** : pas de carte ni de bandeau. La demande est faite **à la place de
  chaque contenu, tant que le lecteur n'a pas accepté** : un encadré qui dit d'où il vient et ce que
  l'afficher envoie (son adresse IP au service, qui peut déposer des cookies), avec **« Accepter et
  afficher »** (ce contenu, et désormais tous les contenus intégrés du site sans clic, pendant 6 mois ou
  jusqu'au retrait ; l'encadré le dit) et **« Afficher seulement celui-ci »** (ce contenu, rien n'est
  gardé), plus « Gérer mes choix » et « Voir sur YouTube ». Le lecteur qui n'y touche pas ne voit rien
  d'autre : chaque contenu reste masqué.
- **la carte « Votre accord, si vous le souhaitez »** ne sert qu'aux outils que vous ajoutez vous-même et
  marquez `data-consent` (mesure d'audience, publicité… : voir « Brancher un outil » plus bas), sur les
  pages où ils sont, et ne demande que pour eux.

Toujours disponibles :

- **un lien « Cookies et confidentialité »** dans la barre du pied de page, sur toutes les pages : il ouvre
  un petit panneau de réglages (une fenêtre au centre sur ordinateur, un volet par le bas sur téléphone) ;
- **une page « Cookies et confidentialité »** (à créer, voir ci-dessous) : votre texte, puis ce que le thème
  y ajoute tout seul, toujours à jour.

**Le panneau** (rien ne s'affiche tant que le lecteur ne l'ouvre pas) :

| Partie | Quand elle apparaît | Ce qu'elle fait |
|---|---|---|
| Services facultatifs | sauf avec *Consent notice* = None, et seulement si le site a ajouté un script marqué `data-consent` sur la page (ou si le lecteur l'a déjà accepté) | « Mesure d'audience » et/ou « Autres services », avec « Tout refuser » / « Tout accepter », qui ne valent que pour ces interrupteurs |
| Contenus intégrés | toujours | Un seul groupe. Sauf avec *Consent notice* = None, d'abord l'interrupteur « Tous les contenus intégrés » (la réponse donnée par « Accepter et afficher ») ; puis « Service par service », un interrupteur par service (« YouTube », « X »…) présent sur la page ou déjà réglé (tous les services sur la page Cookies). Chaque service montre ce qui se passe vraiment : son propre choix s'il y en a un, sinon celui de « Tous les contenus intégrés ». Allumer ou éteindre « Tous les contenus intégrés » règle tous les services de la même façon ; un service réglé ensuite garde son réglage |
| Statistiques de visite | quand la page charge Plausible | « Compter mes visites » : désactivé, le thème écrit `plausible_ignore` = `true`, le drapeau que le script de Plausible lit pour ignorer ce navigateur ([documentation Plausible](https://plausible.io/docs/excluding-localstorage)) |
| Votre lecture | abonné connecté | « Retenir où je m'arrête dans les articles » (« Reprendre la lecture ») : activé par défaut ; désactivé, la liste est effacée et plus rien n'est noté. Le même choix est dans les **Réglages d'affichage** (« Retenir où je m'arrête ») |
| Données dans ce navigateur | toujours | Combien d'éléments le site garde, et « Effacer les données du site » (tout, choix compris). Si cela efface une liste d'abonné (« À lire plus tard », « Reprendre la lecture »), le site demande d'abord, en disant combien d'articles seraient perdus ; de même pour « Tout effacer » et « Effacer » sur la page Cookies |

En bas : « Tout ce que le site garde, en détail », vers la page. Le panneau se ferme avec Échap, le bouton ×
ou un clic à côté ; le focus revient sur ce qui l'a ouvert.

#### Créer la page « Cookies et confidentialité »

1. Pages → **New page**, titre « Cookies et confidentialité ».
2. Réglages de la page → **Page URL** : `cookies` (le modèle s'applique seul ; `confidentialite` marche
   aussi). Pour une autre adresse : **Template** → **Privacy**.
3. Collez le texte proposé dans `docs/cookies-proposition.md` (entre « Texte à coller » et « Fin du texte à
   coller ») dans une carte Markdown (`/markdown`), **Excerpt** = la phrase proposée, puis **Publish**.
4. Ajoutez-la à la navigation secondaire si vous voulez (Settings → Navigation) ; ce n'est pas nécessaire :
   le lien du pied de page la trouve tout seul (il mène au panneau, et à la page sans JavaScript).
5. Dans les mentions légales, la section « Cookies » renvoie à cette page (texte déjà prêt dans
   `docs/mentions-legales-proposition.md`).

La page prend le modèle **Document** (titre, date de mise à jour, sommaire, impression) et le thème ajoute
après votre texte trois sections, qui entrent dans le sommaire :

- **Dans ce navigateur, en ce moment** : ce que le navigateur du lecteur garde pour le site (nom, à quoi il
  sert, contenu résumé), un bouton « Effacer » par ligne et « Tout effacer » ; une phrase sur le cookie de
  connexion de Ghost (illisible par les scripts) avec « Votre compte » et « Se déconnecter » pour un abonné ;
- **Vos choix** : les mêmes interrupteurs que le panneau, avec tous les services de contenus intégrés ;
- **Tout ce que le site peut garder dans votre navigateur** : la liste complète, tirée du code du thème.

Votre texte n'a donc pas à lister les clés de stockage : la page le fait, et reste juste quand le thème
change.

#### Pour un site sans consentement : la liste du propriétaire

Ce que le thème ne peut pas régler pour vous, dans Ghost Admin :

| Réglage | Où | Recommandé | Pourquoi |
|---|---|---|---|
| **Newsletter opens** | Settings → **Analytics** | désactivé | Le suivi des ouvertures passe par un pixel invisible dans chaque e-mail. Depuis sa recommandation du 12 mars 2026 (publiée le 14 avril 2026), la CNIL demande le consentement pour ces pixels, sauf exceptions étroites (mesure individuelle de la délivrabilité, sécurité) ; la période de transition pour les adresses déjà collectées s'est terminée le 14 juillet 2026. |
| **Newsletter clicks** | Settings → **Analytics** | désactivé | Ghost réécrit chaque lien de l'e-mail avec l'identifiant de l'abonné : un lien de suivi, que la CNIL rattache aussi à l'article 82 (même s'il n'est pas l'objet direct de la recommandation) et que l'EDPB range avec les pixels (lignes directrices 2/2023, § 49–51). |
| **Member sources** | Settings → **Analytics** | désactivé | Ghost note dans `sessionStorage` (`ghost-history`) les pages vues par chaque visiteur et le site d'origine, et les rattache à l'abonné quand il s'inscrit. Ce n'est ni nécessaire au service demandé ni une mesure d'audience anonyme : sans consentement, mieux vaut l'éteindre. Désactivé, Ghost ne charge plus son script `member-attribution`. |
| Outbound link tagging | Settings → Analytics | au choix | Ajoute `?ref=geekly.blog` aux liens sortants : le nom du site, rien sur le lecteur. Pas un traceur du lecteur. |
| Web analytics (Ghost) | Settings → Analytics | éteint si vous gardez Plausible | Non configuré sur un Ghost auto-hébergé sans Tinybird. |
| Code injection | Settings → Code injection | rien d'autre que Plausible | Tout script ajouté là s'exécute sans demander : voir « Brancher un outil… » plus bas. |

#### Plausible (mesure d'audience sans cookie)

Plausible ne dépose aucun cookie et n'écrit rien dans le navigateur ; il **lit** seulement
`plausible_ignore` ([politique de données](https://plausible.io/data-policy)). Pour l'EDPB, faire envoyer
par un script l'adresse de la page, le site d'origine ou la taille de l'écran reste un « accès » au terminal
(lignes directrices 2/2023, § 33) : ce n'est donc pas « hors cookies » qui le dispense, c'est l'**exemption
de la CNIL pour la mesure d'audience** (lignes directrices du 17 septembre 2020, § 50–51) : statistiques
anonymes, pour le seul éditeur, pas de suivi d'un site à l'autre, pas de recoupement ni de transmission.
Plausible auto-hébergé sur votre serveur s'y prête (empreinte quotidienne à sel renouvelé toutes les 24 h,
adresse IP jamais gardée). La CNIL recommande en plus : informer (la page Cookies le fait), garder les
données 25 mois au plus (pensez-y si vous gardez les statistiques brutes plus longtemps) ; le thème offre
l'opposition (« Compter mes visites »). Le RGPD s'applique toujours : base légale = intérêt légitime, à dire
dans les mentions légales (c'est déjà le cas).

#### Le réglage « Consent notice »

Design & branding → Customize → *Site wide* → **Consent notice** :

- **Notice** (défaut) : chaque contenu intégré demande l'accord dans son encadré (« Accepter et afficher »,
  « Afficher seulement celui-ci ») ; aucune carte pour eux. Une petite carte en bas, dans le coin (en
  travers du bas sur téléphone), ne vient que sur une page où un script marqué `data-consent` attend une
  réponse, **après un peu de défilement (un quart d'écran) ou au bout de 12 secondes**.
- **Banner** : pareil pour les contenus intégrés ; pour les scripts `data-consent`, une barre en bas de la
  fenêtre, dès l'arrivée, sur ces mêmes pages seulement.
- **None** : jamais de carte. Les contenus intégrés gardent l'encadré d'avant, un clic par contenu (avec
  « Toujours afficher les contenus de YouTube ») ; tout script marqué `data-consent` reste éteint (un
  avertissement apparaît dans la console du navigateur).

La carte ne demande que pour les catégories des scripts présents sur la page (elle les nomme : « mesure
d'audience », « autres services ») et sa réponse ne vaut que pour elles : une catégorie jamais demandée
reste sans réponse, et la carte revient le jour où un script de cette catégorie apparaît. De même,
« Accepter et afficher » ne répond que pour les contenus intégrés.

Dans les deux modes : rien n'est bloquant (pas de fond grisé, pas de mur, la page reste utilisable) ;
le lien « Cookies et confidentialité » du texte ouvre le panneau, le × ferme **en refusant** (il le dit), Échap aussi ; la réponse est
gardée **6 mois** puis la question revient (`attibling-consent`, avec la version de la question : si le
thème change de catégories, il redemande) ; aucune case n'est pré-cochée ; le choix se retire aussi
simplement dans le panneau. Un navigateur qui envoie **Global Privacy Control** ou **Do Not Track** est
traité comme un refus : la carte ne s'affiche pas, les contenus restent masqués (un clic chacun, ou
« Accepter et afficher »), les scripts restent éteints. La carte se place juste après le lien d'évitement
(premier élément atteint au clavier), sans prendre le focus ; position fixe, donc aucun décalage de la page ;
un élément atteint au clavier défile toujours au-dessus d'elle, jamais dessous ; une fois la réponse donnée, le
focus revient où il était (ou sur le contenu principal). Le bouton « retour en haut » des articles remonte
au-dessus de la barre (*Banner*) sur ordinateur ; sur téléphone, il attend que la carte soit partie.

**Les deux boutons.** « Tout accepter » est plein, à l'encre de la page (noir sur fond clair, blanc sur fond
sombre, l'encre de la palette de lecture sur les articles) ; « Tout refuser » est un vrai bouton de la même
taille, sur la même ligne, dans la même police, avec un contour de 2 px de la même encre. **C'est votre
choix, pas une exigence** : la CNIL recommande des boutons « présentés au même niveau et sur le même format »,
« mis en évidence de manière identique » (recommandation 2020-092, § 32–34). Un bouton plein face à un bouton
au contour peut être lu comme une mise en avant de l'acceptation ; la variante la plus sûre est deux boutons
identiques (par exemple tous deux au contour, ou tous deux pleins) — une ligne de CSS (`.consent-refuse`)
dans `src/css/components/privacy.css`.

**« Ne pas l'afficher dès le début »** : avec *Notice*, la carte attend un peu de défilement pour ne pas
couvrir la page à l'arrivée. Un outil de mesure qui demande l'accord (Google Analytics…) ne
compte que si le lecteur accepte : avec *Notice*, les premières pages vues avant la réponse ne sont pas
comptées ; s'il doit compter dès la première page, prenez *Banner*.

#### Brancher un outil qui demande l'accord (Analytics, publicité, pixel…)

Dans Settings → Code injection → *Site header*, écrivez le script **inerte**, avec sa catégorie :

```html
<!-- Exemple : Google Analytics 4 ne se charge qu'après « Tout accepter » ou « Mesure d'audience » -->
<script type="text/plain" data-consent="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script type="text/plain" data-consent="analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

- `data-consent` : `analytics` (mesure d'audience), `embeds` (contenus intégrés), `other` (tout le reste :
  publicité, pixel d'un réseau social…). Une autre valeur compte comme `other`.
- `type="text/plain"` empêche le navigateur de l'exécuter ; le thème le recrée en vrai script, dans l'ordre de
  la page, dès que la catégorie est acceptée (même page, sans rechargement). Pour un module :
  `data-type="module"`. Pour du HTML (pixel `<img>`, `<iframe>`) : `<template data-consent="other">…</template>`.
- Laissez **Consent notice** sur *Notice* (ou *Banner*).
- **Allumez *Consent tools*** (Design & branding → Customize → *Site wide*), seulement le jour où vous
  ajoutez un tel outil. Sur les articles et les pages, la règle de sécurité des contenus intégrés
  (*Embed consent*) bloque les scripts d'autres sites ; *Consent tools* allumé (avec *Notice* ou *Banner*),
  elle laisse passer les services courants (Google Tag Manager, Google Analytics, AdSense / DoubleClick,
  Meta, Hotjar, Clarity, Plausible Cloud, Matomo Cloud, Fathom, Umami Cloud, Cloudflare Web Analytics,
  LinkedIn, TikTok : liste dans `partials/privacy/consent-hosts.hbs`). Éteint (le défaut), la règle reste
  celle de *None* : un de ces scripts collé **sans** `data-consent` reste bloqué sur les articles et les
  pages, ce qui évite qu'il parte avant l'accord. Allumé, seul le marquage `data-consent` le retient :
  marquez donc chaque script. Un autre service : ajoutez son adresse à cette liste dans le thème, ou
  désactivez *Embed consent*.

**Google Consent Mode v2 (fait par le thème).** Dès qu'une balise Google est sur la page (gtag.js, Tag
Manager, AdSense, marquée `data-consent` ou non), le thème pose avant elle l'état par défaut que demande la
[documentation de Google](https://developers.google.com/tag-platform/security/guides/consent) :
`gtag('consent', 'default', { ad_storage, ad_user_data, ad_personalization, analytics_storage,
personalization_storage: 'denied', functionality_storage, security_storage: 'granted', wait_for_update: 500 })`
et `gtag('set', 'ads_data_redaction', true)`, puis `gtag('consent', 'update', …)` à chaque réponse :
« Mesure d'audience » → `analytics_storage` ; « Autres services » (publicité) → `ad_storage`, `ad_user_data`,
`ad_personalization`, `personalization_storage`. Sans balise Google, rien de tout cela n'est émis.
- **Mode « basique » (celui du thème, recommandé)** : la balise est marquée `data-consent` (exemple
  ci-dessus) et ne se charge qu'après l'accord ; rien n'est envoyé à Google avant, ni du tout en cas de refus.
- **Mode « avancé »** : la balise est collée sans `data-consent` ; elle se charge à l'arrivée et envoie des
  « pings » sans cookie tant que l'accord manque. Pour l'EDPB, ces envois restent un accès au terminal
  (lignes directrices 2/2023, § 33) : en France, sans accord, c'est risqué ; et l'état par défaut doit alors
  être posé **avant** la balise, par vous, en tête de *Site header* (le script du thème arrive trop tard) :
  `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});</script>`.
- `url_passthrough` n'est pas activé (il ajoute des identifiants de clic aux adresses) : à vous de l'ajouter
  si vous en avez besoin.
- **Pas une CMP certifiée.** Cette carte n'est pas une plateforme de consentement certifiée par Google ni
  intégrée au cadre IAB TCF. Google exige une CMP certifiée intégrée au TCF pour servir des annonces
  personnalisées dans l'EEE et au Royaume-Uni depuis le 16 janvier 2024 (Suisse : 31 juillet 2024) —
  [aide AdSense](https://support.google.com/adsense/answer/13554116). Pour AdSense / Ad Manager, il faudrait
  donc une CMP certifiée (Didomi, Axeptio, Cookiebot, CookieYes…) **à la place** de cette carte (réglage
  *Consent notice* = None, la CMP gérant aussi les contenus intégrés) ; sans elle, seules des annonces
  limitées ou non personnalisées restent possibles.

Pour votre propre code, `window.attiblingConsent` :

```js
attiblingConsent.get("analytics");      // true (accepté), false (refusé), null (pas encore répondu)
attiblingConsent.onChange(choices => { /* { analytics, embeds, other } */ });
attiblingConsent.open();                // ouvre le panneau
attiblingConsent.set({ analytics: true, embeds: false, other: false });
// et l'évènement window « attibling:consent » (detail = les choix)
```

#### Comparaison avec les outils de bannière (novembre 2026)

| Fonction | Ici | Note |
|---|---|---|
| Choix par catégorie et par service | oui | catégories + un interrupteur par service de contenus intégrés |
| Accepter / refuser au même niveau | oui | même taille, même ligne ; plein / contour : votre choix (voir plus haut) |
| Redemander après 6 mois, ou si la question change | oui | version de la question dans la réponse |
| Retrait partout | oui | lien du pied de page, « Gérer mes choix » sous chaque contenu, page Cookies |
| Blocage des scripts (`type="text/plain"`, `<template>`) | oui | comme Klaro / Orejime ; pas de blocage automatique sans marquage |
| Encadré à la place des contenus bloqués | oui | avec « Accepter et afficher » |
| Google Consent Mode v2 | oui | mode basique ; avancé documenté |
| Global Privacy Control / Do Not Track | oui | traité comme un refus |
| Liste des traceurs | oui | rendue depuis le code du thème (pas d'analyse automatique du site) |
| 33 langues, accessibilité, aucun décalage | oui | |
| Preuve du consentement côté serveur, statistiques de consentement | non | demande un serveur ; la réponse et sa date restent dans le navigateur |
| IAB TCF, CMP certifiée Google | non | demande une certification : nécessaire pour AdSense dans l'EEE |
| Analyse automatique des cookies | non | demande un robot côté serveur ; sans objet ici (tout est déclaré) |

**Le jour où vous ajoutez Google Analytics ou un pixel Meta**, marquez chaque script `data-consent`
(Consent Mode v2 est alors géré), allumez *Consent tools*, passez à *Banner* si l'outil doit compter dès
la première page, et
complétez la page Cookies (qui, quoi, combien de temps). **Pour AdSense**, voir « Pas une CMP certifiée ».

#### Sources (lues le 20 novembre 2026)

- CNIL, lignes directrices « cookies et autres traceurs », délibération 2020-091 du 17 septembre 2020 :
  champ (local storage, empreinte… § 13), refus aussi simple que l'acceptation (§ 30–31), traceurs exemptés
  (§ 49), mesure d'audience (§ 50–52) —
  https://www.cnil.fr/sites/cnil/files/atoms/files/lignes_directrices_de_la_cnil_sur_les_cookies_et_autres_traceurs.pdf
- CNIL, recommandation, délibération 2020-092 : boutons « tout accepter / tout refuser » au même niveau et au
  même format (§ 27–34), conservation des choix 6 mois (§ 39), retrait (§ 40–45), informer même pour les
  traceurs exemptés (§ 49–50) —
  https://www.cnil.fr/sites/cnil/files/atoms/files/recommandation-cookies-et-autres-traceurs.pdf
- CNIL, « Cookies : solutions pour les outils de mesure d'audience » (4 juillet 2025) —
  https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience
- CNIL, recommandation sur les pixels de suivi dans les courriels (adoptée le 12 mars 2026, publiée le
  14 avril 2026) et sa FAQ (22 juillet 2026) — https://cnil.fr/fr/recommandation-pixel-suivi-courriels,
  https://cnil.fr/fr/faq-recommandation-pixels-courriers-electroniques
- EDPB, lignes directrices 2/2023 sur le champ technique de l'article 5(3) ePrivacy, version 2.0 du
  16 octobre 2024 (§ 33 JavaScript, § 44 traitement local, § 47–51 pixels et liens de suivi, § 54–55 IP) —
  https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en
- Plausible, politique de données (novembre 2026) et exclusion par `localStorage` —
  https://plausible.io/data-policy, https://plausible.io/docs/excluding-localstorage
- Ghost 6.78 (code) : cookie `ghost-members-ssr`, 184 jours ; `member-attribution.min.js` (`ghost-history`,
  15 pages, 24 h) ; Portal 2.72 (`ghost-portal-gift-form-state`, `ghost-recommendations-clicked`).

**Incertain** : l'avis de la CNIL sur un outil précis (sa liste de solutions évaluées a laissé place à un
outil d'auto-évaluation : c'est à l'éditeur de vérifier les conditions) ; la qualification du suivi de
progression de lecture (automatique, local, désactivable : traité comme partie du service abonné) ; les
deux clés d'animation de l'accueil (animation déjà jouée : `attibling-intro`, gardée jusqu'à l'effacement, et
`attibling-hero-cue`, le temps de la session), qui ne quittent jamais l'appareil (EDPB § 44) mais
ne sont pas strictement « demandées » ; la valeur juridique de Global Privacy Control en France (le thème
l'applique comme un refus, par prudence).

### Ce que le thème garde dans le navigateur

Voici **tout** ce que le site peut enregistrer dans le navigateur du lecteur (le thème et les scripts de
Ghost). Rien de cela n'est envoyé au site, sauf `ghost-history` à l'inscription. Le thème ne dépose **aucun
cookie**. C'est aussi la liste que la page « Cookies et confidentialité » affiche (rendue par le thème).

| Nom | Stockage | Déposé par | Pour qui | À quoi il sert | Durée | Accord préalable ? |
|---|---|---|---|---|---|---|
| `theme` | localStorage | thème | tous | Mode clair, sombre ou automatique choisi avec le bouton de l'en-tête | Jusqu'au prochain changement ou à l'effacement | non : personnalisation de l'interface choisie par le lecteur |
| `attibling-promo-closed` | localStorage | thème | visiteurs | Encart d'abonnement de l'accueil fermé pour de bon | Jusqu'à l'effacement | non : choix d'interface du lecteur |
| `attibling-intro` | localStorage | thème | tous | Animation d'arrivée de l'accueil déjà jouée lors de la première visite (pour ne plus la rejouer) | Jusqu'à l'effacement | non selon notre lecture (interface, ne quitte pas l'appareil) — incertain |
| `attibling-hero-cue` | sessionStorage | thème | tous | Petite ondulation des points du bandeau d'accueil déjà jouée dans cette session | Fin de la session | idem |
| `attibling-embeds` | localStorage | thème | tous | Services réglés un par un (YouTube, X…) : `{"youtube":true}` affiché sans clic, `false` gardé masqué même si « Contenus intégrés » est accepté | Jusqu'au retrait (sous le contenu ou dans le panneau) ou à l'effacement | non : conserve le choix du lecteur |
| `attibling-privacy` | localStorage | thème | abonnés | « Reprendre la lecture » désactivé (`{"progress":false}`) | Jusqu'au retrait ou à l'effacement | non : conserve le choix du lecteur |
| `attibling-consent` | localStorage | thème | tous | Réponses du lecteur, par catégorie (contenus intégrés, mesure d’audience, autres ; seulement celles qui lui ont été demandées), leur version et leur date | 6 mois, puis la question revient | non : conserve le choix du lecteur |
| `plausible_ignore` | localStorage | thème | tous | Le lecteur a désactivé « Compter mes visites » (`true`, lu par Plausible) | Jusqu'au retrait ou à l'effacement | non : conserve le choix du lecteur |
| `attibling-reading` | localStorage | thème | abonnés | Réglages d'affichage des articles | Jusqu'à « Réinitialiser » ou l'effacement | non : personnalisation choisie |
| `attibling-saved` | localStorage | thème | abonnés | Liste « À lire plus tard » (adresse, titre, image, tag, durée de lecture ; 100 au plus) | Jusqu'au retrait ou à l'effacement | non : service demandé (le lecteur enregistre) |
| `attibling-progress` | localStorage | thème | abonnés | « Reprendre la lecture » (6 articles au plus, position de lecture), noté automatiquement, désactivable | Jusqu'à la fin de la lecture, « Retirer » ou l'effacement | non selon notre lecture : fonction du compte abonné, locale, désactivable — incertain |
| `attibling-member` | localStorage | thème | abonnés | Empreinte de l'abonné à qui appartiennent les listes et réglages ci-dessus (jamais son identifiant) : un autre abonné, ou une déconnexion (Portal, session expirée), les efface | Jusqu'à la déconnexion ou à l'effacement | non : protège les listes du compte |
| `attibling-probe` | localStorage | thème | abonnés | Test : le stockage fonctionne-t-il ? Écrit puis effacé aussitôt | Aucune | non |
| `ghost-history` | sessionStorage | Ghost | tous | Pages vues pendant la visite et site d'origine, envoyés à Ghost à l'inscription (réglage « Member sources ») | Fin de la session | **oui**, ou désactiver *Member sources* |
| `ghost-portal-gift-form-state` | sessionStorage | Ghost | tous | Portal : état du formulaire d'abonnement cadeau, pendant qu'on le remplit (sites payants) | Fin de la session | non : service demandé |
| `ghost-recommendations-clicked` | localStorage | Ghost | tous | Portal : recommandations déjà ouvertes (si les recommandations sont activées) | Jusqu'à l'effacement | à vérifier si vous activez les recommandations |

Et du côté de Ghost : les cookies `ghost-members-ssr` et `ghost-members-ssr.sig` (connexion d'un abonné,
184 jours au plus, `HttpOnly`) : nécessaires à l'authentification demandée, sans accord. L'historique de
navigation de l'onglet garde aussi deux états du thème (le tirage de la mosaïque « Tags » pour le bouton
Retour, les filtres des archives dans l'adresse) : rien n'est écrit dans le stockage. Les services externes
contactés (polices, contenus intégrés…) sont dans le tableau suivant.

> Une seule source : `src/js/privacy/registry.js`. Le test `src/tests/document.test.js` échoue si le code
> utilise une clé qui n'y est pas déclarée (ou cesse d'en utiliser une), si ce tableau ou la liste de la page
> (`partials/privacy/stored.hbs`) ne la reprend pas dans le même ordre.

### Ce que le navigateur charge, et d'où (confidentialité)

Pour vos mentions légales (la section « services externes ») : ce que le navigateur d'un lecteur demande à
d'autres sites que le vôtre, et quand. Relevé sur un vrai Ghost 6 avec ce thème (journal réseau de Chromium),
en visiteur et en abonné.

| Quoi | Depuis | Quand | Qui le décide |
|---|---|---|---|
| Polices Onest, Literata, Pacifico | votre site (`/assets/fonts/`) | toujours | thème |
| Portal (abonnement, compte), recherche | `cdn.jsdelivr.net` | toujours | Ghost |
| Commentaires | `cdn.jsdelivr.net` | articles où ils sont ouverts, quand le lecteur s'en approche (ou suit un lien vers eux) | Ghost (le moment : thème) |
| Stripe, hCaptcha / Turnstile | `js.stripe.com`… | seulement si Portal en a besoin (paiement, anti-spam) | Ghost |
| Polices personnalisées (Brand → Typography) | `fonts.bunny.net` | si vous en avez choisi | Ghost |
| Police de lecture choisie par un abonné | `fonts.bunny.net` | seulement pour l'abonné qui en choisit une | thème |
| Vidéos YouTube | `youtube-nocookie.com`, puis `googlevideo.com`, `i.ytimg.com`, `google.com`, `gstatic.com`… | **après le clic** du lecteur (ou s'il a choisi « Toujours afficher ») | thème (réglage *Embed consent*) |
| Publications X, autres contenus intégrés | le service (`platform.twitter.com`, `twimg.com`…) | **après le clic** du lecteur (ou « Toujours afficher ») | thème (réglage *Embed consent*) |
| Images collées par adresse, images Unsplash | leur site (`images.unsplash.com`…) | quand elles s'affichent | vous (contenu) |
| Plausible (statistiques, GEEKLY) | `analytics.geekly.blog` (votre serveur) | toujours, sauf si le lecteur a désactivé « Compter mes visites » | vous (Code injection) |
| Ce que vous ajoutez dans Code injection (statistiques…) | ce que vous y mettez | toujours (ou après accord, si marqué `data-consent`) ; sur les articles et les pages, ce qu'un script charge ensuite depuis un autre site est bloqué (voir « Vidéos et contenus intégrés ») | vous |
| Liens de partage (X, Facebook, LinkedIn) | — | rien n'est chargé : ce sont de simples liens | thème |

Avec *Embed consent* désactivé, YouTube (`youtube.com`, avec ses cookies `YSC`, `VISITOR_INFO1_LIVE`…,
`doubleclick.net`, `google.com`) et X se chargent dès l'ouverture de l'article.

Aucun de ces services ne dépose de cookie ni n'écrit dans le navigateur au nom du site avant le clic d'un
lecteur ; ceux de la liste « toujours » reçoivent l'adresse IP du lecteur (une requête ordinaire) : c'est à
dire dans les mentions légales (c'est fait), pas à demander. Pour ne plus rien demander à jsDelivr, un Ghost
auto-hébergé peut servir Portal, la recherche et les commentaires lui-même (clés `portal.url`,
`sodoSearch.url`, `comments.url` du fichier `config.production.json`, à vérifier dans la documentation de
Ghost) ; les images Unsplash et les images collées par adresse peuvent être téléchargées puis importées dans
Ghost.

### Page 404

Rien à faire : textes « Page non trouvée », un grand bouton « Ouvrir la recherche » (la recherche de Ghost,
qui reçoit le focus à l'arrivée), « Aller à la page d'accueil » et les trois premiers liens de la
navigation principale, puis les 4 derniers articles.

Les **autres erreurs** (500, 503…) ont leur propre modèle (`error.hbs`), de même présentation que la 404 :
le code d'erreur donné par Ghost, « Une erreur est survenue », la recherche et les 4 derniers articles. Le message
technique de Ghost (en anglais) n'est pas affiché.

### Fichier routes.yaml

Aucun n'est nécessaire : toutes ces pages sont des pages Ghost avec un modèle. Laissez le `routes.yaml` par
défaut (Settings → Labs → Routes).

---

## 6. Articles

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

- En-tête : tag principal (pastille) et deuxième tag public, titre, auteur, date, temps de lecture ;
  pour un abonné, le bouton « À lire plus tard » (le même signet que sur les tuiles ; une fois l'article
  dans la liste, il indique « Dans À lire plus tard »). Sans image à la une,
  le titre s'affiche sur le fond de la page.
- Légende de l'image à la une : celle saisie dans Ghost sous l'image (« Add a caption »).
- Sommaire : construit automatiquement à partir des intertitres H2 et H3 ; il n'apparaît qu'à partir de deux
  intertitres. Rien à faire.
- Anneau de progression en bas à droite : il se remplit pendant la lecture ; un clic remonte en haut.
- En fin d'article : la ligne « Publié le · Mis à jour le » (voir plus bas), la ligne « Précédent /
  Suivant » de la série (toujours le dernier élément), les mots clés (tags publics) et le partage (X,
  Facebook, LinkedIn, e-mail).
- Commentaires : ceux de Ghost (Settings → **Membership** → **Commenting**), titre « Discussion entre
  abonnés ». Ils se chargent quand le lecteur arrive vers la fin de l'article (environ deux écrans avant),
  pas à l'ouverture : l'image d'en-tête s'affiche plus vite sur téléphone (0,4 à 0,7 s de moins dans nos
  mesures, et 240 Ko économisés pour qui ne descend pas jusque-là). Pendant le chargement, une ligne discrète « Chargement des
  commentaires… » occupe leur place. Les liens vers les commentaires se chargent tout de suite et tombent au
  bon endroit : « Voir le commentaire » des e-mails de notification de Ghost (`#ghost-comments-…`), le
  bouton « Commenter » de la newsletter (`#ghost-comments-root`), ou un lien que vous écrivez vous-même dans
  un article vers `#ghost-comments`. Sans JavaScript, les commentaires de Ghost ne peuvent pas fonctionner :
  une phrase le dit à leur place. Rien à régler.
- « Recommandé pour vous » : trois autres articles qui partagent un tag public avec celui-ci, du
  plus récent au plus ancien ; les tags internes (`#top`, `#serie-…`, `#mis-a-jour`…) ne comptent pas.

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
<aside class="fiche-test" data-type="VideoGame">
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
- Données structurées : le thème ajoute pour les moteurs de recherche une donnée « Review » (note,
  meilleure note, nom de l'œuvre, auteur, date, verdict), qui permet à Google d'afficher la note sous le
  lien de l'article. Il ne l'ajoute que si la fiche donne une note **et** le type de ce que vous testez,
  dans `data-type` sur la première ligne : Google n'affiche une note que pour certains types, et une
  fiche sans type (ou avec un type qu'il ne reconnaît pas, comme `CreativeWork`) ne lui apporte rien.
  Écrivez le type en anglais, tel quel :

  | Vous testez | `data-type` |
  |---|---|
  | Un jeu vidéo | `VideoGame` |
  | Un jeu de société, un jeu de rôle | `Game` |
  | Une série, un anime | `TVSeries` (une saison : `TVSeason` ; un épisode : `TVEpisode`) |
  | Un film | `Movie` |
  | Un livre, un tome de manga | `Book` (la série entière : `BookSeries`) |
  | Un logiciel, un outil, un service en ligne | `SoftwareApplication` (ou `WebApplication`, `MobileApplication`) |
  | Du matériel, un produit | `Product` |
  | Un album, un morceau | `MusicAlbum`, `MusicRecording` |
  | Un podcast | `PodcastSeries` (un épisode : `PodcastEpisode`) |
  | Un événement, un salon | `Event` |
  | Une formation | `Course` |

  Sont aussi acceptés : `CreativeWorkSeries`, `CreativeWorkSeason`, `Episode`, `MovieSeries`,
  `VideoGameSeries`, `PodcastSeason`, `Audiobook`, `MediaObject`, `AudioObject`, `VideoObject`,
  `MusicPlaylist`, `HowTo`, `Recipe`, `LocalBusiness` et `Organization`. Sans `data-type`, la fiche
  s'affiche de la même façon : seule la donnée pour les moteurs de recherche manque. Vous pouvez vérifier
  un article publié avec le [test des résultats enrichis](https://search.google.com/test/rich-results)
  de Google.
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
- **Tous ses articles** : la page de l'auteur — seulement si plusieurs auteurs ont publié (sur un site à un
  seul auteur, ni ce bouton ni le nom ne mènent à la page d'auteur : voir
  [Un seul auteur](#un-seul-auteur--pas-de-page-dauteur)).
Sans photo : une icône ; sans bio : la ligne disparaît.

### Réglages d'affichage (abonnés)

Un abonné connecté voit, sur les articles seulement, une roue crantée dans l'en-tête (à côté de la recherche
et du bouton clair / sombre). Elle ouvre « Réglages d'affichage » (un panneau sur ordinateur, une feuille
qui monte du bas sur téléphone) :

| Réglage | Choix (défaut en premier) |
|---|---|
| Palette | GEEKLY (nom du site), Désert, Encre, Forêt — chacun en clair et en sombre, selon le bouton clair / sombre |
| Police des titres | Onest, Space Grotesk, Libre Baskerville, Poppins, Lora, JetBrains Mono |
| Police du texte | Literata, Merriweather, IBM Plex Serif, Inter, Noto Sans, Fira Mono |
| Largeur de l'article | M, S, L (en Immersif : L pleine largeur, M 1 200 px, S 864 px) |
| Taille du texte | M (19 px), S (17 px), L (21 px) |
| Interligne | Normal, Serré, Aéré |
| Alignement | Justifié (aligné à gauche sur téléphone), À gauche, Centré, À droite — paragraphes seulement |
| Style des liens | Couleur (liens en couleur, soulignés seulement au survol et au clavier), Soulignés (couleur du texte, soulignés) |
| Image de couverture | Afficher, Masquer |
| Style de l'article | Carte / Immersif (le défaut est celui de l'article) |
| Résumé « En bref » | Afficher, Masquer |

« Réinitialiser » remet tout par défaut. Les choix sont gardés dans le navigateur de l'abonné (sur cet
appareil) et appliqués avant l'affichage de la page, sans clignotement. La palette choisie habille toute la page
de l'article, en-tête et pied de page compris. Les polices autres que celles par défaut ne sont téléchargées
que si l'abonné les choisit, depuis fonts.bunny.net (le même service que les polices personnalisées de
Ghost). Pour retirer la roue : réglage **Reading settings** (onglet **Post**). Les visiteurs ne la voient
jamais.

**Style des liens.** Par défaut, pour tout le monde (visiteurs compris), les liens du texte des articles et
des pages (« À propos », mentions légales…) sont **en couleur, sans soulignement** ; le soulignement apparaît
au survol et quand on y arrive au clavier. L'autre choix, « Soulignés » (comme Wikiwand), met les liens dans
la couleur du texte avec un trait dessous, plus épais au survol. Le choix d'un abonné vaut aussi pour les
pages. Rien à régler pour le site : la couleur est le défaut.

*Accessibilité, honnêtement* : un lien seulement coloré se distingue du texte par sa couleur, et l'écart de
luminosité entre la couleur des liens et celle du texte est sous le 3:1 que demandent certaines règles
(WCAG, technique G183) : GEEKLY 2,6:1 en clair et 1,3:1 en sombre, Désert 1,8 / 1,5, Encre 2,0 / 2,2, Forêt
2,3 / 1,3 (la couleur des liens reste lisible sur le fond : 4,5:1 au moins partout). C'est un choix de
présentation ; un lecteur qui distingue mal les couleurs choisit « Soulignés ». Les petits liens des zones
grises (pied de page, mentions sous un formulaire) sont eux aussi en couleur, jamais ni colorés ni soulignés.

Si vous avez choisi des polices personnalisées dans Ghost (Brand → Typography), elles remplacent Onest et
Literata par défaut ; la liste garde les noms « Onest » et « Literata » pour l'option par défaut.

### Article réservé aux abonnés

**Ghost** : dans l'article, panneau de réglages (icône en haut à droite) → **Post access** : *Members only*
(abonnés), *Paid-members only* (abonnés payants) ou *Specific tier(s)*. Pour laisser un début lisible par
tous, insérez la carte **Public preview** (`/public` dans l'éditeur) : ce qui est au-dessus reste public.

Le lecteur sans accès voit ce début, puis l'encart du thème « Cet article est réservé aux abonnés » (ou « aux
abonnés payants », « aux abonnés de ces offres : … ») avec « S'abonner » et « Déjà abonné ? Se connecter ».
Pour un article *Members only*, « S'abonner » mène à la page d'abonnement du thème (comme le bouton de
l'en-tête) ; pour un article payant, à la fenêtre Portal de Ghost, qui présente les offres. Un abonné gratuit
devant un article payant voit « Changer d'abonnement ». Les textes viennent du thème (traduits), les
couleurs du mode clair ou sombre : la couleur d'accent de Ghost n'y est pas utilisée.

### Copier un lien, copier du code

Rien à faire. Au survol (ou au clavier) d'un intertitre H2 ou H3, un bouton « lien » copie l'adresse de la
section (« Lien copié ») ; sur téléphone il est après le titre. Chaque bloc de code a un bouton « Copier »
(« Copié » pendant 2 s) et affiche sa langue si elle est choisie dans la carte Code de Ghost (`bash`,
`javascript`…).

### Impression d'un article

Rien à faire : la commande Imprimer du navigateur (ou « Enregistrer en PDF ») donne une version papier sobre.
Sont imprimés le titre, le tag, l'auteur et la date, le texte (en noir sur blanc, l'adresse de chaque lien
externe entre parenthèses), puis « Publié le · Mis à jour le ». Sont laissés de côté l'en-tête et le pied de
page du site, l'image de couverture, le sommaire, les boutons (signet, partage, copier, « Revenir en haut »),
la liste des parties d'une série et sa ligne « Précédent / Suivant », la boîte auteur, les commentaires et
« Recommandé pour vous ». Une vidéo ou un contenu intégré, qui ne peut pas s'imprimer, est remplacé par une
ligne qui dit ce que c'était et où le voir (« Contenu de YouTube — titre (https://www.youtube.com/watch?v=…) »).
Les réglages d'affichage de l'abonné (palette, police, largeur) ne s'appliquent pas au papier.

### Vidéos et contenus intégrés (YouTube, X…)

**Pour vous, rien ne change** : collez l'adresse d'une vidéo YouTube, d'une publication X, d'un morceau
Spotify… dans l'éditeur (ou tapez `/youtube`, `/twitter`, `/embed`), comme d'habitude. Ghost enregistre le
lecteur dans l'article ; le thème s'occupe du reste.

**Ce que voit le lecteur.** Tant qu'il n'a pas accepté, **rien n'est chargé depuis YouTube, X ou un autre
service** : à la place du lecteur, un encadré aux couleurs du site, à la taille de la vidéo (16:9 en général),
avec le nom du service (« YouTube »), le titre de la vidéo quand Ghost l'a enregistré, un lien **« Voir sur
YouTube »** (nouvel onglet) et **« Gérer mes choix »** (le panneau « Cookies et confidentialité »).

Avec le réglage *Consent notice* sur **Notice** (défaut) ou **Banner** :

- l'encadré est **la seule demande** pour les contenus intégrés : aucune carte ni bandeau ne s'affiche pour
  eux. Une phrase dit ce que l'afficher envoie et ce que fait l'acceptation : « Ce contenu vient de YouTube :
  l'afficher envoie votre adresse IP à YouTube, qui peut déposer des cookies ou d'autres traceurs.
  « Accepter et afficher » affiche désormais tous les contenus intégrés du site sans clic. » ;
- **« Accepter et afficher »** (bouton plein) : accepte les contenus intégrés, pour tous les services, sur
  tout le site (et rien d'autre : ni mesure d'audience ni publicité) — et lance celui-ci ; les autres
  contenus de la page s'affichent aussitôt (annoncé aux lecteurs d'écran) ;
- **« Afficher seulement celui-ci »** (bouton au contour) : charge ce contenu seulement, rien n'est gardé.

Pourquoi « tous les services » pour le bouton principal : c'est ce qui évite au lecteur de cliquer sur chaque
vidéo et publication ; le choix reste précis, puisque le panneau a un interrupteur par service (un service
éteint reste éteint) et que « Afficher seulement celui-ci » ne garde rien. Limite : l'accord couvre aussi des
services que le lecteur n'a pas encore vus sur le site ; la phrase de l'encadré le dit (« tous les contenus
intégrés du site »).

Avec *Consent notice* sur **None** : l'encadré d'avant, un clic par contenu — un bouton **« Afficher la vidéo
YouTube »** (« Afficher la publication X »…), la phrase « L'afficher charge ce contenu depuis YouTube, qui
reçoit alors votre adresse IP et peut déposer des cookies ou d'autres traceurs. » et une case **« Toujours
afficher les contenus de YouTube »** (jamais cochée d'avance), gardée dans le navigateur (`attibling-embeds`),
avec sous chaque contenu ainsi affiché « Ne plus afficher automatiquement… ».

Dans tous les cas : rien n'est demandé au service avant l'accord, l'accord se retire aussi simplement qu'il se
donne (panneau, « Ne plus afficher automatiquement… » sous chaque contenu affiché sans clic).

Pour une publication X (ou Instagram, Threads…), le texte de la publication, que Ghost garde dans l'article,
reste lisible dans l'encadré, avec le bouton dessous. Pas de miniature YouTube : l'image vient elle aussi des
serveurs de Google (`i.ytimg.com`), donc elle n'apparaît qu'après le clic.

**Après le clic**, le lecteur se charge à la place de l'encadré et le focus clavier va dedans. YouTube est
chargé en « mode confidentialité renforcée » (`youtube-nocookie.com`) et démarre tout seul. Lors de nos essais,
ce mode n'a déposé aucun cookie (le lecteur `youtube.com` d'origine en dépose quatre dès l'ouverture de
l'article : `YSC`, `VISITOR_INFO1_LIVE`, `__Secure-YNID`, `__Secure-ROLLOUT_TOKEN`). Google indique toutefois
que ce mode peut garder des informations une fois la vidéo lancée. Surtout, **YouTube reste contacté** : le lecteur
vient des serveurs de Google (youtube-nocookie.com, googlevideo.com, i.ytimg.com, www.google.com,
gstatic.com…), qui reçoivent l'adresse IP du lecteur, et il garde des informations dans le stockage du
navigateur (localStorage, IndexedDB) au nom de youtube-nocookie.com. Une publication X est affichée par le cadre
de X lui-même (`platform.twitter.com`, sans personnalisation, dans le mode clair ou sombre de la page), sans
le script `widgets.js` ; les autres cadres (Vimeo, Spotify…) se chargent tels que Ghost les a enregistrés
(Vimeo avec `dnt=1`). Tous peuvent déposer leurs cookies (X : `__cf_bm`, constaté en local).

**Comment c'est fait (et pourquoi c'est sûr).** Sur les articles et les pages, le thème ajoute dans l'en-tête de
la page une règle de sécurité du navigateur (*Content-Security-Policy*) qui interdit les cadres et les scripts
venant d'autres sites. Le navigateur refuse donc de contacter YouTube ou X, avant même que la page ait fini de
s'afficher, **même si JavaScript est désactivé**. Le script du thème remplace ensuite chaque contenu bloqué par
l'encadré ; le clic charge le lecteur dans une petite page du site (`assets/html/embed.html`) qui n'a pas
cette règle. Un lecteur (YouTube, Vimeo, X…) y est un cadre du site du service, qui ne peut rien lire du
blog. Un contenu qui a besoin du script de son service (Instagram, TikTok…) y tourne dans un « bac à
sable » (`sandbox`) : le navigateur le traite comme un site à part, son script ne peut lire ni la page, ni
les listes du lecteur, ni son compte abonné, ni changer ses choix de confidentialité. Sans JavaScript, l'encadré est remplacé par une phrase (« Ce contenu externe ne se charge qu'à
votre demande : activez JavaScript pour l'afficher. ») ; la publication X garde son texte et son lien.

La règle laisse passer ce dont Ghost a besoin : ses propres scripts (Portal, la recherche, les commentaires,
depuis `cdn.jsdelivr.net`), Stripe, hCaptcha et Cloudflare Turnstile (que Portal peut charger), et tout ce qui
vient du site lui-même. Les cartes vidéo, audio, galeries, signets et formulaires d'inscription de Ghost ne sont
pas concernés (vérifié sur un vrai Ghost 6).

**Le réglage.** Design & branding → Customize → onglet *Post* → **Embed consent** (activé par défaut).
Désactivé : pas de règle de sécurité ni d'encadré, les contenus se chargent avec la page comme Ghost les écrit
(pour un site qui n'a pas besoin du consentement préalable, hors Union européenne par exemple).

**À savoir.**

- Un **script externe** ajouté dans Settings → Code injection → *Site footer*, ou dans le *Code injection* →
  *Post footer* d'un article, est bloqué lui aussi sur les articles et les pages (il est placé après la règle ;
  avec *Consent tools* allumé, les services de mesure et de publicité courants passent, voir « Brancher un outil »).
  Dans *Site header* / *Post header*, placés avant la règle, un script externe se charge, **mais tout script
  qu'il ajoute ensuite depuis un autre site est bloqué** (Google Tag Manager, régies publicitaires, widgets
  de commentaires tiers chargent ainsi la suite de leur code), sauf les services que *Consent tools* laisse
  passer. Plausible et les statistiques de Ghost ne sont pas concernés. En cas de doute, ouvrez la console du
  navigateur sur un article (message « violates the following Content Security Policy directive »), ou
  désactivez *Embed consent*. Sur GEEKLY, le footer d'injection est vide et Plausible ne charge pas d'autre
  script : rien à faire.
- Un cadre de **votre propre site** (même adresse) n'est pas bloqué.
- La règle interdit aussi les balises `<object>` et `<embed>` (anciens greffons, PDF intégré par `<embed>`) et
  une balise `<base>` qui pointerait vers un autre site. Aucune carte de Ghost ne s'en sert ; pour un PDF,
  utilisez la carte *File* ou un lien.
- Les **images** collées par adresse dans un article (hébergées ailleurs) et les images choisies dans la
  bibliothèque **Unsplash** de Ghost sont chargées depuis leur site d'origine : la règle ne concerne que les
  cadres et les scripts.
- Les pages d'auteur et de tag n'ont pas cette règle (elles n'affichent pas le contenu des articles).
- Seul Chrome / Chromium a pu être testé ici ; Firefox et Safari appliquent la même règle (norme CSP), mais
  sans vérification sur ce thème.

---

## 7. Animations, transitions et préchargement

Trois effets de confort, tous facultatifs : ils ne retardent ni le contenu ni la navigation, se coupent quand
l'appareil demande de **réduire les animations** (réglage d'accessibilité du système), et disparaissent sans
rien casser dans un navigateur qui ne les connaît pas.

### L'animation d'arrivée de l'accueil

La première fois qu'un lecteur arrive sur le site par l'accueil, le logo du bandeau s'installe : les lettres
**G E E K** montent à leur place l'une après l'autre, « ly » les rejoint comme une signature, et l'ensemble se
pose en rapetissant très légèrement (moins d'une seconde en tout). Il n'y a pas d'écran par-dessus la page :
l'image à la une, les titres et le menu sont affichés et utilisables dès la première image, seul le logo bouge.
L'animation ne coûte presque rien au navigateur (elle ne fait que déplacer et faire apparaître des lettres déjà
dessinées) : elle ne retarde ni l'affichage de l'image du bandeau ni la lecture.

- **Réglage** : **Arrival animation** (onglet *Homepage*), activé par défaut. Désactivé : jamais d'animation.
- **Avec le logo GEEKLY coloré** (réglage *Use geekly logo*) : l'animation lettre par lettre. **Avec un logo image
  ou le titre du site** : un simple fondu (le logo du bandeau apparaît en grandissant légèrement).
- **Quand** : une seule fois par navigateur, à la première arrivée sur la page 1 de l'accueil — jamais sur un
  article, une page de tag, la page 2…, ni quand on revient à l'accueil depuis une autre page du site. Le
  navigateur s'en souvient (`attibling-intro`, voir [ce que le thème garde dans le
  navigateur](#ce-que-le-thème-garde-dans-le-navigateur)) : elle ne revient qu'après « Tout effacer » sur la page
  « Cookies et confidentialité », un effacement des données du site, ou dans une fenêtre privée. Si le navigateur
  bloque le stockage local, elle ne se joue pas du tout (plutôt qu'à chaque page).
- **Passer** : un clic, une touche, la molette, un toucher ou le défilement l'arrêtent aussitôt.
- **Jamais** avec « réduire les animations ». Les moteurs de recherche et les lecteurs d'écran ne la voient pas :
  le logo du bandeau reste le titre de la page, à sa place. Si quelque chose échoue, la page s'affiche
  normalement.

### Transitions entre les pages

Dans les navigateurs qui savent animer le passage d'une page à l'autre (Chrome et Edge récents, Safari 18.2 et
plus ; pas Firefox pour l'instant) :

- l'image de la tuile sur laquelle on clique glisse et s'agrandit jusqu'à l'image d'en-tête de l'article ;
- une tuile de tag devient l'en-tête de la page du tag ;
- le grand logo de l'accueil (ou le logo de l'en-tête) rejoint le logo de l'en-tête de la page suivante ;
- l'en-tête reste en place ; tout le reste passe en fondu court.

**Réglage** : **Page transitions** (onglet *Site wide*), activé par défaut. Rien d'autre à faire. Sans image à
la une, ou depuis une carte qui montre une [image de partage](#vignette-dun-article-image-des-cartes) (une autre
image que l'en-tête), l'article apparaît en fondu. Ailleurs (navigateur non compatible, « réduire les animations ») : la
navigation est normale.

### Préchargement au survol

Quand le pointeur s'attarde sur un lien du site, qu'un doigt le touche ou que le clavier le sélectionne, le
navigateur télécharge déjà la page : le clic l'affiche presque sans attente. Rien à voir, rien à régler.

- Seulement les liens du site vers des pages ordinaires. Jamais : Ghost Admin (`/ghost/`), les liens des
  abonnés (`/members/`, connexion, déconnexion, désinscription), les fenêtres de Ghost (`#/portal/…`), les
  liens avec `?` ou `#`, les fichiers et images (`/content/…`), les flux RSS, les liens qui s'ouvrent ailleurs
  (`target`) ou `rel="nofollow"`.
- Coupé en mode **économie de données** (Save-Data) et sur connexion lente (2G).
- Pour exclure un lien précis dans un article, ajoutez-lui l'attribut `data-no-prefetch` dans une carte HTML :
  `<a href="/une-page/" data-no-prefetch>…</a>` (fonctionne aussi sur un bloc qui contient des liens).

---

## 8. Référence : les réglages du thème

Ghost Admin → Settings → Design & branding → **Customize** (18 réglages ; le nom affiché par Ghost vient de la clé).

| Réglage (Ghost Admin) | Onglet | Par défaut | Effet | Section |
|---|---|---|---|---|
| Dark mode logo | Site wide | vide | Logo clair pour le mode sombre et le bandeau d'accueil (avec un logo image) | [2](#2-identité-et-en-tête) |
| Page transitions | Site wide | oui | Transitions animées entre les pages (navigateurs compatibles) | [7](#transitions-entre-les-pages) |
| Subscribe url | Site wide | vide (la page `newsletter`, `abonnement` ou `subscribe`, sinon Portal) | Destination forcée des boutons « S'abonner » / « Se connecter », par exemple `/newsletter/` | [2](#bouton--sabonner--et--se-connecter-) |
| Consent notice | Site wide | Notice | *Notice* / *Banner* : chaque contenu intégré demande l'accord dans son encadré (« Accepter et afficher » vaut pour tous) ; pour les scripts marqués `data-consent`, et seulement sur les pages qui en ont, une petite carte après un peu de défilement (*Notice*) ou une barre dès l'arrivée (*Banner*). *None* : ni carte ni accord, un clic par contenu, scripts `data-consent` éteints | [5](#le-réglage--consent-notice-) |
| Consent tools | Site wide | non | Laisse passer sur les articles et les pages, après accord, les outils de mesure et de publicité courants marqués `data-consent` (Google, Meta, Hotjar…). À allumer seulement le jour où vous en ajoutez un ; éteint, la règle de sécurité est celle de *None* | [5](#brancher-un-outil-qui-demande-laccord-analytics-publicité-pixel) |
| About tags | Site wide | vide (6 tags les plus utilisés) | Tags de la page « À propos » : slugs séparés par des virgules | [5](#à-propos) |
| Use geekly logo | Homepage | non | Logo GEEKLY coloré (en-tête, bandeau, menu, pied de page) | [2](#logo-geekly-coloré-logo-image-ou-titre) |
| Arrival animation | Homepage | oui | Animation d'arrivée de l'accueil, à la première visite seulement | [7](#lanimation-darrivée-de-laccueil) |
| Home row 1 à Home row 5 | Homepage | vide (tags les plus utilisés) | Tag (slug) de chaque rangée de l'accueil ; `none` la masque | [3](#les-rangées-par-tag) |
| Article style | Post | Card | Style des articles : Card (« Carte ») ou Immersive (« Immersif ») | [6](#les-deux-styles---carte--et--immersif-) |
| Reading settings | Post | oui | Les abonnés ont la roue « Réglages d'affichage » sur les articles | [6](#réglages-daffichage-abonnés) |
| Summary for visitors | Post | non | « En bref » visible aussi par les visiteurs | [6](#-en-bref---le-résumé-en-points-numérotés) |
| Embed consent | Post | oui | Vidéos YouTube, publications X et autres contenus intégrés chargés seulement au clic du lecteur (rien n'est demandé au service avant) | [6](#vidéos-et-contenus-intégrés-youtube-x) |
| About page | Post | vide (`a-propos` ou `about`) | Page liée par « À propos » dans la boîte auteur | [6](#boîte-auteur) |

Réglage du fichier `package.json` (pas dans Ghost Admin) : 7 articles par page (`posts_per_page`), le nombre
d'articles de « Derniers articles ».

> Mise à jour depuis la version 1.x : l'ancien réglage *Disable fade animation* n'existe plus (les anciennes
> animations d'apparition ont disparu avec l'ancien design) ; il est remplacé par **Arrival animation** et
> **Page transitions**.

---

## 9. Référence : les conventions

**Tags internes** (nom commençant par `#`, invisibles sur le site ; [comment en ajouter](#les-tags-internes)) :

| Tag | Où | Effet |
|---|---|---|
| `#top` | article | Entre dans « Les plus lus » (accueil) |
| `#top-1` … `#top-10` | article (avec `#top`) | Rang dans « Les plus lus » (`#top-1` = premier) |
| `#serie-<nom>` | toutes les parties | Forme une série (encadré, Précédent / Suivant) ; `total: N` dans la description du tag |
| `#mis-a-jour` | article | Affiche « Mis à jour le … » |
| `#immersif` / `#carte` | article | Force le style Immersif / Carte |

**Cartes HTML** (éditeur : `/html`) :

| Carte | Modèle | Section |
|---|---|---|
| « En bref » (auteur) | `<ol class="en-bref"><li>…</li></ol>` en tête d'article | [6](#-en-bref---le-résumé-en-points-numérotés) |
| « En bref » (IA, facultatif) | `<ol class="en-bref" data-source="ia">…</ol>` | [6](#résumé-par-ia-facultatif) |
| Fiche de test | `<aside class="fiche-test">…</aside>` (classes `fiche-test__type`, `__titre`, `__note`, `__infos`, `__plus`, `__moins`, `__verdict` ; `data-type="VideoGame"`… : le type testé, nécessaire pour la note dans Google) | [6](#fiche-de-test) |
| Liens « Suivre le blog » | `<ul class="about-links"><li><a href="…">…</a></li></ul>` dans la page À propos | [5](#à-propos) |
| Lien jamais préchargé | `<a href="…" data-no-prefetch>` | [7](#préchargement-au-survol) |

**Pages** (slug par défaut → modèle automatique, ou menu *Template*) : `newsletter`, `abonnement` ou `subscribe` (Subscribe), `archives`
(Archives ; `/archives/?tag=<slug>` filtre sur un tag, internes compris), `favoris` (Saved Posts), `a-propos`
(About), `tags` (Tags), `authors` (Authors), `mentions-legales` (Document : sommaire, date de mise à jour,
impression). Voir [section 5](#créer-une-page-et-lui-donner-son-modèle).

**Ghost** : *Facebook card* (ou *X card*) → image (vignette des cartes, [section 3](#vignette-dun-article-image-des-cartes)),
*Feature this post* (bandeau de l'accueil, article en tête d'un tag), *Excerpt* (extraits,
accroches des pages), *Tag image* et *Description* (tags, À propos, bannière de l'accueil), *Site
description* (phrase du bandeau), Settings → Staff (boîte auteur, pages d'auteur), Settings → Navigation
(en-tête, menu « Plus », pied de page).

**Réservé aux abonnés connectés** : signets et page « À lire plus tard », « Reprendre la lecture »,
réglages d'affichage, « En bref » (sauf réglage *Summary for visitors*). Leurs données restent dans le
navigateur du lecteur.

---

## 10. Dépannage

| Symptôme | Cause et solution |
|---|---|
| La page « Archives » (ou « À lire plus tard », « À propos », abonnement) a l'air d'une page ordinaire | Son slug n'est pas le slug par défaut : corrigez **Page URL**, ou choisissez le modèle dans **Template**. |
| « Voir toute la série », « Tout voir » ou « Voir ma liste » mènent à une 404 | La page `archives` ou `favoris` n'existe pas, ou a un autre slug : créez-la avec ce slug ou ajoutez une redirection. |
| Les boutons « S'abonner » ou « Se connecter » ouvrent une fenêtre au lieu de la page | Le site n'a pas de page **publiée** de slug `newsletter`, `abonnement` ou `subscribe`, et le réglage **Subscribe url** est vide : créez la page ou remplissez le réglage. |
| La fenêtre « Compte » de Ghost a d'autres couleurs que le site | Portal ne prend que la couleur d'accent : Settings → Design & branding → Accent color (voir [Ce qui passe encore par Portal](#ce-qui-passe-encore-par-portal)). |
| Pas de formulaire sur la page d'abonnement | Inscription fermée ou sur invitation (Settings → Membership), ou vous êtes connecté (vue abonné). |
| Le formulaire affiche une erreur à chaque essai | Ghost n'arrive pas à envoyer l'e-mail : vérifiez la configuration e-mail du serveur (Mailgun / SMTP). |
| Un tag n'a pas de phrase sur « À propos » ou en tête de sa page | Le tag n'a pas de **Description**. |
| Un tag manque sur « À propos » | Slug mal tapé dans **About tags** (vérifiez dans Tags), ou tag sans article. |
| Une icône de tag est un `#` | Aucun mot connu dans le slug : voir la liste plus haut. |
| La bio ne s'enregistre pas | Ghost limite la bio à 250 caractères. |
| La page « À lire plus tard » dit que le navigateur bloque la liste | Navigation privée ou données du site bloquées : rien à faire côté site. |
| L'article « À la une » d'un tag n'est pas le bon | C'est le plus récent des articles du tag marqués **Feature this post** ; retirez la marque des autres. |
| L'encadré de série n'apparaît pas | Le tag doit être interne (nom commençant par `#`) et commencer par `#serie-` ; il faut au moins deux parties **publiées** portant exactement le même tag. |
| « Partie 3 sur 3 » alors que la série en compte plus | Ajoutez `total: N` dans la description du tag. |
| « Voir toute la série » mène à une page 404 | Créez la page Archives (slug `archives`, voir [Archives](#archives)). |
| « En bref » ne s'affiche pas | La carte doit être une carte **HTML** (pas un paragraphe) et la liste doit avoir la classe `en-bref` ; un visiteur voit l'encart à la place ; l'abonné l'a peut-être masqué dans ses réglages (« Réinitialiser »). |
| La fiche de test n'a pas de style | Vérifiez la classe `fiche-test` et que c'est une carte HTML. |
| La note d'un test n'apparaît pas dans Google | La fiche doit donner une note (`8,5/10`) et un type reconnu dans `data-type` ([fiche de test](#fiche-de-test)). Google reste libre de ne pas l'afficher. |
| « Mis à jour le » n'apparaît pas | Il manque le tag interne `#mis-a-jour`. |
| Pas de bouton « À propos » dans la boîte auteur | Aucune page `a-propos` / `about`, ou le réglage About page ne correspond à aucune page publiée. |
| Pas de « Tous ses articles », le nom de l'auteur n'est pas un lien | Normal sur un site où un seul auteur a publié ([Un seul auteur](#un-seul-auteur--pas-de-page-dauteur)) ; les liens reviennent dès qu'un deuxième auteur publie. |
| « Rédacteur » reste dans le menu | C'est un lien de votre navigation : Settings → Navigation, supprimez-le. |
| Le logo montre « Geek » en couleurs et un « ly » blanc, ou le logo GEEKLY dessiné a disparu après avoir téléversé le thème | Le réglage **Use geekly logo** est revenu à « désactivé » (Ghost garde les réglages par nom de thème) et c'est le logo image qui s'affiche ; le thème fonce de lui-même les traits blancs d'un tel logo sur fond clair. Réactivez **Use geekly logo** (Customize → *Homepage*). Voir [Logo](#logo-geekly-coloré-logo-image-ou-titre). |
| Pas d'icône Bluesky (ou Threads, Mastodon…) dans le pied de page et « Suivre le blog » | Le compte n'est pas rempli : Settings → General → **Social accounts**, puis **Save**. |
| Pas de roue crantée | Réservée aux abonnés connectés, sur les articles, réglage Reading settings activé ; elle reste cachée si le navigateur bloque le stockage local (navigation privée stricte). |
| Le style Immersif ne s'applique pas | Un abonné qui a choisi « Carte » dans ses réglages garde son choix sur tous les articles. |
| L'animation d'arrivée ne se joue pas | Elle ne se joue qu'une seule fois par navigateur, à la première arrivée sur le site (pour la revoir : fenêtre privée, ou « Tout effacer » sur la page « Cookies et confidentialité »), seulement sur la page 1 de l'accueil et pas en y revenant depuis une autre page du site, jamais avec « réduire les animations » (réglage de l'appareil). Vérifiez **Arrival animation** (onglet *Homepage*). |
| Au lieu des lettres qui arrivent une à une, le logo apparaît en fondu | Le réglage **Use geekly logo** est désactivé : avec un logo image ou le titre du site, l'animation est un simple fondu. |
| Pas de transition entre les pages | Navigateur sans « View Transitions » entre pages (aujourd'hui Chrome, Edge et Safari récents ; pas Firefox), « réduire les animations » activé, ou réglage **Page transitions** désactivé. La navigation reste normale. |
| Les mentions légales n'ont pas de sommaire | Il faut au moins deux intertitres **Heading 2 / Heading 3** (pas du texte en gras), et le modèle Document (slug `mentions-legales` ou Template → Document). Les intertitres placés dans une carte HTML comptent aussi ; pas ceux des cartes Ghost (toggle, header…). |
| « Dernière mise à jour » change après une simple correction | C'est la date du dernier enregistrement de la page dans Ghost : voulu pour une page de référence. |
| Une vidéo YouTube s'affiche comme un encadré avec un bouton | Voulu : elle ne se charge qu'au clic du lecteur (réglage **Embed consent**, voir [Vidéos et contenus intégrés](#vidéos-et-contenus-intégrés-youtube-x)). |
| Un script ajouté dans l'injection de code ne marche pas sur les articles | Il est dans *Site footer* ou *Post footer* et vient d'un autre site : la règle qui bloque YouTube et X le bloque aussi. Déplacez-le dans *Site header* / *Post header* ; s'il charge lui-même d'autres scripts depuis un autre site (Google Tag Manager, régie…), ceux-là restent bloqués : désactivez alors **Embed consent**. La console du navigateur le dit (« violates the following Content Security Policy directive »). |
| Une vidéo démarre sans clic | Le lecteur a coché « Toujours afficher les contenus de YouTube » : le lien « Ne plus afficher automatiquement… » sous la vidéo annule ce choix. |
| Une carte affiche un aplat de couleur (ou une autre image que celle voulue) | La carte montre l'image à la une parce que l'article n'a pas d'image de partage : ajoutez-en une (réglages de l’article → **Facebook card** → téléverser l’image, voir [Vignette d'un article](#vignette-dun-article-image-des-cartes)). Si l'image de partage est déjà là et qu'une liste « À lire plus tard » montre l'ancienne, gardez l'article de nouveau. |
| Le préchargement ne se voit pas | C'est normal : il n'y a rien à voir, la page suivante s'ouvre juste plus vite. Il est coupé en mode « économie de données » et sur connexion 2G. |
