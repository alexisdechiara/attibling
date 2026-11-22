# attibling

Thème Ghost 6 du blog https://geekly.blog. Répondre en français, en vouvoyant l'utilisateur.

À lire d'abord : `README.md`, `PRODUCT.md`, `docs/guide-auteur.md`, `docs/cookies-proposition.md`, `docs/mentions-legales-proposition.md`, `package.json` (réglages du thème : 20 au maximum), `vite.config.mjs`.

## Branches et déploiement

- Une fusion dans `master` déclenche le déploiement sur le site. Ne jamais fusionner dans `master` ni ouvrir de pull request sans demande explicite.

## Règles de travail

- Les `assets/` construits sont commités : après toute modification de `src/`, lancer `npm run build` et commiter le résultat dans un commit à part « Rebuild theme assets ». La CI échoue sinon.
- Avant de pousser : `npm ci && npm run build && npm test && npm run check`, puis `npm run zip`, `npx gscan@6.7.0 -z attibling.zip --v6`, et supprimer l'archive.
- 33 fichiers `locales/*.json` : toute clé `{{t "…"}}` doit exister dans les 33. Français dans `fr.json` (vouvoiement) et `fr-informal.json` (tutoiement), anglais ailleurs.
- Cibles navigateurs : Chrome et Edge 125, Firefox 126, Safari 17.5. Pas de couleurs relatives CSS (`rgb(from …)`) : utiliser `color-mix()`.
- Aucune dépendance d'exécution nouvelle. Chaque correctif vient avec un test qui échoue sans lui.
- Captures demandées : ordinateur en thème clair uniquement, sauf demande contraire.
- Déléguer les chantiers à des sous-agents quand c'est utile, chacun dans sa copie de travail, et vérifier leur travail avant de fusionner.

## Choix de design à ne pas défaire

Cartes qui se soulèvent au survol ; liens bleus sans soulignement ; « Tags » et non « Mots clés » ; polices Onest (interface) et Literata (texte des articles) ; « ly » du logo en Pacifico ; encart d'abonnement limité à deux lignes ; « Plus ▾ » et « ··· » côte à côte dans l'en-tête ; points du héro espacés de 44 px.

## Instance Ghost de test

Si une vérification sur un vrai Ghost est nécessaire : Ghost 6.78 local, thème activé, `use_geekly_logo` activé, `home_row_1..5` = `jeux-video`, `anime`, `actualites`, `ia`, `dossiers`. Ne jamais publier ni modifier d'article contenant des liens externes sur une instance de test (Ghost notifierait les sites liés).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `alexisdechiara/attibling`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
