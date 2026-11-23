// Minimal Ghost Admin API client (Node >= 20, no dependencies). Talks to http://localhost:2368 only.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.GHOST_URL || "http://localhost:2368";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) {
	throw new Error(`Refusing to talk to ${BASE}: this seed only targets the local instance`);
}

const b64url = b => Buffer.from(b).toString("base64url");

export function adminToken(key) {
	const [id, secret] = key.split(":");
	const now = Math.floor(Date.now() / 1000);
	const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
	const body = b64url(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
	const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${body}`).digest("base64url");
	return `${head}.${body}.${sig}`;
}

export class Admin {
	constructor({ key, cookie } = {}) {
		this.key = key;
		this.cookie = cookie;
	}
	headers(extra = {}) {
		const h = { Origin: BASE, ...extra };
		if (this.key) h.Authorization = `Ghost ${adminToken(this.key)}`;
		if (this.cookie) h.Cookie = this.cookie;
		return h;
	}
	async raw(method, url, { json, form, headers } = {}) {
		const opts = { method, headers: this.headers(headers) };
		if (json !== undefined) {
			opts.body = JSON.stringify(json);
			opts.headers["Content-Type"] = "application/json";
		}
		if (form) opts.body = form;
		const res = await fetch(`${BASE}/ghost/api/admin/${url.replace(/^\//, "")}`, opts);
		const text = await res.text();
		let data = null;
		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			data = text;
		}
		return { status: res.status, data, headers: res.headers };
	}
	async call(method, url, opts) {
		const r = await this.raw(method, url, opts);
		if (r.status >= 400) {
			throw new Error(`${method} ${url} -> ${r.status} ${JSON.stringify(r.data).slice(0, 800)}`);
		}
		return r.data;
	}
	get(url) {
		return this.call("GET", url);
	}
	post(url, json) {
		return this.call("POST", url, { json });
	}
	put(url, json) {
		return this.call("PUT", url, { json });
	}
	del(url) {
		return this.call("DELETE", url);
	}

	/** Upload a local file through the Admin API so Ghost builds its responsive sizes. */
	async uploadImage(file, { purpose = "image" } = {}) {
		const buf = fs.readFileSync(file);
		const ext = path.extname(file).toLowerCase();
		const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
		const form = new FormData();
		form.append("file", new Blob([buf], { type }), path.basename(file));
		form.append("purpose", purpose);
		form.append("ref", path.basename(file));
		const d = await this.call("POST", "images/upload/", { form });
		return d.images[0].url;
	}

	/** Paginate through a browse endpoint. */
	async all(resource, params = "") {
		const out = [];
		for (let page = 1; ; page++) {
			const d = await this.get(`${resource}/?limit=100&page=${page}${params ? "&" + params : ""}`);
			const key = Object.keys(d).find(k => k !== "meta");
			out.push(...d[key]);
			if (!d.meta?.pagination?.next) break;
		}
		return out;
	}
}
