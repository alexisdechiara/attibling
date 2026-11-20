# Page « Cookies et confidentialité » de GEEKLY — proposition de texte

> **Brouillon du 20 novembre 2026, à relire. Ce n'est pas un conseil juridique** : une aide à la rédaction,
> écrite à partir de ce que le thème et Ghost font réellement (code du thème, Ghost 6.78 en local) et des
> textes de la CNIL et de l'EDPB cités dans `docs/guide-auteur.md` (« Cookies et confidentialité »).
>
> - **Préalables**, sans quoi le texte dirait faux : dans Ghost Admin → Settings → **Analytics**, désactivez
>   *Newsletter opens*, *Newsletter clicks* et *Member sources* ; dans Settings → **Code injection**, ne
>   gardez que Plausible (retirez les polices Google) ; laissez le réglage du thème *Consent notice* sur
>   `Notice` (défaut : aucune carte, chaque vidéo ou publication d'un autre site demande l'accord dans son
>   encadré) et *Consent tools* éteint. Si vous gardez l'un de ces suivis, voir « Si vous gardez… » à la fin.
> - Créez la page : Pages → New page, titre « Cookies et confidentialité », **Page URL** = `cookies`
>   (détail dans `docs/guide-auteur.md`). Collez tout ce qui se trouve entre « Texte à coller » et « Fin du
>   texte à coller » dans une carte Markdown (`/markdown`).
> - **Ne listez pas les clés de stockage** : le thème ajoute seul, après votre texte, ce que le navigateur du
>   lecteur garde en ce moment (avec « Effacer »), ses réglages (contenus intégrés, statistiques, lecture), et
>   la liste complète de ce que le site peut garder. Elle suit le code : elle reste juste.
> - La date « Dernière mise à jour » s'affiche toute seule en haut de la page.

Extrait de la page (réglages de la page → **Excerpt**), proposé :

> Ce que le site garde dans votre navigateur, ce qu'il ne fait pas, et comment tout régler.

---

<!-- Texte à coller : tout ce qui suit cette ligne, dans une carte Markdown (/markdown) de la page. -->

GEEKLY n'affiche pas de bandeau de cookies à l'arrivée : rien de ce que le site garde dans votre navigateur ne sert à vous suivre ou à vous montrer de la publicité. Une seule chose demande votre accord : les vidéos et publications d'autres sites (YouTube, X…) intégrées à certains articles. Sur ces articles seulement, l'encadré qui remplace chaque contenu vous le demande. Cette page dit ce qui est gardé, pourquoi, et comment le régler. Vous retrouvez les mêmes réglages à tout moment avec le lien « Cookies et confidentialité », en bas de chaque page.

## En bref

- Pas de publicité, pas de suivi d'un site à l'autre, pas de revente de données.
- Le site ne dépose **aucun cookie** si vous n'êtes pas abonné. Abonné connecté, un seul cookie vous garde connecté.
- Vos préférences (mode sombre, réglages de lecture) et vos listes d'abonné restent **dans votre navigateur** : elles ne sont pas envoyées au site.
- Les vidéos YouTube, les publications X et les autres contenus d'autres sites ne se chargent **qu'avec votre accord**, donné dans l'encadré qui les remplace.
- Les statistiques de visite sont anonymes, sans cookie, et vous pouvez demander à ne pas être compté.

## Ce que le site garde, et pourquoi

**Le cookie de connexion.** Quand vous vous connectez à votre compte d'abonné, Ghost (le logiciel du site) dépose le cookie `ghost-members-ssr` et sa signature, pour vous garder connecté. Il dure 6 mois au plus et disparaît quand vous vous déconnectez. Il est nécessaire au service que vous demandez en vous connectant : la loi ne demande pas d'accord pour lui.

**Vos préférences.** Le mode clair ou sombre, l'encart d'abonnement que vous avez fermé, vos réglages d'affichage des articles : le site s'en souvient dans votre navigateur parce que vous les avez choisis.

**Vos outils d'abonné.** « À lire plus tard » garde les articles que vous enregistrez. « Reprendre la lecture » note où vous vous êtes arrêté dans les derniers articles commencés, pour vous y ramener depuis l'accueil ; vous pouvez l'éteindre (« Retenir où je m'arrête », ci-dessous ou dans les réglages d'affichage), la liste est alors effacée.

**Vos choix.** Les services que vous avez choisi d'afficher sans clic, ou votre refus d'être compté dans les statistiques : le site garde ces choix pour les respecter.

Tout cela reste sur votre appareil. Rien n'est envoyé au site, et vous pouvez tout effacer ici même. Attention : vos listes d'abonné sont gardées par ce navigateur, pas par votre compte. Sur un ordinateur partagé, la personne qui se connecte après vous les verrait : déconnectez-vous avec le lien « Se déconnecter » du site, qui les efface, ou effacez-les ci-dessous.

## Ce que le site ne fait pas

- Il n'affiche pas de publicité et n'utilise aucun service publicitaire.
- Il ne vous suit pas d'un site à l'autre et ne partage rien avec des réseaux sociaux.
- Il ne mesure pas l'ouverture des newsletters et ne suit pas les clics dans les e-mails.
- Il ne charge rien depuis YouTube, X ou un autre service tant que vous ne l'avez pas accepté.

## Les contenus d'autres sites

Certains articles intègrent une vidéo YouTube, une publication X ou un autre contenu venant d'un autre site. Tant que vous n'avez pas accepté, rien n'est demandé à ce service : à sa place, un encadré dit d'où vient le contenu et ce que l'afficher envoie. Afficher ces contenus les charge depuis le service, qui reçoit votre adresse IP et peut déposer ses propres cookies, selon ses règles ([Google](https://policies.google.com/privacy?hl=fr), [X](https://x.com/fr/privacy)). Les vidéos YouTube sont chargées en « mode confidentialité renforcée ».

C'est cet encadré qui vous demande votre accord, à l'endroit du contenu ; aucune autre fenêtre ne s'affiche. « Accepter et afficher » : ce contenu s'affiche, et désormais tous les contenus intégrés du site s'affichent sans clic, sur cette page et les suivantes, pendant 6 mois (la question revient ensuite). « Afficher seulement celui-ci » : ce contenu seul, sans rien garder. Sans réponse, chaque contenu reste masqué. Vous pouvez revenir sur votre choix ci-dessous, pour tous les contenus intégrés ou service par service, ou sous chaque contenu affiché sans clic. Si votre navigateur envoie le signal Global Privacy Control, il est pris comme un refus : les contenus restent masqués jusqu'à ce que vous en décidiez autrement.

## Les statistiques de visite

Le site compte ses visites avec [Plausible](https://plausible.io/data-policy), installé sur son propre serveur (`analytics.geekly.blog`). Plausible ne dépose aucun cookie et ne garde pas votre adresse IP : il compte les pages vues, le site d'où vous venez, le pays, le type d'appareil et de navigateur, sans pouvoir vous reconnaître d'un jour à l'autre ni d'un site à l'autre. Ces statistiques servent seulement à savoir quels articles sont lus. Pour ne plus être compté, désactivez « Compter mes visites » ci-dessous.

## Les autres services contactés

En affichant les pages, votre navigateur contacte aussi quelques services qui reçoivent votre adresse IP, sans rien déposer : jsDelivr (les modules de Ghost pour l'abonnement, la recherche et les commentaires), Unsplash et quelques autres sites pour certaines images, et Bunny Fonts si vous choisissez une autre police dans vos réglages de lecture. Le détail est dans les [mentions légales](https://geekly.blog/mentions-legales/).

## Vos réglages

Juste en dessous, le site affiche ce que votre navigateur garde pour lui en ce moment, vos choix, et la liste complète de ce qu'il peut garder. Vous pouvez aussi tout effacer depuis les réglages de votre navigateur (« Effacer les données du site »).

Pour toute question : [pro@alexisdechiara.fr](mailto:pro@alexisdechiara.fr). Vos droits sur vos données sont décrits dans les [mentions légales](https://geekly.blog/mentions-legales/#vos-droits).

<!-- Fin du texte à coller. -->

---

## Si vous gardez un suivi

- **Ouvertures et clics des newsletters gardés** (Settings → Analytics) : retirez la ligne « Il ne mesure pas l'ouverture des newsletters… » ; depuis la recommandation de la CNIL publiée le 14 avril 2026, il faut l'accord de l'abonné pour le pixel d'ouverture (et, par prudence, pour les liens de suivi), par exemple une case non cochée au moment de l'inscription — ce que Portal ne propose pas aujourd'hui. Le plus simple reste de les désactiver.
- **Member sources gardé** : Ghost note les pages vues pendant la visite (`ghost-history`) et les associe à votre compte si vous vous abonnez ; il faudrait l'accord préalable du lecteur, que le thème ne peut pas recueillir pour un script de Ghost. Désactivez-le.
- **Un outil de mesure ou de publicité qui demande l'accord** (Google Analytics, AdSense, pixel Meta…) : la première phrase de la page devient fausse. Gardez le réglage du thème *Consent notice* sur *Notice* (ou *Banner* pour un outil qui doit compter dès la première page), marquez ses scripts `data-consent`, allumez *Consent tools* (guide, « Brancher un outil… ») et décrivez l'outil ici (qui, quoi, combien de temps).

## D'où viennent les affirmations

| Phrase | Vérifié |
|---|---|
| Aucun cookie pour un visiteur ; `ghost-members-ssr` 6 mois | Thème : aucun `document.cookie` ; Ghost 6.78 `members-ssr.js` : 184 jours, `HttpOnly` ; audit du 19 novembre 2026 (aucun cookie observé pour un visiteur) |
| Préférences et listes dans le navigateur, rien d'envoyé | `src/js/privacy/registry.js` et le test qui le relie au code (`src/tests/document.test.js`) |
| Rien chargé depuis YouTube / X avant le clic | `src/tests/embeds.test.js` (aucune requête observée), règle CSP de `default.hbs` |
| Plausible sans cookie, IP non gardée | https://plausible.io/data-policy (lu le 20 novembre 2026) |
| Pas de suivi des newsletters, pas de « Member sources » | **À faire par vous** (préalables ci-dessus) |
