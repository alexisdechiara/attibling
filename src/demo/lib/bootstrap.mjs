// Create the owner (setup endpoint) and an integration (Admin API key) on a fresh DB.
// Credentials live in $GEEKLY_DEMO_DIR/credentials.json (chmod 600). Re-running is a no-op when they work.
import crypto from "node:crypto";
import fs from "node:fs";
import { Admin, BASE } from "./api.mjs";
import { credentialsFile, resolveWorkDir } from "./workdir.mjs";

// The work directory is checked here (never inside the repository, never under the system temp dir).
export const ROOT = resolveWorkDir();
export const CRED_FILE = credentialsFile(ROOT);
const INTEGRATION_NAME = "Seed (local)";

const readCreds = () => (fs.existsSync(CRED_FILE) ? JSON.parse(fs.readFileSync(CRED_FILE, "utf8")) : null);
export const writeCreds = c => {
	fs.mkdirSync(ROOT, { recursive: true });
	fs.writeFileSync(CRED_FILE, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
	fs.chmodSync(CRED_FILE, 0o600); // mode only applies when the file is created
};

async function login(email, password) {
	const res = await fetch(`${BASE}/ghost/api/admin/session/`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Origin: BASE },
		body: JSON.stringify({ username: email, password }),
	});
	if (res.status >= 400) throw new Error(`login failed: ${res.status} ${await res.text()}`);
	return res.headers
		.getSetCookie()
		.map(c => c.split(";")[0])
		.join("; ");
}

/** Admin client authenticated as the staff user (cookie session): needed for endpoints API keys cannot use
 *  (custom_theme_settings, ...). */
export async function staffSession(creds) {
	return new Admin({ cookie: await login(creds.staff.email, creds.staff.password) });
}

/** Returns an Admin client authenticated with the integration key (and the credentials object). */
export async function bootstrap() {
	const anon = new Admin();
	const setup = (await anon.get("authentication/setup/")).setup[0].status;
	let creds = readCreds();

	if (!setup) {
		const password = crypto.randomBytes(15).toString("base64url") + "9aZ!";
		const email = "alexis@geekly.test";
		await anon.post("authentication/setup/", {
			setup: [{ name: "Alexis Moreau", email, password, blogTitle: "GEEKLY" }],
		});
		creds = { url: BASE, staff: { email, password, name: "Alexis Moreau" } };
		writeCreds(creds);
		console.log("setup: owner created ->", CRED_FILE);
	} else if (!creds) {
		throw new Error(
			`Ghost est déjà installé mais ${CRED_FILE} est introuvable. Réinitialisez la base (src/demo/README.md, « Repartir de zéro ») puis relancez.`,
		);
	}

	// Does the stored Admin API key still work?
	if (creds.adminApiKey) {
		const a = new Admin({ key: creds.adminApiKey });
		const u = await a.raw("GET", "tags/?limit=1");
		if (u.status === 200) return { admin: a, creds };
		console.log("stored Admin API key rejected (", u.status, ") -> recreating");
	}

	const cookie = await login(creds.staff.email, creds.staff.password);
	const sess = new Admin({ cookie });
	const existing = (await sess.get("integrations/?limit=all")).integrations.find(i => i.name === INTEGRATION_NAME);
	if (existing) await sess.del(`integrations/${existing.id}/`);
	const { integrations } = await sess.post("integrations/?include=api_keys", {
		integrations: [{ name: INTEGRATION_NAME }],
	});
	const k = integrations[0].api_keys.find(x => x.type === "admin");
	creds.adminApiKey = k.secret.includes(":") ? k.secret : `${k.id}:${k.secret}`;
	creds.contentApiKey = integrations[0].api_keys.find(x => x.type === "content")?.secret;
	writeCreds(creds);
	console.log("integration created, Admin API key stored in", CRED_FILE);
	return { admin: new Admin({ key: creds.adminApiKey }), creds };
}
