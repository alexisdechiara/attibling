// The theme Ghost serves in the install without Docker: a disposable COPY in $GEEKLY_DEMO_DIR/theme, which
// site/content/themes/attibling points to. Ghost is never pointed at the repository itself (see workdir.mjs:
// gscan deletes files from a theme directory under os.tmpdir(), through symlinks too).
//
//   node src/demo/lib/theme.mjs sync [<checkout>]   refresh the copy (default: this repository)
//   node src/demo/lib/theme.mjs link                create / check the symlink in the Ghost install
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeDir, isInside, realish, resolveWorkDir, REPO_ROOT, siteDir, themeDir } from "./workdir.mjs";

export const THEME_NAME = "attibling";

// What the zip leaves out (see the `zip` script of package.json), plus what must never be in a theme.
const EXCLUDED_TOP = new Set([
	"src",
	"docs",
	"node_modules",
	"README.md",
	"PRODUCT.md",
	"CLAUDE.md",
	"AGENTS.md",
	"GLOSSARY.md",
	"package-lock.json",
	"vite.config.mjs",
	"attibling.zip",
]);

/** Which of the repository's files make up the theme (same exclusions as `npm run zip`). */
export function themeFiles(files) {
	return files.filter(file => {
		const parts = file.split("/");
		if (parts.some(part => part.startsWith("."))) return false;
		return !EXCLUDED_TOP.has(parts[0]);
	});
}

function listFiles(src) {
	const git = execFileSync("git", ["-C", src, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	const files = new Set(git.split("\0").filter(Boolean));
	// The built files, whatever git thinks of them (they are committed, but a fresh build may add new chunks).
	const walk = dir => {
		for (const entry of fs.readdirSync(path.join(src, dir), { withFileTypes: true })) {
			const rel = `${dir}/${entry.name}`;
			if (entry.isDirectory()) walk(rel);
			else files.add(rel);
		}
	};
	if (fs.existsSync(path.join(src, "assets"))) walk("assets");
	files.add("partials/tags/prepaint.hbs");
	return [...files].filter(file => fs.existsSync(path.join(src, file)) && fs.statSync(path.join(src, file)).isFile());
}

/** Empties `work/theme` and copies the theme files of `src` into it. Returns the number of files. */
export function syncTheme({ src = REPO_ROOT, work = resolveWorkDir(), tmpDir } = {}) {
	const dest = themeDir(work);
	assertSafeDir(dest, { label: "Le dossier du thème", ...(tmpDir && { tmpDir }) });
	const source = fs.realpathSync(path.resolve(src));
	if (isInside(source, dest) || isInside(dest, source))
		throw new Error("La source et la copie du thème se recouvrent.");
	if (!fs.existsSync(path.join(source, "package.json")))
		throw new Error(`${source} n'est pas un thème (package.json absent).`);
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(dest)) fs.rmSync(path.join(dest, entry), { recursive: true, force: true });
	const files = themeFiles(listFiles(source));
	for (const file of files) {
		fs.mkdirSync(path.dirname(path.join(dest, file)), { recursive: true });
		fs.copyFileSync(path.join(source, file), path.join(dest, file));
	}
	return files.length;
}

/**
 * Makes site/content/themes/attibling a symlink to the copy; refuses a link that leads anywhere else
 * (in particular into the repository).
 */
export function ensureThemeLink({ work = resolveWorkDir(), repoRoot = REPO_ROOT } = {}) {
	const dest = themeDir(work);
	const themes = path.join(siteDir(work), "content", "themes");
	if (!fs.existsSync(themes)) throw new Error(`Ghost n'est pas installé dans ${siteDir(work)} (npm run demo:install).`);
	fs.mkdirSync(dest, { recursive: true });
	const link = path.join(themes, THEME_NAME);
	let stat = null;
	try {
		stat = fs.lstatSync(link);
	} catch {
		/* absent */
	}
	if (stat && !stat.isSymbolicLink())
		throw new Error(`${link} existe et n'est pas un lien : supprimez-le (c'est une copie).`);
	if (stat && path.resolve(path.dirname(link), fs.readlinkSync(link)) !== dest) {
		throw new Error(
			`${link} pointe vers ${fs.readlinkSync(link)}, pas vers ${dest}. Refus de démarrer : Ghost ne doit jamais servir un dossier que vous n'avez pas copié (voir src/demo/README.md, « Danger »).`,
		);
	}
	if (!stat) fs.symlinkSync(dest, link, "dir");
	if (isInside(realish(link), realish(repoRoot))) throw new Error(`${link} mène dans le dépôt : refus.`);
	return link;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [command, arg] = process.argv.slice(2);
		if (command === "sync") {
			const work = resolveWorkDir();
			const count = syncTheme({ src: arg || REPO_ROOT, work });
			process.stdout.write(`Thème copié dans ${themeDir(work)} (${count} fichiers).\n`);
			if (fs.existsSync(path.join(siteDir(work), "content", "themes"))) ensureThemeLink({ work });
			else
				process.stdout.write("Ghost n'est pas encore installé ici : le lien sera créé par « npm run demo:install ».\n");
		} else if (command === "link") {
			process.stdout.write(`${ensureThemeLink()}\n`);
		} else {
			throw new Error("usage : theme.mjs sync [<dossier>] | link");
		}
	} catch (error) {
		process.stderr.write(`Erreur : ${error.message}\n`);
		process.exit(1);
	}
}
