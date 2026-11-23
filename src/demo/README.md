# Démo locale du thème

Ce dossier installe un **Ghost 6.78 local**, le remplit avec le même contenu français inventé (30 articles, 6 tags
publics et leurs tags internes, 2 auteurs, les pages du guide, la navigation, les réglages du thème de GEEKLY) et le
fait tourner sur `http://localhost:2368`. C'est un outil de développement : rien de ce dossier n'est dans
`attibling.zip` (le script `zip` exclut `src/*`).

Deux chemins, au choix : **Docker** (le plus court) ou **sans Docker** (Ghost installé par `ghost-cli`).

> **Danger : ne faites jamais servir le dépôt lui-même par un Ghost installé hors Docker.**
> gscan, que Ghost lance quand il active un thème, considère tout dossier de thème situé sous `os.tmpdir()` comme
> une archive décompressée jetable : il y supprime `.git`, `node_modules`, `CLAUDE.md`, `AGENTS.md`, `.claude`…
> **même à travers un lien symbolique**. C'est arrivé une fois sur un vrai dépôt.
> C'est pourquoi les scripts : (1) rangent tout dans un dossier de travail **hors du dépôt** et hors du dossier
> temporaire du système (ils refusent de démarrer sinon) ; (2) font servir à Ghost une **copie jetable** du thème, jamais
> le dépôt ; (3) lancent Ghost avec un `TMPDIR` qui n'est pas un préfixe du chemin du thème. Ne retirez rien de cela.
> Avec Docker, le dépôt est monté dans le conteneur, dont le dossier temporaire est `/tmp` : le chemin du thème
> (`/var/lib/ghost/content/themes/attibling`) n'est pas dessous, gscan ne supprime rien.

## Où vont les fichiers

Tout ce que la démo crée est dans **un seul dossier de travail**, `GEEKLY_DEMO_DIR` (par défaut `~/ghost-geekly`) :

| Fichier ou dossier | Contenu |
|---|---|
| `site/` | l'installation de Ghost (chemin sans Docker), sa base SQLite, `config.development.json` |
| `theme/` | la copie du thème que Ghost sert (`site/content/themes/attibling` y pointe) |
| `tools/` | `ghost-cli` et `pnpm`, installés localement (rien de global) |
| `images/` | les 54 images générées (aucune image n'est dans le dépôt) |
| `venv/` | environnement Python facultatif pour les images (voir plus bas) |
| `credentials.json` | identifiants (droits `600`), voir [Identifiants](#identifiants) |
| `seed-state.json` | adresses des images déjà envoyées (pour ne pas les renvoyer) |
| `run-tmp/`, `ghost.pid` | dossier temporaire et PID de Ghost (chemin sans Docker) |

Le dossier de travail est **refusé** s'il est dans le dépôt, s'il contient le dépôt ou s'il est sous le dossier
temporaire du système (`/tmp`, `/var/folders/…` sous macOS) : choisissez `~/ghost-geekly` ou un autre dossier de votre
répertoire personnel.

## Prérequis

| Outil | Pour | Remarque |
|---|---|---|
| Node.js 22 ou plus récent, et npm | tout | le seed n'utilise que les modules intégrés de Node (aucune dépendance ajoutée) |
| Python 3 avec `numpy` et `Pillow` | les images | voir [Les images](#les-images) |
| Docker (Docker Desktop, OrbStack…) | chemin Docker | facultatif |
| Un compilateur (macOS : `xcode-select --install`) | chemin sans Docker | `sqlite3` est compilé à l'installation |
| bash | chemin sans Docker | présent sur macOS (3.2) et Linux ; les scripts sont écrits pour lui |

**Windows** : utilisez **WSL 2** (Ubuntu) ou **Docker Desktop**. Avec WSL, installez Node 22 dans Ubuntu, clonez le dépôt
**dans le système de fichiers de WSL** (`~/attibling`, pas `/mnt/c/…`, bien plus lent) et suivez le chemin sans Docker :
`http://localhost:2368` est ensuite ouvert depuis le navigateur Windows. Aucun script PowerShell n'est fourni.

## Les images

Les images sont générées en local (aucun réseau), de façon déterministe, par `gen-images.py` : bruit, dégradés, formes,
grain, textes… dans plusieurs familles (aurore, géométrique, dense, sombre, claire, aplat, texte dans l'image).

```bash
python3 -m venv ~/ghost-geekly/venv
~/ghost-geekly/venv/bin/pip install numpy pillow
npm run demo:images          # écrit ~/ghost-geekly/images (≈ 40 s) ; --force pour tout refaire
```

`npm run demo:images` utilise `~/ghost-geekly/venv` s'il existe, sinon le `python3` du système (ou celui que
désigne `GEEKLY_DEMO_PYTHON`). Pour réutiliser un dossier d'images existant (au lieu de les générer) :
`npm run demo:images -- --images /chemin/images` pour y écrire, et `npm run demo:seed -- --images /chemin/images` pour
que le seed les envoie ; ce dossier est soumis à la même règle (ni dans le dépôt, ni sous le dossier temporaire).

## Chemin A : Docker

Le dépôt est monté dans le conteneur (`src/docker-compose.yml`, image `ghost:6.78`, `NODE_ENV=development`, base SQLite
dans le conteneur) : Ghost sert directement vos fichiers, sans copie.

```bash
# terminal 1 : lance Ghost (au premier plan)
npm run ghost
# terminal 2, une fois « Ghost booted » affiché :
npm run demo:images       # voir « Les images »
npm run demo:seed
```

Puis ouvrez <http://localhost:2368/> (site) et <http://localhost:2368/ghost/> (administration).

- **Après une modification** : `npm run build` (les `assets/` construits sont ceux que Ghost sert), puis rechargez la page.
  Si vous avez ajouté ou changé un réglage dans `config.custom` de `package.json`, redémarrez le conteneur
  (`docker compose -f src/docker-compose.yml restart`) puis relancez `npm run demo:seed`.
- **Repartir de zéro** : `docker compose -f src/docker-compose.yml down` supprime le conteneur et sa base ; `npm run ghost`
  puis `npm run demo:seed` (le seed recrée le propriétaire et réécrit `credentials.json`).
- Le fichier `src/docker-compose.yml` active aussi la configuration de [sécurité](#sécurité) par variables d'environnement
  (`privacy__useTinfoil`, `mail__transport=stub`…). Le seed lit le jeton d'invitation du 2ᵉ auteur dans la base du
  conteneur avec `docker exec ghost …` (nom du conteneur : `GEEKLY_DEMO_CONTAINER`, `ghost` par défaut).

> Ce chemin n'a pas pu être exécuté pour écrire ce document (pas de Docker dans l'environnement où il a été préparé) :
> le fichier a été relu et testé syntaxiquement seulement. Si une étape échoue, signalez-le.

## Chemin B : sans Docker

```bash
npm run demo:install      # une fois : ghost-cli, Ghost 6.78.0 (SQLite, port 2368), clés de sécurité, copie du thème
npm run demo:start        # terminal 1 : Ghost au premier plan (Ctrl-C pour l'arrêter)

# terminal 2
npm run demo:images       # voir « Les images »
npm run demo:seed
```

Puis ouvrez <http://localhost:2368/> et <http://localhost:2368/ghost/>.

- `npm run demo:install` peut être relancé sans risque : il saute ce qui existe. Il n'installe rien de global
  (`ghost-cli@1.34.1` et `pnpm@12.21.0` vont dans `~/ghost-geekly/tools`) et fusionne lui-même les clés de sécurité dans
  `config.development.json`.
- `npm run demo:stop` arrête Ghost (SIGTERM, puis SIGKILL après 30 s ; sans effet si rien ne tourne).
- **Après une modification du thème** :

  ```bash
  npm run build           # si vous avez changé src/ (les assets construits sont ceux que Ghost sert)
  npm run demo:sync       # recopie le thème dans ~/ghost-geekly/theme
  ```

  Ghost relit les gabarits à chaque requête en développement : rechargez la page. Si vous avez ajouté ou changé un réglage
  de `config.custom` dans `package.json`, redémarrez (`demo:stop`, `demo:start`) puis relancez `npm run demo:seed`, qui
  réactive le thème et réapplique les réglages. Pour essayer une autre branche sans la basculer, donnez le dossier d'un
  `git worktree` : `npm run demo:sync -- /chemin/vers/le/worktree`.
- **Repartir de zéro** (sans réinstaller Ghost) :

  ```bash
  npm run demo:stop
  rm -f ~/ghost-geekly/site/content/data/ghost-dev.db* ~/ghost-geekly/credentials.json ~/ghost-geekly/seed-state.json
  rm -rf ~/ghost-geekly/site/content/images/*
  npm run demo:start      # terminal 1
  npm run demo:seed       # terminal 2 (les images générées sont conservées)
  ```

  Pour tout effacer, supprimez simplement le dossier de travail entier (`rm -rf ~/ghost-geekly`).
- **Environnement jetable où l'on est root** (conteneur, CI) : `ghost-cli` refuse de tourner en root. Uniquement dans ce cas,
  `GEEKLY_DEMO_ALLOW_ROOT=1 npm run demo:install` lui fait croire qu'il n'est pas root (`no-root-check.cjs`). Sur votre
  ordinateur, n'en avez pas besoin et ne l'utilisez pas.

## Le seed

`npm run demo:seed` (`seed.mjs` et `lib/`) parle à Ghost par l'API d'administration, sur `localhost` uniquement
(`lib/api.mjs` refuse toute autre adresse). Il est **idempotent** : relancé, il met à jour par slug et ne crée aucun doublon.

- Il crée le propriétaire et une intégration (clé d'API d'administration) sur une base vierge, supprime les contenus par
  défaut de Ghost (« Coming soon », « About this site », le tag « News ») et envoie les images.
- Site : titre GEEKLY, langue `fr`, fuseau Europe/Paris, couleur d'accent `#4285F4`, navigation principale
  (Actualités, Jeux vidéo, Anime, IA, Dossiers, Test) et secondaire (Tags, Archives, Auteurs, À propos, Mentions légales).
- Réglages du thème : `use_geekly_logo` activé, `home_row_1` à `home_row_5` = `jeux-video`, `anime`, `actualites`, `ia`,
  `dossiers`, `about_tags`, logo du mode sombre ; le reste par défaut (`summary_for_visitors` désactivé : les visiteurs voient
  l'« En bref »).
- Tags : 6 publics (avec description et image), et les tags internes `#top`, `#top-1` à `#top-5`, `#immersif`, `#carte`,
  `#mis-a-jour`, `#serie-pixel-memoire` (description `Pixel & Mémoire · total: 6`).
- 2 auteurs (Alexis Moreau, Léa Fontaine), 30 articles publiés de mars 2025 à novembre 2026 (8 jeux vidéo, 6 anime, 6 actualités,
  5 IA, 5 dossiers), 6 à la une, une série de 4 parties, 4 articles longs avec sommaire, 1 article immersif
  (`histoire-du-jeu-de-role-japonais`), 3 cartes « En bref », 2 fiches de test (`aether-drifters-la-bonne-surprise-de-l-automne`,
  `data-type="VideoGame"`, et `hoshi-no-koro-notre-avis-sur-la-saison-2`, `data-type="TVSeries"`), des images (normales,
  larges, pleine largeur, portrait), du code et un tableau.
- Pages : `archives`, `favoris` (titre « À lire plus tard »), `tags`, `authors`, `a-propos`, `abonnement`, `mentions-legales`,
  `cookies`, `confidentialite` (textes courts inventés).
- Il active le thème `attibling` (`THEME_NAME` pour un autre nom) et affiche le résultat de gscan.

Adresses utiles : `/` (le héro est le dernier article à la une), `/pixel-et-memoire-1-naissance-des-salles-d-arcade/`
(long, sommaire, série, « En bref »), `/histoire-du-jeu-de-role-japonais/` (immersif),
`/aether-drifters-la-bonne-surprise-de-l-automne/` (fiche de test), `/tag/jeux-video/`, `/archives/`, `/tags/`, `/favoris/`.

## Revoir l'animation d'arrivée

Elle ne se joue qu'une fois par navigateur. Pour la revoir : ouvrez les outils de développement, onglet *Application*
(Chrome, Edge) ou *Stockage* (Firefox), *Local Storage* → `http://localhost:2368`, supprimez la clé `attibling-intro`, puis
rechargez. Dans la console : `localStorage.removeItem("attibling-intro"); location.reload()`. Une fenêtre de navigation
privée fait aussi l'affaire.

## Identifiants

Dans `~/ghost-geekly/credentials.json` (droits `600`, créé par le seed ; ne le commitez ni ne le partagez, même si les
comptes ne servent qu'ici) :

- `staff.email` et `staff.password` : le propriétaire (Alexis Moreau, slug `alexis`), pour <http://localhost:2368/ghost/> ;
- `authors.lea` : la seconde auteure (Léa Fontaine) ;
- `adminApiKey` et `contentApiKey` : les clés d'API de l'intégration « Seed (local) ».

Ouvrez-le avec `cat ~/ghost-geekly/credentials.json`. Les mots de passe sont aléatoires, créés au premier seed.

## Sécurité

- **Aucun lien externe dans le contenu** : le seed s'arrête avec une erreur si un article, un extrait ou une page contient une
  adresse `http(s)` (ou `//…`) qui ne pointe pas vers `localhost` / `127.0.0.1` (`lib/links.mjs`). Ghost envoie en effet une
  notification (webmention) aux sites liés par un article publié. N'ajoutez pas de lien externe à `lib/content.mjs`, et ne
  publiez ni ne modifiez jamais, sur une instance de test, un article qui en contient.
- **Ghost ne contacte rien** : `privacy.useTinfoil: true` (vérification des mises à jour, Gravatar, ping RPC et IndexNow coupés),
  transport d'e-mail `stub` (aucun e-mail n'est envoyé ; le transport par défaut « Direct » contacterait les serveurs des
  destinataires), mises à jour, drapeaux distants et recommandations coupés, vérification des appareils désactivée (elle
  demanderait un code envoyé par e-mail). Ces clés sont dans `lib/safety.mjs`, fusionnées dans `config.development.json` par
  `demo:install` et reprises dans `src/docker-compose.yml` ; un test vérifie qu'elles coïncident.
- Le seed désactive aussi le suivi des e-mails, des sources, le marquage des liens sortants, le ping « explore », ActivityPub
  et Unsplash.
- **Le navigateur, lui, charge** les scripts de Portal, de la recherche et des commentaires depuis `cdn.jsdelivr.net`, comme sur
  le vrai site (le thème n'autorise que cet hôte) : Ghost n'y est pour rien.
- **Ne pointez jamais le seed vers un vrai site** : `GHOST_URL` n'accepte que `localhost` et `127.0.0.1`.
- Les identifiants et les images ne sont jamais dans le dépôt (un test le vérifie).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `GEEKLY_DEMO_DIR` | dossier de travail (défaut `~/ghost-geekly`), refusé s'il est dans le dépôt ou sous `os.tmpdir()` |
| `GEEKLY_DEMO_PYTHON` | interpréteur Python des images (défaut : `venv/bin/python3` du dossier de travail, sinon `python3`) |
| `GEEKLY_DEMO_ALLOW_ROOT` | `1` : conteneur jetable où l'on est root, voir plus haut |
| `GEEKLY_DEMO_CONTAINER` | nom du conteneur Docker (défaut `ghost`), pour lire le jeton d'invitation |
| `THEME_NAME` | nom du thème à activer (défaut `attibling`) |
| `GHOST_URL` | `http://localhost:2368` par défaut, `localhost` / `127.0.0.1` seulement |

## Dépannage

| Symptôme | Que faire |
|---|---|
| `Erreur : Le dossier de travail … est dans le dépôt` ou `… sous le dossier temporaire` | Choisissez un autre `GEEKLY_DEMO_DIR`, par exemple `~/ghost-geekly` |
| `Ghost est déjà installé mais …/credentials.json est introuvable` | La base existe sans identifiants : « Repartir de zéro » |
| Le seed échoue sur `connect ECONNREFUSED` | Ghost n'est pas démarré, ou pas encore prêt (attendez « Ghost booted ») |
| `Activation du thème … refusée` | Chemin sans Docker : lancez `npm run demo:sync`, redémarrez Ghost, relancez le seed. Avec Docker : vérifiez que le dépôt est bien monté |
| Le port 2368 est occupé | Un autre Ghost tourne (`npm run demo:stop`, ou `docker compose -f src/docker-compose.yml down`) |
| `Image absente` ou `Pas d'images dans …` | Lancez `npm run demo:images` (avec le même `GEEKLY_DEMO_DIR`) |
| `numpy et Pillow sont requis` | Créez le venv de « Les images » |
| L'installation de `sqlite3` échoue | macOS : `xcode-select --install` ; Linux : `build-essential` et `python3` |
| Les textes des images sont minuscules | Aucune police trouvée par Pillow ; installez Pillow ≥ 10.1 (police intégrée à taille réglable) |

## Contenu du dossier

```
src/demo/
├── README.md          ce document
├── env.sh             (sourcé par les scripts) trouve le dépôt et le dossier de travail, refuse les mauvais emplacements
├── install.sh         chemin B : ghost-cli, Ghost 6.78.0, clés de sécurité, copie du thème
├── start.sh           chemin B : démarre Ghost au premier plan (TMPDIR protégé)
├── stop.sh            chemin B : arrête Ghost
├── sync-theme.sh      chemin B : recopie le thème (fichiers du dépôt + assets construits) dans le dossier de travail
├── images.sh          lance gen-images.py (venv du dossier de travail si présent)
├── gen-images.py      génère les 54 images (Python 3, numpy, Pillow)
├── no-root-check.cjs  option pour conteneurs jetables en root (GEEKLY_DEMO_ALLOW_ROOT=1)
├── seed.mjs           le seed idempotent
└── lib/
    ├── api.mjs        client de l'API d'administration (localhost seulement)
    ├── bootstrap.mjs  propriétaire, intégration, identifiants (600)
    ├── workdir.mjs    dossier de travail et vérification (dépôt, os.tmpdir())
    ├── links.mjs      garde « aucun lien externe »
    ├── safety.mjs     configuration de sécurité de Ghost (et sa fusion)
    ├── theme.mjs      copie du thème et lien symbolique, avec refus des liens dangereux
    ├── invite.mjs     jeton d'invitation du 2ᵉ auteur (SQLite local ou docker exec)
    ├── content.mjs    les données : site, tags, auteurs, articles, pages
    ├── compose.mjs    assemblage du corps des articles ; prose.mjs : phrases inventées
```

Les tests (`src/tests/demo.test.js`) couvrent la garde des liens, la vérification du dossier de travail, la configuration
de sécurité, le contenu du seed, la copie du thème, l'exclusion du zip et l'absence d'identifiants ou d'images dans le dépôt.
