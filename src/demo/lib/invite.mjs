// Ghost has no API to create a staff user without an invitation, and the invitation e-mail is never sent
// (mail transport "stub"). So the seed reads the invitation token straight from the demo database, which only
// ever holds invented data, and accepts the invitation itself.
//   - install without Docker: SQLite file of $GEEKLY_DEMO_DIR/site, read with the better-sqlite3 module that
//     Ghost ships;
//   - Docker: the same query run inside the container (`docker exec`, container name from compose: "ghost").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { siteDir } from "./workdir.mjs";

const QUERY = "select token from invites where email = ?";

function fromLocalSite(work, email) {
	const site = siteDir(work);
	const config = JSON.parse(fs.readFileSync(path.join(site, "config.development.json"), "utf8"));
	const file = path.resolve(site, config.database.connection.filename);
	const Database = createRequire(path.join(site, "current", "package.json"))("better-sqlite3");
	const db = new Database(file, { readonly: true });
	try {
		return db.prepare(QUERY).get(email)?.token;
	} finally {
		db.close();
	}
}

function fromDocker(email, container) {
	const script = `const D=require("better-sqlite3");const db=new D("/var/lib/ghost/content/data/ghost.db",{readonly:true});const r=db.prepare(${JSON.stringify(QUERY)}).get(process.argv[1]);process.stdout.write(r?r.token:"")`;
	return execFileSync("docker", ["exec", "-w", "/var/lib/ghost/current", container, "node", "-e", script, email], {
		encoding: "utf8",
	});
}

/** The (base64) invitation token of `email`, or throws. */
export function inviteToken(work, email, { container = process.env.GEEKLY_DEMO_CONTAINER || "ghost" } = {}) {
	const local = fs.existsSync(path.join(siteDir(work), "current", "package.json"));
	const token = local ? fromLocalSite(work, email) : fromDocker(email, container);
	if (!token) throw new Error(`Aucune invitation en attente pour ${email} dans la base de démonstration.`);
	return token;
}
