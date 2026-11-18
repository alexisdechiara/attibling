# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Lecteurs francophones du blog GEEKLY (geekly.blog) : ils arrivent pour trouver et lire un article sur la culture geek, la tech et la pop culture (tops jeux et anime, dossiers, actualités, tutoriels d'auto-hébergement). *(inféré du contenu en ligne, non confirmé par l'auteur)*
- Autres blogueurs Ghost : le thème est public, sous licence MIT, et réutilisable sur d'autres sites.

## Product Purpose

Attibling est un thème Ghost, né de la fusion de Liebling (structure, cartes, navigation) et d'Attila (page d'article). Il sert d'abord le blog GEEKLY d'Alexis De Chiara, seul auteur. Le succès : un visiteur voit des articles dès l'arrivée, lit confortablement sur mobile comme sur bureau, et trouve l'article suivant.

## Operating Context

- Site en production sous Ghost 6 ; la version déployée est la branche `dev` (v1.1.1).
- Lecture en mode clair, sombre ou automatique.
- Navigation du site : Newsletter, Dossier, News, menu secondaire, recherche, abonnement.

## Capabilities and Constraints

- Templates Handlebars de Ghost : seules les données exposées par Ghost sont disponibles (articles, tags, auteurs, navigation, membres, commentaires, recherche native).
- Le thème doit rester utilisable sans l'identité GEEKLY : le logo GEEKLY est un réglage optionnel (`use_geekly_logo`).
- CSS natif avec nesting, JavaScript sans jQuery, bibliothèques remplacées par du natif quand il est meilleur ; un navigateur non compatible peut perdre la décoration, jamais l'accès au contenu ou à la navigation.
- Texte des articles : justifié sur bureau, aligné à gauche sur mobile (décision de l'auteur, 2026-11-18).

## Brand Commitments

- La photo de couvertures de comics de la page d'accueil est conservée (décision de l'auteur, 2026-11-18).
- Rien d'autre n'est imposé : logo, menu et structure peuvent être remis en question.

## Evidence on Hand

- Contenu réel sur https://geekly.blog.
- Critique de design du 2026-11-18 : `.impeccable/critique/`.
- Aucun témoignage, chiffre d'audience ni charte graphique formelle : ne pas en inventer.

## Product Principles

1. Le contenu d'abord : un article est visible sans défiler.
2. La lecture est la tâche principale ; tout le reste s'efface devant elle.
3. L'identité est portée par le cadre, pas seulement par une image.
4. Sobriété technique : le natif avant la bibliothèque, la fonction avant la décoration.

## Accessibility & Inclusion

Contraste AA au minimum, focus clavier visible, cibles tactiles de 44 px, respect de `prefers-reduced-motion`.
