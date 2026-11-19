// Renders the theme's Handlebars templates outside Ghost, for the browser tests and for looking at
// pages locally. Ghost's helpers are stubbed with the behaviour the templates rely on; {{#get}}
// queries an in-memory site (see site.js) with a small subset of Ghost's filter syntax.
//
// renderTemplate(name, options) returns the full HTML page (the template inside default.hbs).
// options:
//  - site: a site from site.js (posts, tags, authors, settings); default createSite()
//  - context: the template context (posts, post, tag, author, pagination...), merged over defaults
//  - contexts: Ghost's context names for {{#is}}, e.g. ["home"] or ["paged", "index"]
//  - member: null for a visitor, an object for a signed-in member
//  - custom: @custom theme settings
//  - locale: @site.locale (default "en"); "fr" translates {{t}} with locales/fr.json
//  - assetBase: prefix of {{asset}} URLs (default "/assets/")
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { createSite } from "./site.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

const listTemplates = dir =>
	fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
		const rel = path.join(dir, entry.name);
		if (entry.isDirectory()) return listTemplates(rel);
		return entry.name.endsWith(".hbs") ? [rel] : [];
	});

// --- Ghost's filter syntax (the subset the theme uses) ---------------------------------------
// Conditions joined by "+" (and) or "," (or, lower precedence); key:value, key:-value (not),
// key:[a,b] (in), key:-[a,b] (not in), key:>value, key:<value.
const splitTop = (text, sep) => {
	const parts = [];
	let depth = 0;
	let current = "";
	for (const char of text) {
		if (char === "[") depth++;
		if (char === "]") depth--;
		if (char === sep && depth === 0) {
			parts.push(current);
			current = "";
		} else current += char;
	}
	parts.push(current);
	return parts.map(p => p.trim()).filter(Boolean);
};

const fieldValues = (item, key) => {
	if (key === "tag" || key === "tags") return (item.tags || []).map(t => t.slug);
	if (key === "tags.slug") return (item.tags || []).map(t => t.slug);
	if (key === "primary_tag") return item.primary_tag ? [item.primary_tag.slug] : [];
	if (key === "author" || key === "authors") return (item.authors || []).map(a => a.slug);
	const value = key.split(".").reduce((o, k) => (o == null ? o : o[k]), item);
	return [value];
};

const literal = value => {
	const v = value.replace(/^'|'$/g, "");
	if (v === "true") return true;
	if (v === "false") return false;
	if (v === "null") return null;
	return v;
};

const matches = (item, filter) => {
	if (!filter) return true;
	return splitTop(filter, ",").some(group =>
		splitTop(group, "+").every(cond => {
			const [, key, raw] = cond.match(/^([\w.]+):(.*)$/);
			let value = raw;
			let negate = false;
			if (value.startsWith("-")) {
				negate = true;
				value = value.slice(1);
			}
			const values = fieldValues(item, key);
			let ok;
			if (value.startsWith("[")) {
				const list = value
					.slice(1, -1)
					.split(",")
					.map(s => literal(s.trim()));
				ok = values.some(v => list.includes(v));
			} else if (value.startsWith(">")) ok = values.some(v => v > literal(value.slice(1)));
			else if (value.startsWith("<")) ok = values.some(v => v < literal(value.slice(1)));
			else ok = values.some(v => v === literal(value) || String(v) === String(literal(value)));
			return negate ? !ok : ok;
		}),
	);
};

const sortBy = (items, order) => {
	if (!order) return items;
	const [key, dir = "asc"] = order.trim().split(/\s+/);
	const get = item => key.split(".").reduce((o, k) => (o == null ? o : o[k]), item);
	return [...items].sort((a, b) => {
		const x = get(a);
		const y = get(b);
		const r = x < y ? -1 : x > y ? 1 : 0;
		return dir === "desc" ? -r : r;
	});
};

// --- Dates ------------------------------------------------------------------------------------
const formatDate = (value, format, locale) => {
	const date = new Date(value);
	const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
	const pad = n => String(n).padStart(2, "0");
	const tokens = {
		YYYY: String(date.getUTCFullYear()),
		MMMM: new Intl.DateTimeFormat(locale, { month: "long" }).format(date),
		MMM: month,
		MM: pad(date.getUTCMonth() + 1),
		DD: pad(date.getUTCDate()),
		D: String(date.getUTCDate()),
		HH: pad(date.getUTCHours()),
		mm: pad(date.getUTCMinutes()),
		ss: pad(date.getUTCSeconds()),
	};
	if (format === "ll") format = "D MMM YYYY";
	if (format === "LL") format = "D MMMM YYYY";
	return format.replace(/YYYY|MMMM|MMM|MM|DD|D|HH|mm|ss|Z/g, t => (t === "Z" ? "+00:00" : tokens[t]));
};

export const renderTemplate = (name, options = {}) => {
	const {
		site = createSite(),
		context = {},
		contexts = [name === "index" ? "home" : name],
		member = null,
		custom = {},
		locale = "en",
		assetBase = "/assets/",
	} = options;

	const H = Handlebars.create();
	const translations = locale === "en" ? {} : JSON.parse(read(`locales/${locale}.json`));
	const blocks = {};
	const safe = value => new H.SafeString(value);

	const settings = { ...site.settings, locale };
	const navItems = (items, current) =>
		(items || []).map(item => ({
			...item,
			slug: item.label
				.toLowerCase()
				.normalize("NFD")
				.replace(/[̀-ͯ]/g, "")
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, ""),
			current: item.url === current,
		}));

	H.registerHelper({
		asset: file => assetBase + file,
		t(key, opts) {
			let text = translations[key] ?? key;
			for (const [k, v] of Object.entries(opts?.hash || {})) text = text.replace(`{${k}}`, v);
			return text;
		},
		block: name => safe(blocks[name] || ""),
		contentFor(name, opts) {
			blocks[name] = (blocks[name] || "") + opts.fn(this);
			return "";
		},
		ghost_head: () => safe('<meta name="generator" content="Ghost 6.0">'),
		ghost_foot: () => "",
		body_class: () => `${contexts.includes("home") ? "home-template" : `${contexts[0]}-template`}`,
		meta_title: () => settings.title,
		post_class() {
			return ["post", this.featured ? "featured" : "", this.feature_image ? "" : "no-image"].filter(Boolean).join(" ");
		},
		date(...args) {
			const opts = args.pop();
			const value = args[0] ?? this.published_at ?? site.now;
			if (opts.hash.timeago) return "2 days ago";
			return formatDate(value, opts.hash.format || "ll", locale);
		},
		reading_time(opts) {
			const minutes = this.reading_time ?? 1;
			const one = opts.hash.minute ?? "1 min read";
			const many = opts.hash.minutes ?? "% min read";
			return minutes <= 1 ? one.replace("%", minutes) : many.replace("%", minutes);
		},
		img_url(image, opts) {
			if (!image) return "";
			const size = opts?.hash?.size;
			return size ? `${image}${image.includes("?") ? "&" : "?"}size=${size}` : image;
		},
		page_url: page => (page === 1 ? "/" : `/page/${page}/`),
		encode: value => encodeURIComponent(String(value)),
		url() {
			return this.url || "/";
		},
		excerpt(opts) {
			const text = this.custom_excerpt || this.excerpt || "";
			const words = opts?.hash?.words;
			return words ? text.split(/\s+/).slice(0, Number(words)).join(" ") : text;
		},
		content() {
			return safe(this.html || "<p>Body</p>");
		},
		comments: () => "",
		authors(opts) {
			const plain = opts?.hash?.autolink === "false" || opts?.hash?.autolink === false;
			return safe((this.authors || []).map(a => (plain ? a.name : `<a href="${a.url}">${a.name}</a>`)).join(", "));
		},
		tags(opts) {
			const from = (opts.hash.from || 1) - 1;
			const list = (this.tags || []).filter(t => t.visibility !== "internal").slice(from, opts.hash.to || undefined);
			return safe(list.map(t => `<a href="${t.url}">${t.name}</a>`).join(opts.hash.separator ?? ", "));
		},
		plural(count, opts) {
			const n = Number(count) || 0;
			if (n === 0) return opts.hash.empty.replace("%", n);
			return (n === 1 ? opts.hash.singular : opts.hash.plural).replace("%", n);
		},
		social_url(opts) {
			const type = opts.hash.type;
			const handle = this[type] || settings[type];
			const prefixes = { twitter: "https://x.com/", facebook: "https://www.facebook.com/" };
			return handle ? (prefixes[type] || `https://${type}.example/`) + String(handle).replace(/^@/, "") : "";
		},
		navigation(opts) {
			const secondary = opts.hash.type === "secondary";
			const items = navItems(secondary ? settings.secondary_navigation : settings.navigation, options.currentUrl);
			return safe(H.partials.navigation({ navigation: items, isSecondary: secondary }, { data: opts.data }));
		},
		pagination(opts) {
			return safe(H.partials.pagination(opts.data.root.pagination || {}, { data: opts.data }));
		},
		post(opts) {
			return opts.fn(this.post || this);
		},
		author(opts) {
			return opts.fn(this.author || this);
		},
		tag(opts) {
			return opts.fn(this.tag || this);
		},
		foreach(items, opts) {
			let list = Array.isArray(items) ? items : Object.values(items || {});
			// Like Ghost: items other than posts (tags, authors) are filtered by visibility, "public"
			// unless visibility="internal" | "all" is given
			const isPost = item => item && typeof item === "object" && "title" in item && "published_at" in item;
			const visibility = opts.hash.visibility || (list.length && isPost(list[0]) ? "all" : "public");
			if (visibility !== "all") {
				const wanted = visibility.split(",").map(v => v.trim());
				list = list.filter(item => !item || item.visibility === undefined || wanted.includes(item.visibility));
			}
			const from = (opts.hash.from || 1) - 1;
			const to = opts.hash.to || (opts.hash.limit ? from + Number(opts.hash.limit) : list.length);
			const slice = list.slice(from, to);
			if (!slice.length) return opts.inverse(this);
			return slice
				.map((item, i) =>
					opts.fn(item, {
						data: {
							...opts.data,
							index: i,
							number: i + 1,
							first: i === 0,
							last: i === slice.length - 1,
							odd: i % 2 === 1,
							even: i % 2 === 0,
						},
						blockParams: [item, i],
					}),
				)
				.join("");
		},
		get(resource, opts) {
			const { order, limit = 15, page = 1 } = opts.hash;
			// Like Ghost ("filter.match is not a function"), a filter must be a plain string: build it
			// with {{path}} inside the string, never with a subexpression such as (concat ...)
			if (opts.hash.filter !== undefined && typeof opts.hash.filter !== "string") {
				throw new Error("{{#get}} filter must be a string, not a subexpression result");
			}
			// Ghost resolves {{path}} inside the filter against the current context (and @data)
			const filter = (opts.hash.filter || "").replace(/\{\{(.*?)\}\}/g, (match, p) => {
				const source = p.startsWith("@") ? opts.data : this;
				const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
				// "tags[*].slug": a field of every item of a list, as Ghost's path queries
				const [list, field] = p.replace(/^@/, "").split("[*].");
				const value = field ? (get(source, list) || []).map(item => get(item, field)) : get(source, list);
				return Array.isArray(value) ? value.map(v => v.slug ?? v).join(",") : (value ?? "");
			});
			const defaults = { posts: "published_at desc", tags: null, authors: null };
			let items = (site[resource] || []).filter(item => matches(item, filter));
			items = sortBy(items, order || defaults[resource]);
			const total = items.length;
			const size = limit === "all" ? 100 : Math.min(Number(limit), 100);
			items = items.slice((page - 1) * size, page * size);
			const meta = { pagination: { page: Number(page), limit: size, pages: Math.ceil(total / size), total } };
			const result = { [resource]: items, meta };
			if (!items.length) return opts.inverse(this, { data: opts.data });
			return opts.fn(result, { data: opts.data, blockParams: [items, meta.pagination] });
		},
		is(names, opts) {
			const wanted = names.split(",").map(n => n.trim());
			return wanted.some(n => contexts.includes(n)) ? opts.fn(this) : opts.inverse(this);
		},
		has(opts) {
			const { tag, any, author, number, index } = opts.hash;
			let ok = false;
			if (tag) {
				const names = tag.split(",").map(n => n.trim().toLowerCase());
				ok = (this.tags || []).some(t => names.includes(t.name.toLowerCase()));
			} else if (any) {
				ok = any
					.split(",")
					.map(k => k.trim())
					.some(k => (k.startsWith("@") ? opts.data[k.slice(1)] : this[k]));
			} else if (author) {
				const count = (this.authors || []).length;
				const m = author.match(/^count:(>|<)?(\d+)$/);
				ok = m ? (m[1] === ">" ? count > m[2] : m[1] === "<" ? count < m[2] : count === Number(m[2])) : false;
			} else if (number || index) {
				const n = number ? opts.data.number : opts.data.index;
				ok = String(number || index)
					.split(",")
					.map(Number)
					.includes(n);
			}
			return ok ? opts.fn(this) : opts.inverse(this);
		},
		match(...args) {
			const opts = args.pop();
			let result;
			if (args.length === 1) result = Boolean(args[0]);
			else if (args.length === 2) result = args[0] == args[1];
			else {
				const [left, op, right] = args;
				const ops = {
					"=": () => left == right,
					"!=": () => left != right,
					"<": () => Number(left) < Number(right),
					">": () => Number(left) > Number(right),
					"<=": () => Number(left) <= Number(right),
					">=": () => Number(left) >= Number(right),
					"~": () => String(left).includes(right),
					"~^": () => String(left).startsWith(right),
					"~$": () => String(left).endsWith(right),
				};
				result = ops[op]();
			}
			if (!opts.fn) return result;
			return result ? opts.fn(this) : opts.inverse(this);
		},
		// Ghost's concat returns a SafeString, which {{#get}} cannot take as a filter (see get below)
		concat: (...args) => safe(args.slice(0, -1).join("")),
		helperMissing(...args) {
			const opts = args.pop();
			// A missing property ({{feature_image_alt}} on a post without one) renders nothing, as in Ghost
			if (!args.length && !Object.keys(opts.hash || {}).length) return "";
			throw new Error(`Missing Ghost helper stub: ${opts.name}`);
		},
	});

	for (const file of listTemplates("partials")) {
		H.registerPartial(
			path
				.relative("partials", file)
				.replace(/\.hbs$/, "")
				.split(path.sep)
				.join("/"),
			read(file),
		);
	}
	for (const [partial, source] of Object.entries(H.partials)) {
		if (typeof source === "string") H.partials[partial] = H.compile(source);
	}

	const data = {
		site: settings,
		custom,
		member,
		page: options.page || {},
	};
	const root = { ...context };
	const body = H.compile(read(`${name}.hbs`))(root, { data });
	return H.compile(read("default.hbs"))({ ...root, body: safe(body) }, { data });
};
