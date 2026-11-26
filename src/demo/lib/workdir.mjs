// Where the demo keeps its machine state, and the check that this place is safe.
//
// Everything the demo creates (the Ghost install, the database, the credentials, the generated images,
// the copy of the theme Ghost serves) lives in ONE work directory OUTSIDE the repository:
//   $GEEKLY_DEMO_DIR, default ~/ghost-geekly
//
// Why it must not be inside the repository or under os.tmpdir(): gscan, which Ghost runs when it activates a
// theme, treats a theme directory under os.tmpdir() as a throw-away unzip and deletes .git, node_modules,
// CLAUDE.md, AGENTS.md, .claude... from it, even through a symlink. A work directory inside the repository
// would also put the Ghost install (and its credentials) in your checkout.
//
// Run as a script (`node src/demo/lib/workdir.mjs`) it prints the resolved directory, or explains on stderr
// and exits with 1: the shell scripts use it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DIR_NAME = "ghost-geekly";
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Real path of the deepest existing ancestor, followed by the part that does not exist yet. */
export function realish(target) {
	const missing = [];
	let current = path.resolve(target);
	for (;;) {
		try {
			return path.join(fs.realpathSync(current), ...missing);
		} catch {
			const parent = path.dirname(current);
			if (parent === current) return path.resolve(target);
			missing.unshift(path.basename(current));
			current = parent;
		}
	}
}

/** True when `child` is `parent` or lies inside it (lexically; resolve symlinks first). */
export function isInside(child, parent) {
	const rel = path.relative(parent, child);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Throws a French error when `dir` is not a safe place for the demo; returns its real path otherwise. */
export function assertSafeDir(
	dir,
	{ repoRoot = REPO_ROOT, tmpDir = os.tmpdir(), label = "Le dossier de travail" } = {},
) {
	const resolved = path.resolve(dir);
	const real = realish(resolved);
	const repos = [...new Set([path.resolve(repoRoot), realish(repoRoot)])];
	const tmps = [...new Set([path.resolve(tmpDir), realish(tmpDir)])];
	for (const candidate of new Set([resolved, real])) {
		for (const repo of repos) {
			if (isInside(candidate, repo)) {
				throw new Error(
					`${label} (${resolved}) est dans le dépôt (${repo}). Choisissez un dossier en dehors, par exemple ~/${DEFAULT_DIR_NAME} (variable GEEKLY_DEMO_DIR).`,
				);
			}
			if (isInside(repo, candidate)) {
				throw new Error(
					`${label} (${resolved}) contient le dépôt (${repo}). Choisissez un dossier qui n'est pas un parent du dépôt (variable GEEKLY_DEMO_DIR).`,
				);
			}
		}
		for (const tmp of tmps) {
			if (isInside(candidate, tmp) || candidate.startsWith(tmp)) {
				throw new Error(
					`${label} (${resolved}) est sous le dossier temporaire du système (${tmp}). gscan, lancé par Ghost à l'activation du thème, y supprimerait .git, node_modules, CLAUDE.md... Choisissez un autre dossier (variable GEEKLY_DEMO_DIR).`,
				);
			}
		}
	}
	return real;
}

/**
 * The work directory from the environment (GEEKLY_DEMO_DIR, `~` expanded), checked. Returns its absolute
 * path (not yet created).
 */
export function resolveWorkDir({ env = process.env, home = os.homedir(), ...options } = {}) {
	const given = env.GEEKLY_DEMO_DIR && env.GEEKLY_DEMO_DIR.trim();
	let dir = given || path.join(home, DEFAULT_DIR_NAME);
	if (dir === "~" || dir.startsWith("~/")) dir = path.join(home, dir.slice(1));
	dir = path.resolve(dir);
	assertSafeDir(dir, options);
	return dir;
}

export const themeDir = work => path.join(work, "theme");
export const siteDir = work => path.join(work, "site");
export const credentialsFile = work => path.join(work, "credentials.json");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.stdout.write(`${resolveWorkDir()}\n`);
	} catch (error) {
		process.stderr.write(`Erreur : ${error.message}\n`);
		process.exit(1);
	}
}
