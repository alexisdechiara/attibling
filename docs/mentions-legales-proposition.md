# Mentions légales de GEEKLY — proposition de texte

> **Brouillon du 19 novembre 2026, à relire. Ce n'est pas un conseil juridique.**
> Ce texte réécrit la page actuelle https://geekly.blog/mentions-legales/ en français clair, à partir de ce
> qu'elle dit déjà et de ce que le site fait réellement (vérifié sur le thème, sur une copie locale de Ghost et
> sur le site en ligne). Il ne remplace pas l'avis d'un juriste.
>
> - Les réponses aux questions de la version précédente ont été prises **sur le site lui-même** : la page
>   actuelle des mentions légales et la page « À propos » (éditeur, adresse, hébergeur), les réglages publics de
>   Ghost (`/members/api/site/`, `/ghost/api/content/settings/`), les en-têtes HTTP et les enregistrements DNS
>   publics de `geekly.blog` et `analytics.geekly.blog`. Là où le site ne dit rien (service d'envoi des
>   e-mails, durées, statut), le texte emploie une formulation vraie pour tout site Ghost, sans crochet à
>   remplir. Les quelques points que seul l'éditeur peut confirmer sont listés à la fin, avec la formulation
>   retenue par défaut.
> - **Préalable** : ce texte dit que le site ne charge plus de polices chez Google. C'est vrai pour le thème ;
>   il faut aussi retirer les trois lignes de polices Google de Settings → Code injection → *Site header*
>   (détail dans `docs/guide-auteur.md`, « Polices du thème et polices personnalisées »).
> - Comment coller ce texte dans Ghost et quel modèle choisir : `docs/guide-auteur.md`, section
>   « Mentions légales et pages de référence ».
> - La date « Dernière mise à jour » s'affiche toute seule en haut de la page : ne l'écrivez pas dans le texte.
> - La liste « Ce que le site garde dans votre navigateur » suit le code du thème : si le thème ajoute une clé
>   de stockage, le test `src/tests/document.test.js` échoue tant que le tableau du guide n'est pas mis à
>   jour ; reportez alors la même ligne ici.

Extrait de la page (réglages de la page → **Excerpt**), proposé :

> Qui publie GEEKLY, qui l'héberge, ce que le site fait de vos données et comment me joindre.

---

<!-- Texte à coller : tout ce qui suit cette ligne, dans une carte Markdown (/markdown) de la page. -->

GEEKLY est une publication indépendante consacrée à la culture geek, à la tech et à la pop culture, lancée en janvier 2023 et écrite par une seule personne. Cette page dit qui la publie, qui l'héberge, ce que le site fait de vos données et comment me contacter.

## L'essentiel

- Le site n'affiche pas de publicité et ne vend aucune donnée.
- Si vous vous abonnez, je garde votre adresse e-mail et, si vous l'indiquez, votre nom. Rien d'autre ne vous est demandé.
- Le site ne dépose aucun cookie publicitaire ni de mesure d'audience. Son seul cookie sert à rester connecté quand vous êtes abonné.
- Les polices de caractères sont servies par le site lui-même. Les vidéos YouTube, les publications X et les autres contenus intégrés aux articles ne se chargent que si vous cliquez pour les afficher.
- Vos préférences d'affichage et vos listes de lecture restent dans votre navigateur : elles ne sont pas envoyées au site.
- Pour toute question ou demande : [pro@alexisdechiara.fr](mailto:pro@alexisdechiara.fr).

## Éditeur du site

<dl>
<dt>Site</dt>
<dd>GEEKLY — <a href="https://geekly.blog/">https://geekly.blog</a></dd>
<dt>Éditeur et directeur de la publication</dt>
<dd>Alexis De Chiara</dd>
<dt>Adresse</dt>
<dd>50 boulevard Stalingrad, 06300 Nice, France</dd>
<dt>Contact</dt>
<dd><a href="mailto:pro@alexisdechiara.fr">pro@alexisdechiara.fr</a></dd>
</dl>

## Hébergement

<dl>
<dt>Hébergeur</dt>
<dd>Hostinger</dd>
<dt>Adresse</dt>
<dd>Švitrigailos g. 34, 03230 Vilnius, Lituanie</dd>
<dt>Téléphone</dt>
<dd>+370 645 03378</dd>
</dl>

Le site fonctionne avec [Ghost](https://ghost.org/), un logiciel libre de publication, installé sur un serveur loué chez Hostinger, dans l'Union européenne. Les statistiques de fréquentation (voir plus bas) sont sur ce même serveur.

## Propriété intellectuelle

Les textes, les images originales et le logo GEEKLY sont la propriété de l'éditeur. Les reproduire, les modifier ou les republier, en tout ou en partie, demande une autorisation écrite préalable. Les courtes citations restent libres, à condition d'indiquer l'auteur et un lien vers l'article (article L. 122-5 du Code de la propriété intellectuelle).

Les noms, logos, captures et visuels des jeux, films, séries, anime et produits dont parle le site appartiennent à leurs titulaires. Ils sont montrés pour illustrer ou commenter l'œuvre dont il est question. Certaines photos d'illustration viennent de la photothèque [Unsplash](https://unsplash.com/license).

Une utilisation non autorisée du contenu du site peut constituer une contrefaçon (articles L. 335-2 et suivants du Code de la propriété intellectuelle).

## Contenu, liens et commentaires

Les articles sont écrits avec soin, mais ils peuvent contenir des erreurs ou devenir dépassés : les tests et les avis sont des opinions personnelles, et les informations sont données à titre indicatif. Si vous repérez une erreur, écrivez-moi.

Le site renvoie vers d'autres sites. Je ne contrôle pas leur contenu et je n'en suis pas responsable. Ces liens portent la mention `?ref=geekly.blog`, qui indique seulement au site visité que vous venez de GEEKLY : elle ne contient rien sur vous.

Les abonnés peuvent commenter les articles. Un commentaire contraire à la loi (injure, diffamation, haine, atteinte à la vie privée, contrefaçon…) peut être supprimé sans préavis. Pour signaler un contenu, écrivez à [pro@alexisdechiara.fr](mailto:pro@alexisdechiara.fr) en indiquant l'adresse de la page et le passage concerné.

## Données personnelles

### Qui est responsable

Le responsable du traitement de vos données est l'éditeur, Alexis De Chiara. Pour toute question ou demande sur vos données : [pro@alexisdechiara.fr](mailto:pro@alexisdechiara.fr).

### Abonnement, compte et newsletter

- **Données** : votre adresse e-mail, et votre nom si vous le donnez (facultatif). Ghost y ajoute la date d'inscription et de dernière visite, le pays et la ville approximatifs déduits de votre adresse IP à l'inscription, et la page depuis laquelle vous vous êtes abonné.
- **Pourquoi** : vous permettre de vous connecter, de commenter et d'utiliser les outils de lecture réservés aux abonnés ; vous envoyer la newsletter « GEEKLY » si vous y restez inscrit.
- **Base légale** : l'exécution du service que vous demandez pour le compte ; votre consentement pour la newsletter, que vous pouvez retirer à tout moment.
- **Durée** : tant que vous restez abonné. Si vous demandez la suppression de votre compte, je le supprime dans le mois qui suit votre demande, et vos données sont alors effacées de Ghost.

L'abonnement vous inscrit à la newsletter « GEEKLY ». Chaque e-mail contient un lien de désinscription ; votre nom, votre adresse et vos choix de newsletter se modifient aussi dans « Votre compte », en haut du site, une fois connecté.

Les e-mails du site (lien de connexion, confirmation d'inscription, newsletter) partent de l'adresse noreply@geekly.blog, par l'intermédiaire d'un service d'envoi d'e-mails qui agit pour mon compte et ne reçoit que ce qui est nécessaire à l'envoi.

### Ouvertures et clics dans les e-mails

Quand la newsletter vous est envoyée, Ghost peut enregistrer si vous l'avez ouverte (par une petite image invisible) et sur quels liens vous avez cliqué, pour savoir quels articles intéressent les lecteurs.

- **Base légale** : l'intérêt légitime de l'éditeur à connaître l'audience de sa newsletter.
- **Durée** : tant que vous restez abonné.
- **Pour vous y opposer** : bloquez le chargement des images dans votre messagerie (l'ouverture n'est alors pas comptée), ou écrivez-moi.

### Commentaires

- **Données** : le texte de votre commentaire, le nom affiché et la date.
- **Pourquoi** : publier votre commentaire sous l'article.
- **Base légale** : l'exécution du service que vous demandez en commentant.
- **Durée** : tant que le commentaire est en ligne. Vous pouvez le modifier ou le supprimer vous-même.

### Statistiques de fréquentation

Le site mesure sa fréquentation avec [Plausible](https://plausible.io/data-policy), installé sur `analytics.geekly.blog`, sur le même serveur que le site. Plausible ne dépose aucun cookie et, selon sa documentation, ne conserve pas votre adresse IP : il compte les pages vues, le site d'où vous venez, le type d'appareil, le navigateur et le pays, sans pouvoir vous suivre d'un jour à l'autre ni d'un site à l'autre. Les statistiques conservées ne permettent de reconnaître personne.

- **Base légale** : l'intérêt légitime de l'éditeur à connaître l'audience de son site.

### Journaux du serveur

Comme tout site, le serveur note chaque visite : adresse IP, page demandée, date et heure, navigateur.

- **Pourquoi** : la sécurité du site et le diagnostic des pannes.
- **Base légale** : l'intérêt légitime de l'éditeur à protéger son site.
- **Durée** : le temps nécessaire à ces usages, puis ils sont effacés.

### Qui reçoit vos données

Vos données ne sont ni vendues ni louées. Seuls les prestataires techniques qui font fonctionner le site y ont accès, pour ce seul usage :

- l'hébergeur, Hostinger (Union européenne), qui stocke le site, ses données et ses statistiques ;
- le service d'envoi d'e-mails, pour les e-mails décrits plus haut.

Les services que votre navigateur contacte en affichant certaines pages sont décrits plus bas, dans « Services externes ».

### Vos droits

Vous pouvez à tout moment :

- accéder à vos données et en obtenir une copie ;
- les faire corriger ou supprimer ;
- demander d'en limiter l'usage, ou vous opposer à un traitement fondé sur l'intérêt légitime ;
- récupérer les données que vous avez fournies dans un format réutilisable ;
- retirer votre consentement à la newsletter (lien de désinscription dans chaque e-mail) ;
- donner des directives sur ce que deviennent vos données après votre décès.

Pour exercer ces droits, écrivez à [pro@alexisdechiara.fr](mailto:pro@alexisdechiara.fr) depuis l'adresse de votre abonnement. Je réponds dans un délai d'un mois. Une pièce d'identité ne vous sera demandée qu'en cas de doute sérieux sur votre identité.

Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL : [cnil.fr/fr/plaintes](https://www.cnil.fr/fr/plaintes).

## Cookies et stockage dans le navigateur

### Cookies

Le site lui-même ne dépose aucun cookie publicitaire ni de mesure d'audience.

| Cookie | Déposé par | À quoi il sert | Durée |
|---|---|---|---|
| `ghost-members-ssr` et `ghost-members-ssr.sig` | Ghost, quand vous vous connectez | Vous garder connecté à votre compte d'abonné | 6 mois environ, ou jusqu'à la déconnexion |

Ce cookie est nécessaire au service que vous demandez en vous connectant : la loi le dispense de consentement.

Les contenus intégrés (vidéos YouTube, publications X…) ne sont chargés que si vous le demandez ; ces services peuvent alors déposer leurs propres cookies ou garder des informations dans votre navigateur (voir « Services externes »).

### Ce que le site garde dans votre navigateur

Le site enregistre aussi quelques préférences dans le stockage de votre navigateur (« localStorage » et « sessionStorage »). Elles servent seulement au fonctionnement des pages, restent sur votre appareil et ne sont jamais envoyées au site. Vous pouvez les effacer à tout moment en effaçant les données du site dans votre navigateur.

| Nom | Pour qui | À quoi il sert | Durée |
|---|---|---|---|
| `theme` | tous | Le mode clair, sombre ou automatique que vous avez choisi | Jusqu'à ce que vous changiez de mode ou effaciez les données du site |
| `attibling-promo-closed` | visiteurs | Ne plus afficher l'encart d'abonnement de l'accueil après l'avoir fermé | Jusqu'à l'effacement des données du site |
| `attibling-intro` | tous | Ne jouer l'animation d'arrivée de l'accueil qu'une fois | Fin de la session (fermeture de l'onglet) |
| `attibling-hero-cue` | tous | Ne faire onduler qu'une fois les points du bandeau de l'accueil | Fin de la session (fermeture de l'onglet) |
| `attibling-embeds` | tous | Les services dont vous avez choisi « Toujours afficher les contenus » (par exemple YouTube) : seulement leur nom | Jusqu'à « Ne plus afficher automatiquement » (sous chaque contenu affiché ainsi) ou l'effacement des données du site |
| `ghost-history` | tous | Ghost note les pages vues pendant la visite, pour savoir depuis quelle page on s'abonne | Fin de la session |
| `attibling-reading` | abonnés | Vos réglages d'affichage des articles (thème, polices, taille, largeur…) | Jusqu'à « Réinitialiser » ou l'effacement des données du site |
| `attibling-saved` | abonnés | Votre liste « À lire plus tard » (adresse, titre, image, rubrique et durée de lecture des articles ; 100 au plus) | Jusqu'à ce que vous retiriez les articles ou effaciez les données du site |
| `attibling-progress` | abonnés | « Reprendre la lecture » : où vous en êtes dans les 6 derniers articles commencés | Jusqu'à la fin de la lecture, « Retirer » ou l'effacement des données du site |

## Services externes

Les polices, les images et les scripts du site viennent du site lui-même, à ces exceptions près. En les contactant, votre navigateur leur transmet votre adresse IP et les informations techniques habituelles (navigateur, page d'origine).

- **jsDelivr** (`cdn.jsdelivr.net`) : les modules de Ghost pour l'abonnement et la connexion, la recherche et les commentaires, à chaque visite.
- **Bunny Fonts** (`fonts.bunny.net`) : seulement si un abonné choisit une autre police dans ses réglages d'affichage. Ce service déclare ne garder aucun journal et ne suivre personne.
- **Unsplash** (`images.unsplash.com`) : les photos d'illustration qui viennent de cette photothèque.
- **Images d'autres sites** : quelques articles affichent une image (capture, logo) directement depuis le site qui la publie.
- **Plausible** (`analytics.geekly.blog`) : les statistiques décrites plus haut, sur le serveur du site.

**Vidéos YouTube et publications X.** Certains articles intègrent des vidéos YouTube, des publications X (Twitter) ou d'autres contenus venant d'un autre site. Rien n'est demandé à ces services tant que vous ne cliquez pas sur le bouton « Afficher la vidéo YouTube » (ou « Afficher la publication X »…) ; à la place, un encadré indique d'où vient le contenu et propose un lien pour l'ouvrir directement chez le service. Si vous cochez « Toujours afficher les contenus de… », ce choix est gardé dans votre navigateur (`attibling-embeds`, ci-dessus) et les contenus de ce service s'afficheront ensuite d'eux-mêmes ; un lien sous chacun permet de revenir sur ce choix.

Une fois affichés, ces contenus sont fournis par leur service, qui reçoit votre adresse IP et applique ses propres règles :

- les vidéos YouTube sont chargées en « mode confidentialité renforcée » (`youtube-nocookie.com`). YouTube y dépose moins de traceurs, mais le lecteur vient toujours des serveurs de Google, qui peut garder des informations dans votre navigateur ([politique de confidentialité de Google](https://policies.google.com/privacy?hl=fr)) ;
- les publications X peuvent déposer des cookies de X ([politique de confidentialité de X](https://x.com/fr/privacy)).

Les boutons de partage sont de simples liens : rien n'est chargé tant que vous ne cliquez pas.

## Droit applicable

Ces mentions sont soumises au droit français. Sauf règle contraire de la loi, les tribunaux de Nice sont compétents.

## Mises à jour

Cette page peut évoluer, par exemple quand le site change de prestataire. La date de la dernière mise à jour est indiquée en haut de la page.

<!-- Fin du texte à coller. -->

---

## D'où viennent les réponses (vérifié le 19 novembre 2026)

| Point | Ce que montre le site | Retenu dans le texte |
|---|---|---|
| Éditeur, adresse, directeur de la publication, contact | Page actuelle : « Propriétaire : Alexis De Chiara – 50 boulevard Stalingrad 06300 Nice », « Responsable publication : Alexis De Chiara – pro@alexisdechiara.fr » ; page « À propos » : « GEEKLY est une publication indépendante lancée en janvier 2023 par Alexis De Chiara » | Repris tels quels |
| Hébergeur | Page actuelle : « Hostinger – Rue Švitrigailos 34 03230 Vilnius, Lituanie +37064503378 », « hébergé chez un prestataire sur le territoire de l'Union Européenne » ; l'adresse IP du site (62.72.18.119, 2a02:4780:…) appartient au réseau « HOSTINGER-HOSTING » (base RIPE) ; DNS chez Hostinger | Hostinger, à l'adresse publiée, Union européenne |
| Ghost installé par l'éditeur | Le site répond depuis un serveur Hostinger (`x-powered-by: Express`, Ghost 6 auto-hébergé), pas depuis Ghost(Pro) | « installé sur un serveur loué chez Hostinger » |
| Plausible | `analytics.geekly.blog` pointe vers la même adresse IP que le site ; le serveur répond `server: Cowboy` (Plausible Community Edition, auto-hébergé) | « sur le même serveur que le site » |
| Origine des inscriptions (`ghost-history`) | Le site charge `/public/member-attribution.min.js` : le réglage Ghost « Member sources » est activé | Ligne gardée, ainsi que « la page depuis laquelle vous vous êtes abonné » |
| Newsletter | Une newsletter « GEEKLY », inscription automatique à l'abonnement (`subscribe_on_signup`) ; adresse d'envoi `noreply@geekly.blog` ; envoi des articles par e-mail désactivé par défaut dans l'éditeur (`editor_default_email_recipients: disabled`) ; aucun enregistrement MX ou SPF public ne désigne un prestataire | Service d'envoi non nommé ; suivi des ouvertures décrit « quand la newsletter vous est envoyée » |
| Commentaires | `comments_enabled: all` (tous les abonnés) | Section gardée |
| Liens sortants | `outbound_link_tagging: true` (Ghost ajoute `?ref=geekly.blog`) | Phrase ajoutée |
| Images Unsplash | La page d'accueil en ligne charge des images depuis `images.unsplash.com` | Ajouté aux services externes |

## Points que seul l'éditeur peut confirmer

Le texte ci-dessus est publiable tel quel ; chaque point dit ce qui a été écrit par défaut.

1. **Statut.** Le site se présente comme une « publication indépendante » d'une personne : le texte ne donne ni
   statut professionnel ni numéro SIREN. Si le blog relève de votre activité de développeur indépendant,
   ajoutez votre SIREN dans « Éditeur du site ». (Un éditeur non professionnel pourrait aussi ne pas publier
   son adresse, à condition de l'avoir donnée à son hébergeur — LCEN, article 1-1 ; le texte garde l'adresse
   publiée aujourd'hui.)
2. **Hébergeur.** Par défaut « Hostinger » avec l'adresse de Vilnius publiée aujourd'hui. Si votre facture
   indique une autre entité (par exemple Hostinger International Ltd), mettez son nom et son adresse.
3. **Service d'envoi des e-mails.** Par défaut, il n'est pas nommé. S'il traite des données hors de l'Union
   européenne, ajoutez son nom, le pays et la garantie utilisée (clauses contractuelles types, décision
   d'adéquation).
4. **Suivi des ouvertures et des clics.** Par défaut, décrit comme possible « quand la newsletter vous est
   envoyée ». Si vous n'envoyez jamais la newsletter par e-mail, ou si le suivi est désactivé
   (Settings → Analytics), vous pouvez retirer la section.
5. **Suppression d'un compte.** Par défaut « dans le mois qui suit votre demande » (le délai maximal du RGPD).
6. **Journaux du serveur.** Par défaut « le temps nécessaire à ces usages ». Si vous connaissez la durée réelle
   (configuration du serveur), indiquez-la.
7. **Case à cocher de l'inscription.** Portal affiche aujourd'hui « En s'inscrivant, vous déclarez avoir lu et
   accepté les mentions légales » avec une case obligatoire. Cette page n'est pas un contrat à accepter ;
   proposé, dans Settings → Membership → Portal settings → *Signup options* : texte « Vos données sont
   traitées comme décrit dans les <a href="https://geekly.blog/mentions-legales/">mentions légales</a>. » et
   *Require agreement* désactivé.
