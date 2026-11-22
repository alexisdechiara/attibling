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
const IMAGE_SIZES = JSON.parse(read("package.json")).config.image_sizes;
// Ghost 6.78's comments-ui (core/shared/config/defaults.json: comments.url, version 1.6)
export const COMMENTS_UI = "https://cdn.jsdelivr.net/ghost/comments-ui@~1.6/umd/comments-ui.min.js";

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

const test = (values, raw) => {
	let value = raw;
	let negate = false;
	if (value.startsWith("-")) {
		negate = true;
		value = value.slice(1);
	}
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
};

// Ghost joins the tags table once per "+" group: with a tags.visibility condition, the tag
// conditions of the group (tags, tags.slug, tags.visibility) must all hold for one same tag
// (tags:[a,b]+tags.visibility:public = shares a public tag among a, b), as checked on Ghost 6.78.
const TAG_KEYS = /^(tag|tags|tags\.slug|tags\.visibility)$/;
const matches = (item, filter) => {
	if (!filter) return true;
	return splitTop(filter, ",").some(group => {
		const conds = splitTop(group, "+").map(cond => cond.match(/^([\w.]+):(.*)$/).slice(1));
		const joined = conds.some(([key]) => key === "tags.visibility");
		const own = joined ? conds.filter(([key]) => !TAG_KEYS.test(key)) : conds;
		const tagConds = joined ? conds.filter(([key]) => TAG_KEYS.test(key)) : [];
		return (
			own.every(([key, raw]) => test(fieldValues(item, key), raw)) &&
			(!joined ||
				(item.tags || []).some(tag =>
					tagConds.every(([key, raw]) =>
						test([key === "tags.visibility" ? tag.visibility || "public" : tag.slug], raw),
					),
				))
		);
	});
};

// The malformed filters @tryghost/nql-lang rejects that a theme can produce from settings or data
const validFilter = filter =>
	!filter ||
	splitTop(filter, ",").every(group =>
		splitTop(group, "+").every(cond => {
			const m = cond.match(/^([\w.]+):(-?)(.*)$/);
			if (!m) return false;
			const value = m[3];
			if (value.startsWith("[")) {
				if (!value.endsWith("]")) return false;
				const items = value.slice(1, -1).split(",");
				return items.every(item => /^\s*('[^']*'|[^\s']+)\s*$/.test(item));
			}
			return /^[<>]?=?('[^']*'|[^\s']+)$/.test(value);
		}),
	);

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
// Ghost serialises dates with the site's time zone (@site.timezone, "Etc/UTC" by default) and its date
// helper formats them in that zone (moment.parseZone): a post published at 23:30 UTC on 12 December is
// dated 13 December on a Paris site. Moment's long formats differ by language (en: « December 13, 2025 »).
const formatDate = (value, format, locale, timeZone = "Etc/UTC") => {
	const date = new Date(value);
	const part = options =>
		Object.fromEntries(
			new Intl.DateTimeFormat(locale, { timeZone, ...options }).formatToParts(date).map(p => [p.type, p.value]),
		);
	const num = part({
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		hourCycle: "h23",
	});
	const pad = n => String(n).padStart(2, "0");
	const offset = (() => {
		const local = Date.UTC(+num.year, +num.month - 1, +num.day, +num.hour, +num.minute, +num.second);
		const minutes = Math.round((local - Math.floor(date.getTime() / 1000) * 1000) / 60000);
		const sign = minutes < 0 ? "-" : "+";
		return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
	})();
	const tokens = {
		YYYY: num.year,
		MMMM: part({ month: "long" }).month,
		MMM: part({ month: "short" }).month,
		MM: pad(num.month),
		DD: pad(num.day),
		D: String(+num.day),
		dddd: part({ weekday: "long" }).weekday,
		ddd: part({ weekday: "short" }).weekday,
		HH: pad(num.hour),
		mm: pad(num.minute),
		ss: pad(num.second),
		Z: offset,
	};
	const english = /^en\b/.test(locale);
	if (format === "ll") format = english ? "MMM D, YYYY" : "D MMM YYYY";
	if (format === "LL") format = english ? "MMMM D, YYYY" : "D MMMM YYYY";
	return format.replace(/YYYY|MMMM|MMM|MM|DD|dddd|ddd|D|HH|mm|ss|Z/g, t => tokens[t]);
};

// Every {{#get}} of the last renderTemplate call ({ resource, limit, page, filter }), to count the queries a
// page makes: getCalls() lists them, getCalls("tags", { limit: 5 }) keeps those matching
let gets = [];
export const getCalls = (resource, match = {}) =>
	gets.filter(
		call =>
			(!resource || call.resource === resource) &&
			Object.entries(match).every(([key, value]) => String(call[key]) === String(value)),
	);

export const renderTemplate = (name, options = {}) => {
	gets = [];
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
		// The site's footer code injection (Settings > Code injection), as Ghost prints it
		ghost_foot: () => safe(settings.codeinjection_foot || ""),
		body_class: () => `${contexts.includes("home") ? "home-template" : `${contexts[0]}-template`}`,
		meta_title: () => settings.title,
		post_class() {
			return ["post", this.featured ? "featured" : "", this.feature_image ? "" : "no-image"].filter(Boolean).join(" ");
		},
		date(...args) {
			const opts = args.pop();
			const value = args[0] ?? this.published_at ?? site.now;
			if (opts.hash.timeago) return "2 days ago";
			return formatDate(value, opts.hash.format || "ll", locale, opts.hash.timezone || settings.timezone);
		},
		// As Ghost 6: only for a post (own html, title and slug), and nothing without html nor reading_time
		reading_time(opts) {
			const isPost = ["html", "title", "slug"].every(k => Object.hasOwn(this, k));
			if (!isPost || (!this.html && !this.reading_time)) return "";
			const minutes = this.reading_time || 1;
			const one = typeof opts.hash.minute === "string" ? opts.hash.minute : "1 min read";
			const many = typeof opts.hash.minutes === "string" ? opts.hash.minutes : "% min read";
			return minutes <= 1 ? one : many.replace("%", minutes);
		},
		img_url(image, opts) {
			if (!image) return "";
			// A size missing from package.json's image_sizes gives the original image in Ghost: the same
			// here (no ?size= mark), so a misspelt size shows in the tests
			const size = IMAGE_SIZES[opts?.hash?.size] ? opts.hash.size : undefined;
			// An image stored by Ghost (/content/images/…): its resized rendition, at Ghost's own address
			// (/content/images/size/w1000/…, /size/w600/format/webp/… with a format, /size/w1400h304/… for a size with a height), which the hero's
			// veil (src/js/hero-veil.js) reads; the harness serves them from tests/fixtures/images
			if (size && image.startsWith("/content/images/")) {
				const fmt = opts?.hash?.format ? `format/${opts.hash.format}/` : "";
				const { width, height } = IMAGE_SIZES[size];
				return image.replace("/content/images/", `/content/images/size/w${width}${height ? `h${height}` : ""}/${fmt}`);
			}
			// format="webp" (Ghost: /size/wN/format/webp/…), written after the size
			const format = opts?.hash?.format ? `&format=${opts.hash.format}` : "";
			return size ? `${image}${image.includes("?") ? "&" : "?"}size=${size}${format}` : image;
		},
		// As Ghost 6 (getPaginatedUrl): relative to the listing being shown (/tag/actualites/page/2/)
		// (nothing without pagination in the page's data, nor for a page that is not a number)
		page_url(page, opts) {
			if (!opts) page = 1;
			const pagination = context.pagination;
			if (!pagination) return "";
			if (page === "next") page = pagination.next;
			else if (page === "prev") page = pagination.prev;
			if (typeof page !== "number" || !page) return "";
			const base = (context.tag?.url || context.author?.url || options.currentUrl || "/").replace(/page\/\d+\/$/, "");
			return page > 1 ? `${base}page/${page}/` : base;
		},
		encode: value => encodeURIComponent(String(value)),
		// absolute="true": the site's address in front, as Ghost does (navigation, share links)
		url(opts) {
			const url = this.url || "/";
			const absolute = String(opts?.hash?.absolute) === "true";
			return absolute && url.startsWith("/") ? settings.url.replace(/\/$/, "") + url : url;
		},
		// As Ghost 6 (excerpt.js): a custom excerpt is never cut (words= / characters= only cut the
		// automatic excerpt)
		excerpt(opts) {
			if (this.custom_excerpt) return String(this.custom_excerpt);
			const text = String(this.excerpt || "");
			const words = parseInt(opts?.hash?.words, 10);
			const characters = parseInt(opts?.hash?.characters, 10);
			if (words) return text.split(/\s+/).slice(0, words).join(" ");
			if (characters) return text.slice(0, characters);
			return text;
		},
		// Like Ghost (core/frontend/helpers/content.js): a post the reader may not read in full
		// (access === false) renders the theme's content-cta partial, the post as its context
		content(opts) {
			if (this.access !== undefined && !this.access) {
				if (!H.partials["content-cta"]) throw new Error("Ghost's default content-cta is not stubbed");
				return safe(H.partials["content-cta"]({ ...this, html: this.html ?? "" }, { data: opts.data }));
			}
			return safe(this.html || "<p>Body</p>");
		},
		// Like Ghost (helpers/tiers.js): the names of the post's tiers, "a, b and c tiers"
		tiers(opts) {
			const names = (this.tiers || []).map(tier => H.escapeExpression(tier.name));
			if (!names.length) return "";
			const { separator = ", ", lastSeparator = " and ", prefix = "" } = opts.hash;
			const suffix = opts.hash.suffix ?? (names.length === 1 ? " tier" : " tiers");
			const list = names.length === 1 ? names[0] : names.slice(0, -1).join(separator) + lastSeparator + names.at(-1);
			return safe(prefix + list + suffix);
		},
		// Like Ghost 6.78 (core/frontend/helpers/comments.js): nothing without a comment_id, when comments are
		// off or when the reader may not read the post (access); otherwise comments-ui's script tag with its
		// data attributes, written as Ghost writes them (values not escaped, title null when not given)
		comments(opts) {
			if (!this.comment_id) return "";
			if (!settings.comments_enabled || settings.comments_access === "off" || !this.access) return "";
			const mode = ["dark", "light"].includes(opts.hash.mode) ? opts.hash.mode : "auto";
			const saturation = parseInt(opts.hash.saturation, 10);
			const data = {
				locale: settings.locale || "en",
				"ghost-comments": settings.url.replace(/\/?$/, "/"),
				api: settings.url.replace(/\/?$/, "/") + "ghost/api/content/",
				admin: settings.url.replace(/\/?$/, "/") + "ghost/",
				key: "frontend-key",
				title: typeof opts.hash.title === "string" ? opts.hash.title : null,
				count: opts.hash.count !== false,
				"post-id": this.id,
				"color-scheme": mode,
				"avatar-saturation": isNaN(saturation) ? 60 : saturation,
				"accent-color": settings.accent_color || "",
				"comments-enabled": settings.comments_access || "all",
				publication: settings.title,
			};
			const attributes = Object.entries(data)
				.map(([key, value]) => `data-${key}="${value}"`)
				.join(" ");
			return safe(`
        <script defer src="${COMMENTS_UI}" ${attributes} crossorigin="anonymous"></script>
    `);
		},
		authors(opts) {
			const plain = opts?.hash?.autolink === "false" || opts?.hash?.autolink === false;
			return safe((this.authors || []).map(a => (plain ? a.name : `<a href="${a.url}">${a.name}</a>`)).join(", "));
		},
		tags(opts) {
			const from = (opts.hash.from || 1) - 1;
			const list = (this.tags || []).filter(t => t.visibility !== "internal").slice(from, opts.hash.to || undefined);
			return safe(list.map(t => `<a href="${t.url}">${t.name}</a>`).join(opts.hash.separator ?? ", "));
		},
		// As Ghost 6 (plural.js): the three forms are required; a missing or non-numeric count renders
		// nothing (a forgotten include="count.posts" shows up as an empty label, not « No posts »)
		plural(count, opts) {
			const { empty, singular, plural } = opts.hash;
			if ([empty, singular, plural].includes(undefined)) throw new Error("plural: empty, singular and plural");
			if (count === 0) return safe(empty.replace("%", count));
			if (count === 1) return safe(singular.replace("%", count));
			if (count >= 2) return safe(plural.replace("%", count));
			return "";
		},
		social_url(opts) {
			const type = opts.hash.type;
			const handle = this[type] || settings[type];
			const prefixes = {
				twitter: "https://x.com/",
				facebook: "https://www.facebook.com/",
				bluesky: "https://bsky.app/profile/",
			};
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
			// (@tryghost/helpers visibility.filter: an item without visibility counts as "public")
			const wanted = visibility.split(",").map(v => v.trim());
			if (!wanted.includes("all")) {
				list = list.filter(item => (item?.visibility ? wanted.includes(item.visibility) : wanted.includes("public")));
			}
			// As Ghost 6 (foreach.js): from/to are 1-based positions in the whole list, and @index /
			// @number keep that position (from="2": @number starts at 2); @even is Ghost's (index % 2 === 1);
			// {{else}} only for an empty list, not for a from past its end
			const length = list.length;
			const limit = parseInt(opts.hash.limit, 10) || length;
			const from = parseInt(opts.hash.from, 10) || 1;
			let to = parseInt(opts.hash.to, 10) || length;
			if (limit < length && from + limit <= length) to = from - 1 + limit;
			if (!length) return opts.inverse(this);
			let output = "";
			list.forEach((item, index) => {
				const position = index + 1;
				if (position < from || position > to) return;
				output += opts.fn(item, {
					data: {
						...opts.data,
						index,
						number: index + 1,
						first: index === from - 1,
						last: position === to,
						even: index % 2 === 1,
						odd: index % 2 !== 1,
					},
					blockParams: [item, index],
				});
			});
			return output;
		},
		get(resource, opts) {
			const { order, limit = 15, page = 1 } = opts.hash;
			gets.push({ resource, limit: String(limit), page: String(page), filter: opts.hash.filter || "" });
			// site.failGets = ["tags"]: those queries fail; Ghost's helper then renders {{else}} (and only then:
			// an empty result renders the block)
			if (site.failGets?.includes(resource)) return opts.inverse(this);
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
			// A filter Ghost's NQL parser refuses (an empty list or a trailing comma, from a theme setting
			// such as about_tags = "jeux-video,"; a space in a value) makes Ghost render {{else}} and log a
			// « Query Error »: the same here, so such a case shows in the tests instead of passing
			if (!validFilter(filter)) return opts.inverse(this);
			const defaults = { posts: "published_at desc", pages: "published_at desc", tags: null, authors: null };
			let items = (site[resource] || []).filter(item => matches(item, filter));
			items = sortBy(items, order || defaults[resource]);
			const total = items.length;
			const size = limit === "all" ? 100 : Math.min(Number(limit), 100);
			items = items.slice((page - 1) * size, page * size);
			// Like Ghost's Content API: fields="a,b" returns only those columns (posts_meta fields such as
			// og_image / twitter_image included, which are otherwise always present, null when unset)
			if (opts.hash.fields) {
				const keep = String(opts.hash.fields)
					.split(",")
					.map(f => f.trim());
				items = items.map(item => Object.fromEntries(Object.entries(item).filter(([k]) => keep.includes(k))));
			}
			const meta = { pagination: { page: Number(page), limit: size, pages: Math.ceil(total / size), total } };
			const result = { [resource]: items, meta };
			// Like Ghost (core/frontend/helpers/get.js, renderResponse): the block is rendered even when
			// nothing matches; {{else}} only renders when the request fails. Templates test the result
			// themselves ({{#if posts}}, or the block parameter).
			return opts.fn(result, { data: opts.data, blockParams: [items, meta.pagination] });
		},
		is(names, opts) {
			const wanted = names.split(",").map(n => n.trim());
			return wanted.some(n => contexts.includes(n)) ? opts.fn(this) : opts.inverse(this);
		},
		has(opts) {
			const { tag, any, author, number, index, visibility } = opts.hash;
			let ok = false;
			if (visibility) {
				// Like Ghost: the post's visibility is one of the given ones
				ok = visibility
					.split(",")
					.map(v => v.trim())
					.includes(this.visibility);
			} else if (tag) {
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
		// As Ghost 6 (core/frontend/helpers/match.js): strict comparisons, no type conversion (a number
		// never equals its string: {{#match pagination.total "1"}} is false); ~ only on strings; one
		// argument: truthy and not an empty list
		match(...args) {
			const opts = args.pop();
			const [left, op, right] = args.map(a =>
				a instanceof H.SafeString || a instanceof Handlebars.SafeString ? a.string : a,
			);
			let result;
			if (args.length === 1) result = !!left && !(Array.isArray(left) && !left.length);
			else if (args.length === 2) result = left === op;
			else {
				const str = v => typeof v === "string";
				const ops = {
					"!=": () => left !== right,
					"<": () => left < right,
					">": () => left > right,
					"<=": () => left <= right,
					">=": () => left >= right,
					"~": () => str(left) && str(right) && left.includes(right),
					"~^": () => str(left) && str(right) && left.startsWith(right),
					"~$": () => str(left) && str(right) && left.endsWith(right),
				};
				result = (ops[op] || (() => left === right))();
			}
			// Inline, Ghost returns a SafeString: an object, truthy for {{#if}} even when false
			if (!opts.fn) return new H.SafeString(result);
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
