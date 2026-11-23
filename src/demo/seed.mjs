#!/usr/bin/env node
// Idempotent seed for the local Ghost (http://localhost:2368, must be running).
// Usage: node src/demo/seed.mjs [--images <folder>]      (npm run demo:seed)
// - creates owner + Admin API integration on a fresh DB (credentials.json in the work directory)
// - deletes Ghost's default fixtures (never edits/publishes them)
// - uploads the locally generated images (npm run demo:images first), creates tags/authors/posts/pages
// - sets site settings, navigation, theme settings; activates the theme
// Re-running updates in place (matched by slug); nothing is duplicated.
// All state (credentials, seed-state.json, images) is in $GEEKLY_DEMO_DIR (default ~/ghost-geekly).
import fs from "node:fs";
import path from "node:path";
import { bootstrap, staffSession, ROOT, writeCreds } from "./lib/bootstrap.mjs";
import { assertSafeDir } from "./lib/workdir.mjs";
import { assertNoExternal } from "./lib/links.mjs";
import { inviteToken } from "./lib/invite.mjs";
import * as C from "./lib/content.mjs";

const THEME = process.env.THEME_NAME || "attibling";
const imagesFlag = process.argv.indexOf("--images");
if (imagesFlag !== -1 && !process.argv[imagesFlag + 1]) throw new Error("--images demande un dossier");
const IMG_DIR = imagesFlag === -1 ? path.join(ROOT, "images") : path.resolve(process.argv[imagesFlag + 1]);
if (imagesFlag !== -1) assertSafeDir(IMG_DIR, { label: "Le dossier d'images" });
const STATE_FILE = path.join(ROOT, "seed-state.json");
const manifestFile = path.join(IMG_DIR, "manifest.json");
if (!fs.existsSync(manifestFile))
	throw new Error(`Pas d'images dans ${IMG_DIR} : lancez d'abord « npm run demo:images ».`);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : { images: {} };
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
const log = (...a) => console.log(...a);

const { admin, creds } = await bootstrap();
const staff = await staffSession(creds);

// ------------------------------------------------------------ images
async function image(name) {
	if (!name) return null;
	const cached = state.images[name];
	if (cached) {
		const r = await fetch(cached, { method: "HEAD" }).catch(() => null);
		if (r?.ok) return cached;
	}
	const file = path.join(IMG_DIR, name);
	if (!fs.existsSync(file)) throw new Error(`Image absente : ${file}. Relancez « npm run demo:images ».`);
	const url = await admin.uploadImage(file);
	state.images[name] = url;
	saveState();
	log("  uploaded", name);
	return url;
}

// ------------------------------------------------------------ 1. remove default fixtures
log("fixtures");
for (const p of await admin.all("posts", "status=all")) {
	if (p.slug === "coming-soon" || p.slug.startsWith("probe")) {
		await admin.del(`posts/${p.id}/`);
		log("  deleted post", p.slug);
	}
}
for (const p of await admin.all("pages", "status=all")) {
	if (p.slug === "about") {
		await admin.del(`pages/${p.id}/`);
		log("  deleted page", p.slug);
	}
}
for (const t of await admin.all("tags")) {
	if (t.slug === "news") {
		await admin.del(`tags/${t.id}/`);
		log("  deleted tag", t.slug);
	}
}

// ------------------------------------------------------------ 2. site settings (staff session)
log("settings");
const logo = await image("logo-dark-text.png");
const logoLight = await image("logo-light-text.png");
const icon = await image("icon.png");
const cover = await image("cover.jpg");
const settings = [
	["title", C.SITE.title],
	["description", C.SITE.description],
	["locale", C.SITE.locale],
	["timezone", C.SITE.timezone],
	["accent_color", C.SITE.accent_color],
	["logo", logo],
	["icon", icon],
	["cover_image", cover],
	["facebook", null],
	["twitter", null],
	["navigation", JSON.stringify(C.NAV_PRIMARY)],
	["secondary_navigation", JSON.stringify(C.NAV_SECONDARY)],
	// privacy / no outbound: see README
	["email_track_opens", false],
	["email_track_clicks", false],
	["members_track_sources", false],
	["outbound_link_tagging", false],
	["explore_ping", false],
	["social_web", false],
	["unsplash", false],
];
for (const [key, value] of settings) {
	try {
		await staff.put("settings/", { settings: [{ key, value }] });
	} catch (e) {
		log(`  (setting ${key} not applied: ${String(e.message).slice(0, 120)})`);
	}
}

// ------------------------------------------------------------ 3. staff
log("authors");
const roles = (await admin.get("roles/?limit=all")).roles;
const authorRole = roles.find(r => r.name === "Author").id;
const users = await admin.all("users", "include=roles");
const userIdByKey = {};

async function ensureAuthor(key) {
	const a = C.AUTHORS[key];
	let u = users.find(x => x.email === a.email);
	if (!u) {
		// invite -> read the token from the demo database (no mail is ever sent: transport is "stub") -> accept
		const pending = (await staff.get("invites/?limit=all")).invites.find(i => i.email === a.email);
		if (!pending) await staff.post("invites/", { invites: [{ email: a.email, role_id: authorRole }] });
		const token = inviteToken(ROOT, a.email);
		creds.authors ??= {};
		creds.authors[key] = { email: a.email, password: creds.authors[key]?.password || cryptoPassword() };
		writeCreds(creds);
		await staff.post("authentication/invitation/", {
			invitation: [
				{
					token: token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
					email: a.email,
					name: a.name,
					password: creds.authors[key].password,
				},
			],
		});
		u = (await admin.all("users")).find(x => x.email === a.email);
		log("  created", a.name);
	}
	const patch = {
		id: u.id,
		name: a.name,
		slug: a.slug,
		bio: a.bio,
		location: a.location,
		profile_image: await image(a.profile_image),
		cover_image: await image(a.cover_image),
		updated_at: u.updated_at,
	};
	const r = await staff.put(`users/${u.id}/`, { users: [patch] });
	userIdByKey[key] = r.users[0].id;
}
function cryptoPassword() {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(15))).toString("base64url") + "9aZ!";
}
await ensureAuthor("alexis");
await ensureAuthor("lea");

// ------------------------------------------------------------ 4. tags
log("tags");
const existingTags = await admin.all("tags");
const tagId = {}; // key: slug (public) or name (internal)
for (const t of C.TAGS) {
	const body = { name: t.name, description: t.description, visibility: t.name.startsWith("#") ? "internal" : "public" };
	if (t.slug && !t.name.startsWith("#")) body.slug = t.slug;
	if (t.image) body.feature_image = await image(t.image);
	const found = existingTags.find(x => (t.slug ? x.slug === t.slug : x.name === t.name));
	const r = found
		? await admin.put(`tags/${found.id}/`, { tags: [{ ...body, updated_at: found.updated_at }] })
		: await admin.post("tags/", { tags: [body] });
	tagId[t.slug || t.name] = r.tags[0].id;
}

// ------------------------------------------------------------ 5. posts and pages
const dims = name => manifest[name];
async function resolveHtml(html, label) {
	const names = new Set([...html.matchAll(/\{\{img:([^}]+)\}\}/g)].map(m => m[1]));
	for (const n of names) {
		const url = await image(n);
		html = html
			.replaceAll(`{{img:${n}}}`, url)
			.replaceAll(`{{w:${n}}}`, dims(n).width)
			.replaceAll(`{{h:${n}}}`, dims(n).height);
	}
	assertNoExternal(label, html);
	return html;
}

async function upsert(kind, slug, body, existingList) {
	const found = existingList.find(x => x.slug === slug);
	const url = id => `${kind}/${id ? id + "/" : ""}?source=html`;
	if (found) {
		return (await admin.put(url(found.id), { [kind]: [{ ...body, updated_at: found.updated_at }] }))[kind][0];
	}
	return (await admin.post(url(), { [kind]: [body] }))[kind][0];
}

log("posts");
const existingPosts = await admin.all("posts", "status=all");
for (const p of C.POSTS) {
	const html = await resolveHtml(C.postHtml(p), p.slug);
	const body = {
		title: p.title,
		slug: p.slug,
		html,
		status: "published",
		published_at: p.date,
		custom_excerpt: p.excerpt,
		featured: !!p.featured,
		feature_image: await image(p.img),
		feature_image_alt: p.imgAlt || "",
		feature_image_caption: p.imgCaption || null,
		tags: p.tags.map(t => ({ id: tagId[t] })),
		authors: [p.author, p.coauthor].filter(Boolean).map(k => ({ id: userIdByKey[k] })),
		og_image: p.ogImg ? await image(p.ogImg) : null,
		twitter_image: p.twImg ? await image(p.twImg) : null,
	};
	assertNoExternal(p.slug + " excerpt", p.excerpt);
	await upsert("posts", p.slug, body, existingPosts);
	log("  ", p.slug);
}

log("pages");
const existingPages = await admin.all("pages", "status=all");
for (const pg of C.PAGES) {
	const html = await resolveHtml(pg.html || "", pg.slug);
	const body = {
		title: pg.title,
		slug: pg.slug,
		html: html || "<p></p>",
		status: "published",
		custom_excerpt: pg.excerpt || null,
		authors: [{ id: userIdByKey.alexis }],
	};
	if (!pg.html) delete body.html;
	await upsert("pages", pg.slug, body, existingPages);
	log("  ", pg.slug);
}

// ------------------------------------------------------------ 6. theme
log("theme");
const act = await admin.raw("PUT", `themes/${THEME}/activate/`);
if (act.status >= 400) {
	throw new Error(
		`Activation du thème « ${THEME} » refusée (${act.status}) : ${JSON.stringify(act.data).slice(0, 400)}\n` +
			"Le thème est-il synchronisé (npm run demo:sync) et Ghost redémarré depuis ? Voir src/demo/README.md.",
	);
}
{
	const w = act.data.themes?.[0]?.warnings || [],
		e = act.data.themes?.[0]?.errors || [];
	log(`  activated ${THEME} (gscan: ${e.length} errors, ${w.length} warnings)`);
	const cur = (await staff.get("custom_theme_settings/")).custom_theme_settings;
	const values = { ...C.THEME_SETTINGS, dark_mode_logo: logoLight };
	const out = cur.filter(s => s.key in values).map(s => ({ ...s, value: values[s.key] }));
	await staff.put("custom_theme_settings/", { custom_theme_settings: out.map(({ key, value }) => ({ key, value })) });
	log("  theme settings:", out.map(s => s.key).join(", "));
}
log("done");
