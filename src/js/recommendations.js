// Members: in the « ••• » menu, recommendations in place of the recent posts.
//
// What the member read is known from the two lists their browser keeps (store.js): « Reprendre la
// lecture » and « À lire plus tard », each post with the name of its tag. The posts come from a pool the
// server rendered for members ([data-discover-pool] of header-body.hbs: the 24 most recent posts, as
// row items in a <template>). Nothing is sent anywhere: the choice is made here, in the page.
//
// A post is recommended when its tag is one the member reads; the posts already in their lists and
// the one on screen are left out. The tags read most come first, then the most recent posts; when
// fewer posts match than the menu shows, recent ones complete the row. Without a single match (no
// list, storage off, tags that have no other post) the recent posts stay as the server rendered them.

import { isAvailable, readingProgress, savedPosts, toPath } from "./store";

// Reading counts more than putting aside
const WEIGHTS = { reading: 2, saved: 1 };

/** The posts to show: `count` of them, or null when nothing matches what the member read. */
export const pick = (pool, { reading, saved, current, count }) => {
	const taste = new Map();
	const add = (list, weight) => {
		for (const { tag } of list) if (tag) taste.set(tag, (taste.get(tag) || 0) + weight);
	};
	add(reading, WEIGHTS.reading);
	add(saved, WEIGHTS.saved);
	if (!taste.size) return null;

	const known = new Set([...reading, ...saved].map(post => post.url).concat(current));
	const fresh = pool.filter(post => !known.has(post.url));
	// The pool is newest first: a stable sort keeps that order between posts of the same score
	const matches = fresh.filter(post => taste.has(post.tag)).sort((a, b) => taste.get(b.tag) - taste.get(a.tag));
	if (!matches.length) return null;
	const rest = fresh.filter(post => !matches.includes(post));
	return [...matches, ...rest].slice(0, count);
};

export const setUpRecommendations = () => {
	const template = document.querySelector("[data-discover-pool]");
	if (!template || !isAvailable()) return;
	const pool = [...template.content.querySelectorAll("li")].map(item => ({
		item,
		url: toPath(item.querySelector("a")?.getAttribute("href")),
		tag: item.querySelector(".meta__tag")?.textContent.trim() || "",
	}));
	const reading = readingProgress.list();
	const saved = savedPosts.list();
	document.querySelectorAll("[data-discover-posts]").forEach(list => {
		const posts = pick(pool, { reading, saved, current: location.pathname, count: Number(list.dataset.count) || 6 });
		if (!posts) return;
		list.replaceChildren(
			...posts.map(({ item }) => {
				const copy = item.cloneNode(true);
				// The picture's box is the one of this list (the pool has the default one)
				if (list.dataset.sizes)
					copy.querySelectorAll("[sizes]").forEach(el => el.setAttribute("sizes", list.dataset.sizes));
				return copy;
			}),
		);
		const title = list.closest("section")?.querySelector("[data-discover-title]");
		if (title?.dataset.recommended) title.textContent = title.dataset.recommended;
	});
};
