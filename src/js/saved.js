// The « À lire plus tard » page (partials/pages/saved.hbs), members only: draws the posts saved with the bookmark
// (src/js/store.js savedPosts: url, title, image, tag, readingTime — everything a tile needs, nothing is
// fetched) as a grid, newest saved first, with « Retirer » under each tile and « Tout retirer ».
// Empty list → the empty state; storage unavailable (private window, blocked data) → the note says so.
// Follows changes made in other tabs.
import { onReady } from "./helpers";
import { isAvailable, savedPosts } from "./store";

const LONG_READ = 10; // minutes, as tile-pill.hbs

const setUpSaved = root => {
	const unavailable = root.querySelector("[data-saved-unavailable]");
	if (!isAvailable()) {
		unavailable.hidden = false;
		return;
	}

	const list = root.querySelector("[data-saved-list]");
	const template = root.querySelector("[data-saved-template]");
	const empty = root.querySelector("[data-saved-empty]");
	const clear = root.querySelector("[data-saved-clear]");
	const count = root.querySelector("[data-saved-count]");
	const { i18nOne, i18nMany, i18nMinutes, i18nRemove, i18nConfirm } = root.dataset;

	const tile = entry => {
		const node = template.content.firstElementChild.cloneNode(true);
		const img = node.querySelector("img");
		node.querySelector(".tile__link").href = entry.url;
		node.querySelector("[data-field=title]").textContent = entry.title;
		node.querySelector("[data-field=placeholder]").textContent = entry.title;
		const noImage = () => {
			img.remove();
			node.querySelector(".tile").classList.add("tile--no-image");
		};
		if (entry.image) {
			// An image deleted since the post was saved: the designed no-image tile instead
			img.addEventListener("error", noImage, { once: true });
			img.src = entry.image;
		} else noImage();
		const minutes = Number(entry.readingTime) || 0;
		const tag = node.querySelector("[data-field=tag]");
		const time = node.querySelector("[data-field=time]");
		if (entry.tag) tag.textContent = entry.tag;
		if (minutes) time.textContent = i18nMinutes.replace("%", minutes);
		if (!entry.tag || !minutes) tag.nextElementSibling.remove();
		if (!entry.tag) tag.remove();
		if (!minutes) time.remove();
		if (minutes < LONG_READ) node.querySelector("[data-field=pill]").remove();

		const remove = node.querySelector("[data-remove]");
		remove.setAttribute("aria-label", i18nRemove.replace("%", entry.title));
		remove.addEventListener("click", () => {
			const position = [...list.children].indexOf(node);
			savedPosts.remove(entry.url);
			// Keep the focus in the list: the next « Retirer », the previous one, or the empty state's link
			const next = list.children[position] || list.children[position - 1];
			(next?.querySelector("[data-remove]") || empty.querySelector("a"))?.focus();
		});
		return node;
	};

	const render = () => {
		const entries = savedPosts.list();
		list.replaceChildren(...entries.map(tile));
		list.hidden = !entries.length;
		empty.hidden = entries.length > 0;
		clear.hidden = !entries.length;
		count.textContent = (entries.length === 1 ? i18nOne : i18nMany).replace("%", entries.length);
		count.hidden = !entries.length;
	};

	clear.addEventListener("click", () => {
		if (i18nConfirm && !window.confirm(i18nConfirm)) return;
		savedPosts.clear();
		empty.querySelector("a")?.focus();
	});
	savedPosts.subscribe(render);
	render();
};

onReady(() => {
	const root = document.querySelector("[data-saved]");
	if (root) setUpSaved(root);
});
