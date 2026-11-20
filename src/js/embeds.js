// Third-party embeds on click (theme setting embed_consent; partials/embed-consent.hbs).
//
// The page's Content-Security-Policy (default.hbs) already stopped the browser from loading the
// frames and scripts of other sites that Ghost wrote in the post HTML: nothing was requested. Here each
// of those embeds becomes a facade in the theme's design (provider, title, a button, one line on what
// loading it means, « always show », a link to the provider). On the reader's request the embed is
// written into assets/html/embed.html, a page of the site without that policy: YouTube from
// youtube-nocookie.com (privacy-enhanced mode) with autoplay, the others as Ghost wrote them (an X post
// with its widgets.js). Shown without a click: what privacy/choices.js `embeds.allowed(id)` says — the
// service's own choice (« Toujours afficher », kept in localStorage "attibling-embeds", taken back under
// each embed it loaded or in the « Cookies et confidentialité » panel), else the answer to the consent
// notice's « Contenus intégrés » (setting consent_notice). A page that still holds an embed behind its
// facade tells the notice ("attibling:gated"); an answer or a choice made meanwhile loads the embeds it
// allows at once, without autoplay.
import { embeds as choices, consent, consentMode } from "./privacy/choices";

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
		link: url => url.searchParams.get("url") || "https://soundcloud.com/",
	},
	{
		id: "codepen",
		name: "CodePen",
		kind: "content",
		host: /(^|\.)(codepen\.io|cdpn\.io)$/,
		link: url => url.href.replace(/\/embed\/(preview\/)?/, "/pen/"),
	},
];

// Permissions the player may need (Ghost's oEmbed frames ask for the same)
const ALLOW =
	"accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";

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

const providerFor = url => {
	const known = PROVIDERS.find(p => p.host.test(url.hostname));
	if (known) return known;
	const host = url.hostname.replace(/^www\./, "");
	return { id: host, name: host, kind: "content" };
};

// The services shown without a click, as a list (the panel, older callers)
export const remembered = () =>
	Object.entries(choices.choices())
		.filter(([, on]) => on)
		.map(([id]) => id);

export const remember = (id, on) => choices.set(id, on);

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
	const quote = nodes.find(node => node.nodeType === 1 && node.matches("blockquote, div"));
	const permalink = quote?.getAttribute("cite") || quote?.dataset?.instgrmPermalink;
	if (permalink && parse(permalink)) return permalink;
	const links = [...(quote?.querySelectorAll("a[href]") || [])].map(a => parse(a.getAttribute("href"))).filter(Boolean);
	const own = links.filter(url => provider.host?.test(url.hostname));
	return (own.at(-1) || links.at(-1) || source).href;
};

const fill = (text, provider) => text.replaceAll("{provider}", provider.name);

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
		const title = original?.getAttribute("title");
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

		frame.addEventListener(
			"load",
			() => {
				const doc = frame.contentDocument;
				if (!doc) return;
				// The same light / dark scheme as the page, so the frame stays transparent
				doc.documentElement.style.colorScheme = getComputedStyle(frame).colorScheme;
				const dark = document.documentElement.dataset.theme === "dark";
				let player = null;
				if (original && !scripts.length) {
					player = doc.createElement("iframe");
					const url = new URL(embed.source.href);
					const src = provider.load ? provider.load(url) : url;
					if (clicked && provider.kind === "video") src.searchParams.set("autoplay", "1");
					player.src = src.href;
					player.setAttribute("allow", ALLOW);
					player.setAttribute("allowfullscreen", "");
					if (title) player.title = title;
					doc.body.append(player);
				} else {
					// Scripted embeds (X, Instagram, TikTok…): the markup as Ghost wrote it, scripts re-created
					// so they run; X in the page's mode and without personalisation (data-dnt)
					doc.body.innerHTML = embed.nodes.map(node => node.outerHTML ?? node.textContent).join("");
					doc.querySelectorAll("blockquote.twitter-tweet, blockquote.twitter-video").forEach(quote => {
						quote.dataset.dnt = "true";
						if (dark) quote.dataset.theme = "dark";
					});
					doc.querySelectorAll("script").forEach(old => {
						const script = doc.createElement("script");
						for (const { name, value } of old.attributes) script.setAttribute(name, value);
						script.textContent = old.textContent;
						old.replaceWith(script);
					});
					// The frame takes the height of what it shows
					if (!ratio && !original) {
						const fit = () => (frame.style.height = `${doc.documentElement.scrollHeight}px`);
						new frame.contentWindow.ResizeObserver(fit).observe(doc.body);
						fit();
					}
				}
				if (clicked) {
					frame.focus();
					player?.focus();
				}
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
		const title = facade.querySelector("[data-embed-title]");
		const quote = !frame && nodes.find(node => node.nodeType === 1 && node.matches("blockquote"));
		if (frame?.getAttribute("title")) title.textContent = frame.getAttribute("title");
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
		// With the consent notice (setting consent_notice ≠ None) and no « Contenus intégrés » accepted:
		// the facade says why the content is hidden and carries the consent itself — « Accepter et
		// afficher » (embedded content, every service: the same question as the notice, so one answer
		// covers the site) and « Afficher seulement celui-ci » (this embed only, nothing kept)
		if (consentMode() !== "none") {
			facade.classList.add("embed-facade--ask");
			const accept = facade.querySelector("[data-embed-accept]");
			accept.hidden = false;
			facade.querySelector("[data-embed-label]").textContent = strings.only;
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
	const sync = () => {
		for (const embed of facades.keys()) if (choices.allowed(embed.provider.id)) load(embed, { auto: true });
	};
	sync();
	window.addEventListener("attibling:consent", sync);
	window.addEventListener("attibling:embeds", sync);
	if (facades.size) window.dispatchEvent(new CustomEvent("attibling:gated"));
};
