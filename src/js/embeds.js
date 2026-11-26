// Third-party embeds on click (theme setting embed_consent; partials/embed-consent.hbs).
//
// The page's Content-Security-Policy (default.hbs) already stopped the browser from loading the
// frames and scripts of other sites that Ghost wrote in the post HTML: nothing was requested. Here each
// of those embeds becomes a facade in the theme's design (provider, title, a button, one line on what
// loading it means, « always show », a link to the provider). On the reader's request the embed is
// shown inside assets/html/embed.html, a page of the site without that policy: YouTube from
// youtube-nocookie.com (privacy-enhanced mode) with autoplay, an X post through X's own frame, the other
// frames as Ghost wrote them; any other embed that needs its provider's script runs in a sandbox (an
// origin of its own, cut off from the site). An HTML card (« /html » in the editor) that needs another
// site's script — a chart from Flourish, Infogram, Google Trends, StatCounter… — is such an embed too: the
// policy blocks its script, so without a facade the chart would just be missing. Shown without a click: what privacy/choices.js `embeds.allowed(id)` says — the
// service's own choice (« Toujours afficher », kept in localStorage "attibling-embeds", taken back under
// each embed it loaded or in the « Cookies et confidentialité » panel), else the answer for « Contenus
// intégrés » (setting consent_notice ≠ None), which each facade asks for itself: no consent notice for
// embeds. An answer or a choice made meanwhile loads the embeds it allows at once, without autoplay, and
// says so in the live region.
import { embeds as choices, consent, consentMode } from "./privacy/choices";

// The tallest a frame may make itself (its height comes from the provider's page, which could say
// anything): taller than a long post or thread on any provider (about 1,500 px), short enough that an
// embed cannot push the rest of the article out of reach. Taller content scrolls inside its frame.
const MAX_EMBED_HEIGHT = 4000;
// The frames that take the height their content announces: one listener for all of them, which forgets
// a frame once it has left the page
const fitting = new Set();
window.addEventListener("message", event => {
	for (const frame of fitting) {
		if (!frame.isConnected) fitting.delete(frame);
		else if (event.source === frame.contentWindow) {
			const height = boundedHeight(event.data?.attiblingEmbed?.height);
			if (height) frame.style.height = `${height}px`;
		}
	}
});

const boundedHeight = value =>
	typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.ceil(value), MAX_EMBED_HEIGHT) : 0;

// Known providers: host, kind of embed (the button says « video », « post » or « content »), the link
// to the content on the provider's site, and how the frame's address changes when it loads
export const PROVIDERS = [
	{
		id: "youtube",
		name: "YouTube",
		kind: "video",
		host: /(^|\.)(youtube(-nocookie)?\.com|youtu\.be)$/,
		load: url => {
			url.host = "www.youtube-nocookie.com";
			url.searchParams.delete("feature");
			return url;
		},
		link: url => {
			const id = url.pathname.split("/").pop();
			const list = url.searchParams.get("list");
			if (id === "videoseries" && list) return `https://www.youtube.com/playlist?list=${encodeURIComponent(list)}`;
			const watch = new URL("https://www.youtube.com/watch");
			watch.searchParams.set("v", id);
			if (url.searchParams.get("start")) watch.searchParams.set("t", url.searchParams.get("start"));
			if (list) watch.searchParams.set("list", list);
			return watch.href;
		},
	},
	{
		id: "vimeo",
		name: "Vimeo",
		kind: "video",
		host: /(^|\.)vimeo\.com$/,
		load: url => (url.searchParams.set("dnt", "1"), url),
		link: url => `https://vimeo.com/${url.pathname.split("/").pop()}`,
	},
	{
		id: "dailymotion",
		name: "Dailymotion",
		kind: "video",
		host: /(^|\.)(dailymotion\.com|dai\.ly)$/,
		link: url => `https://www.dailymotion.com/video/${url.searchParams.get("video") || url.pathname.split("/").pop()}`,
	},
	{ id: "twitch", name: "Twitch", kind: "video", host: /(^|\.)twitch\.tv$/ },
	{ id: "tiktok", name: "TikTok", kind: "video", host: /(^|\.)tiktok\.com$/ },
	{ id: "x", name: "X", kind: "post", host: /(^|\.)(twitter|x)\.com$/ },
	{ id: "instagram", name: "Instagram", kind: "post", host: /(^|\.)instagram\.com$/ },
	{ id: "facebook", name: "Facebook", kind: "post", host: /(^|\.)facebook\.(com|net)$/ },
	{ id: "bluesky", name: "Bluesky", kind: "post", host: /(^|\.)bsky\.app$/ },
	{ id: "reddit", name: "Reddit", kind: "post", host: /(^|\.)reddit(media)?\.com$/ },
	{ id: "threads", name: "Threads", kind: "post", host: /(^|\.)threads\.(net|com)$/ },
	{
		id: "spotify",
		name: "Spotify",
		kind: "content",
		host: /(^|\.)spotify\.com$/,
		link: url => `https://open.spotify.com${url.pathname.replace(/^\/embed(-podcast)?/, "")}`,
	},
	{
		id: "soundcloud",
		name: "SoundCloud",
		kind: "content",
		host: /(^|\.)soundcloud\.com$/,
		// The track's address from the frame's url= parameter, only if it is a SoundCloud web address
		link: url => {
			const track = parse(url.searchParams.get("url") || "");
			return track && /(^|\.)soundcloud\.com$/.test(track.hostname) ? track.href : "https://soundcloud.com/";
		},
	},
	{
		id: "codepen",
		name: "CodePen",
		kind: "content",
		host: /(^|\.)(codepen\.io|cdpn\.io)$/,
		link: url => url.href.replace(/\/embed\/(preview\/)?/, "/pen/"),
	},
	// Charts written in an HTML card with the provider's script. `page`: the chart's own address, from the
	// card's elements (« View on … »)
	{
		id: "flourish",
		name: "Flourish",
		kind: "content",
		host: /(^|\.)(flourish\.studio|flo\.uri\.sh)$/,
		page: elements => {
			const id = find(elements, "[data-src]")?.dataset.src.match(/^(visualisation|story)\/\d+/)?.[0];
			return id && `https://public.flourish.studio/${id}/`;
		},
	},
	{
		id: "infogram",
		name: "Infogram",
		kind: "content",
		host: /(^|\.)infogram\.com$/,
		page: elements => {
			const id = find(elements, ".infogram-embed[data-id]")?.dataset.id;
			return id && /^[\w-]+$/.test(id) && `https://e.infogram.com/${id}`;
		},
		// Infogram's page does not start in a sandbox (it needs its own origin): shown as a player, a frame
		// of Infogram's site, at a fixed height since only Infogram's loader knows the chart's
		player: elements => {
			const id = find(elements, ".infogram-embed[data-id]")?.dataset.id;
			return id && /^[\w-]+$/.test(id) && `https://e.infogram.com/${id}?src=embed`;
		},
	},
	{
		id: "google-trends",
		name: "Google Trends",
		kind: "content",
		host: /^trends\.google\.[a-z.]+$/,
		page: elements => {
			const query = elements
				.map(el => el.textContent)
				.join("")
				.match(/"exploreQuery":"([^"\\]+)"/)?.[1];
			return query && `https://trends.google.com/trends/explore?${query}`;
		},
	},
	{ id: "statcounter", name: "StatCounter", kind: "content", host: /(^|\.)statcounter\.com$/ },
];

// Permissions the player may need (Ghost's oEmbed frames ask for the same)
const ALLOW =
	"accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";

// The frame page of a scripted embed: scripts, links and forms work, but as an origin of its own
// (no "allow-same-origin"), so the provider's script cannot reach the site
const SANDBOX = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms";

const parse = value => {
	try {
		const url = new URL(value, location.href);
		return /^https?:$/.test(url.protocol) ? url : null;
	} catch {
		return null;
	}
};

const isThirdParty = value => {
	const url = parse(value);
	return !!url && url.origin !== location.origin;
};

const knownProvider = url => PROVIDERS.find(p => p.host.test(url.hostname));

const providerFor = url => {
	const known = knownProvider(url);
	if (known) return known;
	const host = url.hostname.replace(/^www\./, "");
	return { id: host, name: host, kind: "content" };
};

// The first element matching a selector among elements and their descendants
const find = (elements, selector) => {
	for (const el of elements) {
		const match = el.matches(selector) ? el : el.querySelector(selector);
		if (match) return match;
	}
	return null;
};

// The HTML cards of the content: Ghost writes each between two comments, without a wrapper
const htmlCards = root => {
	const cards = [];
	const comments = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
	while (comments.nextNode()) {
		if (comments.currentNode.data.trim() !== "kg-card-begin: html") continue;
		const nodes = [];
		let node = comments.currentNode.nextSibling;
		while (node && !(node.nodeType === 8 && node.data.trim() === "kg-card-end: html")) {
			nodes.push(node);
			node = node.nextSibling;
		}
		// Without its closing comment the card's end is unknown: left alone
		if (node && nodes.length) cards.push(nodes);
	}
	return cards;
};

// The addresses of other sites an inline script names (a loader it adds itself, the service it calls)
const namedIn = script =>
	(script.textContent.match(/https?:\/\/[^\s"'`\\<>)]+/g) || [])
		.map(parse)
		.filter(url => url && isThirdParty(url.href));

// A text an attribute holds, entities decoded (Infogram writes its title encoded twice)
const decoded = text => new DOMParser().parseFromString(text || "", "text/html").documentElement.textContent.trim();

// The width / height ratio of a frame, from its attributes (as helpers.js setEmbedRatios)
const ratioOf = frame => {
	const size = /^\d+(\.\d+)?(px)?$/;
	const width = frame?.getAttribute("width");
	const height = frame?.getAttribute("height");
	return size.test(width) && size.test(height) && parseFloat(height) > 0
		? `${parseFloat(width)} / ${parseFloat(height)}`
		: null;
};

// Every third-party embed of the page: { container, nodes (what is replaced), frame, scripts, provider,
// url (the frame's address or the content's link) }
const findEmbeds = root => {
	const embeds = [];
	const seen = new Set();
	root.querySelectorAll("figure.kg-embed-card").forEach(figure => {
		const frame = [...figure.querySelectorAll("iframe[src]")].find(f => isThirdParty(f.getAttribute("src")));
		const scripts = [...figure.querySelectorAll("script[src]")].filter(s => isThirdParty(s.getAttribute("src")));
		if (!frame && !scripts.length) return;
		const source = parse((frame || scripts[0]).getAttribute("src"));
		const nodes = [...figure.childNodes].filter(node => node.nodeName !== "FIGCAPTION");
		embeds.push({ container: figure, nodes, frame, scripts, provider: providerFor(source), source });
		figure.querySelectorAll("iframe").forEach(f => seen.add(f));
	});
	// HTML cards whose script comes from another site, or names one (an inline loader, as Infogram's; a
	// call to a library another card loads, as Google Trends'): the whole card is the embed. A card with
	// only a frame is left to the frames below; one with only its own inline script is left alone.
	const loaders = new Map();
	for (const nodes of htmlCards(root)) {
		const elements = nodes.filter(node => node.nodeType === 1);
		if (elements.some(el => el.closest("figure.kg-embed-card, [data-embed-facade]"))) continue;
		const all = elements.flatMap(el => [...(el.matches("script") ? [el] : []), ...el.querySelectorAll("script")]);
		const scripts = all.filter(s => s.hasAttribute("src") && isThirdParty(s.getAttribute("src")));
		const named = all.filter(s => !s.hasAttribute("src")).flatMap(namedIn);
		const sources = [...scripts.map(s => parse(s.getAttribute("src"))), ...named];
		if (!sources.length) continue;
		const source = sources.find(knownProvider) || sources[0];
		const provider = providerFor(source);
		// The library a later card of the same service calls is the one its first card loaded
		if (scripts.length && !loaders.has(provider.id)) loaders.set(provider.id, scripts);
		const prelude = scripts.length ? [] : loaders.get(provider.id) || [];
		const title = decoded(find(elements, "[data-title]")?.dataset.title);
		embeds.push({
			container: null,
			nodes,
			elements,
			prelude,
			frame: null,
			scripts,
			provider,
			source,
			title,
			card: true,
		});
		elements.forEach(el => (el.matches("iframe") ? [el] : el.querySelectorAll("iframe")).forEach(f => seen.add(f)));
	}
	root.querySelectorAll("iframe[src]").forEach(frame => {
		if (seen.has(frame) || frame.hasAttribute("data-embed-frame") || !isThirdParty(frame.getAttribute("src"))) return;
		const source = parse(frame.getAttribute("src"));
		embeds.push({ container: null, nodes: [frame], frame, scripts: [], provider: providerFor(source), source });
	});
	return embeds;
};

// The address of the content on the provider's site, for « View on … »
const linkOf = embed => {
	const { provider, frame, nodes, source } = embed;
	if (frame) return provider.link ? provider.link(new URL(source.href)) : source.href;
	if (embed.card) {
		// The chart's own page when the card gives it, else a link of the card to the service (« Source :
		// … »), else the service's site: never the address of a script
		const own = provider.page?.(embed.elements);
		const page = own && parse(own);
		if (page) return page.href;
		const links = embed.elements
			.flatMap(el => [...(el.matches("a[href]") ? [el] : []), ...el.querySelectorAll("a[href]")])
			.map(a => parse(a.getAttribute("href")))
			.filter(url => url && (provider.host ? provider.host.test(url.hostname) : url.hostname === source.hostname));
		return links.at(-1)?.href || `${source.origin}/`;
	}
	const quote = nodes.find(node => node.nodeType === 1 && node.matches("blockquote, div"));
	const permalink = quote?.getAttribute("cite") || quote?.dataset?.instgrmPermalink;
	if (permalink && parse(permalink)) return permalink;
	const links = [...(quote?.querySelectorAll("a[href]") || [])].map(a => parse(a.getAttribute("href"))).filter(Boolean);
	const own = links.filter(url => provider.host?.test(url.hostname));
	return (own.at(-1) || links.at(-1) || source).href;
};

// The id of an X post, from the links Ghost wrote in its quote (…/status/<id>)
const tweetOf = embed => {
	for (const node of embed.nodes) {
		if (node.nodeType !== 1) continue;
		for (const a of node.querySelectorAll("a[href]")) {
			const url = parse(a.getAttribute("href"));
			const id = url && /(^|\.)(twitter|x)\.com$/.test(url.hostname) && url.pathname.match(/\/status(?:es)?\/(\d+)/);
			if (id) return id[1];
		}
	}
	return null;
};

const fill = (text, provider) => text.replaceAll("{provider}", provider.name);

// The embed's title, as the provider gave it to Ghost (the frame's title). A generic one (« YouTube
// video », « vimeo video player », just the provider's name) says nothing and is in English: « Vidéo
// YouTube » / « Publication X » in the page's language instead, nothing for other content.
const titleOf = (embed, strings) => {
	const { provider, frame } = embed;
	const title = frame?.getAttribute("title")?.trim() || embed.title || "";
	const name = provider.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const generic = new RegExp(`^(${name})?\\s*(video|vidéo|post|tweet)?\\s*(player|embed)?$`, "i");
	if (!generic.test(title)) return title;
	const fallback = { video: strings.titleVideo, post: strings.titlePost }[provider.kind];
	return fallback ? fill(fallback, provider) : "";
};

let notes = 0;

export const setUpEmbeds = (root = document.querySelector("main")) => {
	const template = document.getElementById("embed-facade");
	if (!template || !root) return;
	const strings = template.dataset;
	const live = document.querySelector("[data-embed-live]");
	const announce = message => {
		if (!live) return;
		live.textContent = "";
		requestAnimationFrame(() => (live.textContent = message));
	};
	const facades = new Map();

	// Writes the embed into the site's frame page; clicked: autoplay and focus inside
	const load = (embed, { clicked = false, auto = false } = {}) => {
		const { provider, frame: original, scripts } = embed;
		const frame = document.createElement("iframe");
		frame.src = strings.embedFrame;
		frame.dataset.embedFrame = provider.id;
		const title = titleOf(embed, strings);
		frame.title = fill(strings.frameTitle, provider) + (title ? ` — ${title}` : "");
		frame.setAttribute("allow", ALLOW);
		frame.setAttribute("allowfullscreen", "");
		const ratio = ratioOf(original);
		if (ratio) {
			frame.setAttribute("width", original.getAttribute("width"));
			frame.setAttribute("height", original.getAttribute("height"));
			frame.style.setProperty("--embed-ratio", ratio);
		} else if (original) {
			// A frame of its own height (Spotify, forms…): the same height, the column's width
			frame.className = "embed-frame";
			frame.style.cssText = original.getAttribute("style") || "";
			if (original.getAttribute("height")) frame.style.height = `${parseFloat(original.getAttribute("height"))}px`;
		} else {
			frame.className = "embed-frame embed-frame--auto";
		}
		// A chart of an HTML card that its service shows in a frame of its own site (PROVIDERS `player`)
		const direct = embed.card ? provider.player?.(embed.elements) : null;
		if (direct) {
			frame.className = "embed-frame";
			frame.style.height = "min(80vh, 30rem)";
		}

		// What the frame page shows (assets/html/embed.html takes it by message, nothing else): a player,
		// a frame of the provider's site; or, for a scripted embed (Instagram, TikTok…), the markup as
		// Ghost wrote it, whose scripts then run in a sandbox, an origin of their own that cannot read the
		// site (its pages, the reader's lists, the member's account). An X post is shown through X's own
		// frame (in the page's mode, without personalisation), so X's script never runs in the frame page.
		const dark = document.documentElement.dataset.theme === "dark";
		let message;
		const tweet = scripts.length && provider.id === "x" && tweetOf(embed);
		if (original && !scripts.length) {
			const url = new URL(embed.source.href);
			const src = provider.load ? provider.load(url) : url;
			if (clicked && provider.kind === "video") src.searchParams.set("autoplay", "1");
			message = { player: { src: src.href, title: title || undefined, allow: ALLOW, focus: clicked } };
		} else if (direct) {
			message = { player: { src: direct, title: title || undefined, allow: ALLOW, focus: clicked } };
		} else if (tweet) {
			const src = new URL("https://platform.twitter.com/embed/Tweet.html");
			src.searchParams.set("id", tweet);
			src.searchParams.set("dnt", "true");
			src.searchParams.set("theme", dark ? "dark" : "light");
			if (document.documentElement.lang) src.searchParams.set("lang", document.documentElement.lang);
			message = { player: { src: src.href, allow: ALLOW, maxWidth: "550px", resize: "x", focus: clicked } };
		} else {
			frame.setAttribute("sandbox", SANDBOX);
			// `prelude`: the library an HTML card calls without loading it (another card of the page does)
			const markup = [...(embed.prelude || []), ...embed.nodes].map(node => node.outerHTML ?? node.textContent);
			message = { markup: markup.join("") };
		}
		// The frame takes the height of what it shows (no ratio, no height of its own)
		if (!ratio && !original && !direct) fitting.add(frame);
		frame.addEventListener(
			"load",
			() => {
				// The same light / dark scheme as the page, so the frame stays transparent. "*": a sandboxed
				// frame has no origin to name; what is sent is the post's own markup.
				message.scheme = getComputedStyle(frame).colorScheme;
				if (clicked) frame.focus();
				frame.contentWindow.postMessage({ attiblingEmbed: message }, "*");
			},
			{ once: true },
		);

		const facade = facades.get(embed);
		facade.replaceWith(frame);
		facades.delete(embed);

		// Loaded without a click (« always show », or « Contenus intégrés » accepted): a way to take it
		// back for this service, right here (the panel has the others)
		if (auto) {
			const line = document.createElement("p");
			line.className = "embed-remembered";
			const stop = document.createElement("button");
			stop.type = "button";
			stop.className = "embed-remembered__stop";
			stop.dataset.embedStop = provider.id;
			stop.textContent = fill(strings.stop, provider);
			stop.addEventListener("click", () => {
				choices.set(provider.id, false);
				document
					.querySelectorAll(`[data-embed-stop="${CSS.escape(provider.id)}"]`)
					.forEach(b => b.parentElement.remove());
				announce(fill(strings.stopped, provider));
			});
			line.append(stop);
			frame.after(line);
		}
	};

	const embeds = findEmbeds(root);

	for (const embed of embeds) {
		const { provider, frame, nodes } = embed;
		const facade = template.content.firstElementChild.cloneNode(true);
		facade.dataset.provider = provider.id;
		facade.dataset.kind = provider.kind;
		const ratio = ratioOf(frame);
		if (ratio) facade.style.setProperty("--embed-ratio", ratio);
		facade.querySelectorAll("[data-embed-note], [data-embed-always] + span, [data-embed-open]").forEach(el => {
			for (const node of el.childNodes) if (node.nodeType === 3) node.textContent = fill(node.textContent, provider);
		});
		facade.querySelector("[data-embed-provider]").textContent = provider.name;
		facade.querySelector("[data-embed-label]").textContent = fill(
			{ video: strings.labelVideo, post: strings.labelPost }[provider.kind] || strings.labelContent,
			provider,
		);
		const titleText = titleOf(embed, strings);
		const title = facade.querySelector("[data-embed-title]");
		const quote = !frame && nodes.find(node => node.nodeType === 1 && node.matches("blockquote"));
		const titled = (frame || embed.card) && titleText;
		if (titled) title.textContent = titleText;
		else title.remove();
		const poster = facade.querySelector("[data-embed-poster]");
		if (quote) {
			// A post (X, Instagram…): its text, as Ghost wrote it, stays readable without loading anything
			facade.classList.add("embed-facade--quote");
			poster.querySelector("[data-embed-provider]").after(quote.cloneNode(true));
		} else if (!ratio) {
			facade.classList.add("embed-facade--free");
		}
		facade.querySelector("[data-embed-open]").href = linkOf(embed);
		const checkbox = facade.querySelector("[data-embed-always]");
		// A named group (« Contenu de YouTube — title »), its buttons described by the note: read in that
		// order, and « Afficher seulement celui-ci » says which content it shows, even out of context
		const name = fill(strings.frameTitle, provider) + (titled ? ` — ${titleText}` : "");
		facade.setAttribute("role", "group");
		facade.setAttribute("aria-label", name);
		// On paper (print.css), where neither the facade nor a frame can show: one line, before the embed,
		// with what it is and its address (« Contenu de YouTube — title (https://…) »), whichever is shown
		const printed = document.createElement("p");
		printed.className = "embed-print";
		printed.hidden = true;
		const address = document.createElement("a");
		address.href = address.textContent = linkOf(embed);
		printed.append(`${name} (`, address, ")");
		(embed.container || nodes[0]).before(printed);
		const note = facade.querySelector("[data-embed-note]");
		note.id = `embed-note-${++notes}`;
		facade
			.querySelectorAll("[data-embed-accept], [data-embed-load]")
			.forEach(b => b.setAttribute("aria-describedby", note.id));
		// The fallback consent mode (setting consent_notice ≠ None) and no « Contenus intégrés » accepted:
		// the facade is the only request for embedded content (no notice for them) — « Accepter et
		// afficher » (embedded content, every service, from now on) and « Afficher seulement celui-ci »
		// (this embed only, nothing kept)
		if (consentMode() !== "none") {
			facade.classList.add("embed-facade--ask");
			const accept = facade.querySelector("[data-embed-accept]");
			accept.hidden = false;
			facade.querySelector("[data-embed-label]").textContent = strings.only;
			facade.querySelector("[data-embed-load]").setAttribute("aria-label", `${strings.only} (${name})`);
			facade.querySelector("[data-embed-load] .icon")?.remove();
			facade.querySelector("[data-embed-note]").textContent = fill(strings.askNote, provider);
			facade.querySelector(".embed-facade__always").hidden = true;
			accept.addEventListener("click", () => {
				load(embed, { clicked: true });
				consent.grant("embeds");
			});
		}
		facade.querySelector("[data-embed-load]").addEventListener("click", () => {
			load(embed, { clicked: true });
			// The other embeds of the same provider in the page follow the choice (sync, below)
			if (checkbox.checked) choices.set(provider.id, true);
		});

		// Replace what Ghost wrote (the blocked frame, the inert script) by the facade, caption kept
		nodes[0].before(facade);
		nodes.forEach(node => node.remove());
		facades.set(embed, facade);
	}

	// Every embed the reader's choices allow loads without a click: now, and after an answer or a choice
	// made on this page (the notice, the panel, « always show » on another embed of the same service)
	// (load() removes each embed from the map, which its iterator allows)
	const sync = event => {
		const shown = new Set();
		for (const embed of facades.keys()) {
			if (!choices.allowed(embed.provider.id)) continue;
			load(embed, { auto: true });
			shown.add(embed.provider.name);
		}
		// After an answer given on this page (the panel, « Accepter et afficher »): the content that appears
		// elsewhere in the page is announced. In the open panel, after its own « Choix enregistré ».
		if (!event || !shown.size) return;
		const message = fill(strings.shown, { name: [...shown].join(", ") });
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				const panel = document.querySelector("dialog[open] [data-privacy-live]");
				if (!panel) return announce(message);
				panel.textContent = `${panel.textContent} ${message}`.trim();
			}),
		);
	};
	sync();
	window.addEventListener("attibling:consent", sync);
	window.addEventListener("attibling:embeds", sync);
};
