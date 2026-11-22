// Reader store: the lists members keep in their browser (localStorage), shared by the home page,
// the article pages and « Mes favoris ». Nothing leaves the browser.
//
// Members only: every list reads as empty and writes nothing unless <html> carries data-member
// (default.hbs renders it from {{#if @member}}) and localStorage works (private windows, blocked
// storage: the features hide instead of pretending).
//
//   isAvailable()                  true when the lists can be used (member + working storage)
//
//   savedPosts                     « À lire plus tard », newest first, at most 100 posts
//     .list()                      [{ url, title, image, tag, readingTime, savedAt }]
//     .has(url)                    boolean
//     .add(post)                   post: { url, title, image?, tag?, readingTime? } (minutes)
//     .remove(url)
//     .toggle(post)                adds or removes; returns true when the post is now saved
//     .clear()
//     .subscribe(fn)               fn(list) after every change, also from other tabs; returns unsubscribe
//
//   readingProgress                « Reprendre la lecture », most recent first, at most 6 posts; nothing
//                                  is recorded while the member has turned it off (privacy/choices.js)
//     .list()                      [{ url, title, image, tag, readingTime, progress, updatedAt }]
//     .get(url)                    the entry or null
//     .set(post)                   post: { url, title, image?, tag?, readingTime?, progress } with
//                                  progress from 0 to 1; kept only between 0.1 and 0.9 (a post read
//                                  past 90 % or barely started leaves the list)
//     .remove(url), .clear(), .subscribe(fn)
//
//   postFromElement(el)            the post described by the data-* attributes of a bookmark button
//                                  (data-url, data-title, data-image, data-tag, data-reading-time)
//
// URLs are stored as paths (a post keeps its entry if the site's domain changes). Storage keys:
// "attibling-saved" and "attibling-progress" (JSON arrays).

import { progressEnabled } from "./privacy/choices";

const SAVED_KEY = "attibling-saved";
const PROGRESS_KEY = "attibling-progress";
const EVENT = "attibling:store";

// Probed once per page (a write and a removal fire `storage` events in the other tabs: never on every
// read or write)
let storageOk;
const storageWorks = () => {
	if (storageOk !== undefined) return storageOk;
	try {
		const probe = "attibling-probe";
		localStorage.setItem(probe, "1");
		localStorage.removeItem(probe);
		storageOk = true;
	} catch {
		storageOk = false;
	}
	return storageOk;
};

export const isMember = () => document.documentElement.hasAttribute("data-member");

export const isAvailable = () => isMember() && storageWorks();

export const toPath = url => {
	try {
		const parsed = new URL(url, location.href);
		return parsed.pathname;
	} catch {
		return String(url || "");
	}
};

const read = key => {
	if (!isAvailable()) return [];
	try {
		const value = JSON.parse(localStorage.getItem(key) || "[]");
		return Array.isArray(value) ? value.filter(item => item && typeof item.url === "string") : [];
	} catch {
		return [];
	}
};

const write = (key, list) => {
	if (!isAvailable()) return;
	try {
		localStorage.setItem(key, JSON.stringify(list));
	} catch {
		return;
	}
	window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
};

const clean = post => ({
	url: toPath(post.url),
	title: String(post.title || ""),
	image: post.image ? String(post.image) : "",
	tag: post.tag ? String(post.tag) : "",
	readingTime: Number(post.readingTime) || 0,
});

const subscribeTo = (key, getList) => fn => {
	const onChange = event => {
		if (event.type === "storage" ? event.key === key : event.detail.key === key) fn(getList());
	};
	window.addEventListener(EVENT, onChange);
	window.addEventListener("storage", onChange);
	return () => {
		window.removeEventListener(EVENT, onChange);
		window.removeEventListener("storage", onChange);
	};
};

const newestFirst = field => (a, b) => (b[field] || 0) - (a[field] || 0);

export const savedPosts = {
	list: () => read(SAVED_KEY).sort(newestFirst("savedAt")),
	has: url => read(SAVED_KEY).some(item => item.url === toPath(url)),
	add(post) {
		const entry = { ...clean(post), savedAt: Date.now() };
		const rest = read(SAVED_KEY).filter(item => item.url !== entry.url);
		write(SAVED_KEY, [entry, ...rest].slice(0, 100));
	},
	remove(url) {
		write(
			SAVED_KEY,
			read(SAVED_KEY).filter(item => item.url !== toPath(url)),
		);
	},
	toggle(post) {
		if (savedPosts.has(post.url)) {
			savedPosts.remove(post.url);
			return false;
		}
		savedPosts.add(post);
		return true;
	},
	clear: () => write(SAVED_KEY, []),
	subscribe: subscribeTo(SAVED_KEY, () => savedPosts.list()),
};

export const readingProgress = {
	list: () => read(PROGRESS_KEY).sort(newestFirst("updatedAt")),
	get: url => read(PROGRESS_KEY).find(item => item.url === toPath(url)) || null,
	set(post) {
		if (!progressEnabled()) return;
		const progress = Math.min(Math.max(Number(post.progress) || 0, 0), 1);
		const entry = { ...clean(post), progress, updatedAt: Date.now() };
		const rest = read(PROGRESS_KEY).filter(item => item.url !== entry.url);
		write(PROGRESS_KEY, progress >= 0.1 && progress <= 0.9 ? [entry, ...rest].slice(0, 6) : rest);
	},
	remove(url) {
		write(
			PROGRESS_KEY,
			read(PROGRESS_KEY).filter(item => item.url !== toPath(url)),
		);
	},
	clear: () => write(PROGRESS_KEY, []),
	subscribe: subscribeTo(PROGRESS_KEY, () => readingProgress.list()),
};

export const postFromElement = el => ({
	url: el.dataset.url,
	title: el.dataset.title,
	image: el.dataset.image,
	tag: el.dataset.tag,
	readingTime: el.dataset.readingTime,
});

// Bookmark buttons ([data-bookmark], partials/bookmark-button.hbs): shown when the store is usable,
// pressed when the post is saved, toggling on click; every button of the same post follows.
export const setUpBookmarks = (root = document) => {
	const buttons = [...root.querySelectorAll("[data-bookmark]")];
	if (!buttons.length || !isAvailable()) return;
	const sync = () => {
		const saved = new Set(savedPosts.list().map(item => item.url));
		document.querySelectorAll("[data-bookmark]").forEach(button => {
			button.setAttribute("aria-pressed", String(saved.has(toPath(button.dataset.url))));
		});
	};
	buttons.forEach(button => {
		button.hidden = false;
		button.addEventListener("click", () => savedPosts.toggle(postFromElement(button)));
	});
	sync();
	savedPosts.subscribe(sync);
};
