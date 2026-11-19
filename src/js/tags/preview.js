// Previews of the « Tags » page (partials/pages/tags.hbs): a card that grows out of a cell and floats above
// its neighbours, with the tag's description, number of posts, three latest posts and « Voir la rubrique ».
//  - Mouse: resting on a cell for OPEN_DELAY opens it (moving on before cancels it); from one cell to the
//    next while one is open, WARM_DELAY. It closes CLOSE_DELAY after the pointer leaves the cell and the
//    card (the card is inside the cell's <li>, so going from one to the other is not a leave), on Escape,
//    on a click elsewhere, on scroll.
//  - Keyboard and touch: the cell's « Détails » button (always shown on touch screens, on hover or focus
//    otherwise) opens it and moves the focus into it; its links come next in the tab order; Escape or
//    « Fermer » brings the focus back to the button; focus leaving the card closes it. The link of the
//    cell keeps its Enter / tap.
// One card, created on first use, moved into the cell it previews. It is a manual popover (top layer,
// above the sticky header) positioned in page coordinates, so it follows the page when it scrolls; it
// stays inside the viewport (cells at the edges grow inward). Without the Popover API it is an absolute
// box inside the cell. Reduced motion: a short fade instead of the growth.

const OPEN_DELAY = 600;
const WARM_DELAY = 250;
const CLOSE_DELAY = 180;

const ICONS = {
	close:
		'<svg class="m-icon-svg icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>',
	arrow:
		'<svg class="m-icon-svg icon icon-flip-rtl" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

const element = (tag, className, text) => {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text) el.textContent = text;
	return el;
};

export const setUpPreviews = (page, grid) => {
	const native = Object.hasOwn(HTMLElement.prototype, "popover");
	const hoverable = matchMedia("(hover: hover) and (pointer: fine)");
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	const labels = page.dataset;
	let panel = null;
	let parts = null;
	let current = null; // { cell, mode: "hover" | "click" }
	let openTimer = 0;
	let closeTimer = 0;
	let warmUntil = 0;
	let leaving = null; // closing animation

	// The 3 latest posts of each tag, from the <template> of the page (grouped on first use)
	let recent = null;
	const recentPosts = slug => {
		if (!recent) {
			recent = new Map();
			const rows = page.querySelector("[data-tags-recent]")?.content.querySelectorAll("li[data-tags]") || [];
			for (const row of rows) {
				for (const tag of row.dataset.tags.split(" ").filter(Boolean)) {
					const list = recent.get(tag) || [];
					if (list.length < 3) list.push(row);
					recent.set(tag, list);
				}
			}
		}
		return recent.get(slug) || [];
	};

	const create = () => {
		panel = element("div", "tag-preview");
		panel.id = "tag-preview";
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-labelledby", "tag-preview-name");
		panel.tabIndex = -1;
		if (native) panel.popover = "manual";
		const media = element("div", "tag-preview__media");
		const image = element("img", "tag-preview__image");
		image.alt = "";
		image.decoding = "async";
		const numeral = element("span", "tag-preview__numeral");
		numeral.setAttribute("aria-hidden", "true");
		const heading = element("div", "tag-preview__heading");
		const name = element("p", "tag-preview__name");
		name.id = "tag-preview-name";
		const count = element("p", "tag-preview__count");
		heading.append(name, count);
		media.append(image, numeral, heading);
		const body = element("div", "tag-preview__body");
		const description = element("p", "tag-preview__description");
		const label = element("p", "tag-preview__label", labels.i18nLatest);
		label.id = "tag-preview-latest";
		const posts = element("ul", "tag-preview__posts");
		posts.setAttribute("role", "list");
		posts.setAttribute("aria-labelledby", "tag-preview-latest");
		const more = element("a", "button button--inverse tag-preview__more");
		more.innerHTML = ICONS.arrow;
		more.prepend(labels.i18nMore);
		body.append(description, label, posts, more);
		const close = element("button", "icon-button icon-button--scrim tag-preview__close");
		close.type = "button";
		close.setAttribute("aria-label", labels.i18nClose);
		close.innerHTML = ICONS.close;
		close.addEventListener("click", () => hide({ restore: true }));
		panel.append(media, body, close);
		parts = { media, image, numeral, name, count, body, description, label, posts, more };
	};

	const fill = cell => {
		const link = cell.querySelector(".tag-cell__link");
		const source = cell.querySelector(".tag-cell__image");
		const text = selector => cell.querySelector(selector)?.textContent.trim() || "";
		panel.classList.toggle("tag-preview--image", Boolean(source));
		panel.classList.toggle("tag-preview--no-image", !source);
		panel.style.setProperty("--tile-tint", cell.style.getPropertyValue("--tile-tint") || "var(--tint-1)");
		parts.image.hidden = !source;
		if (source) {
			parts.image.srcset = source.srcset;
			parts.image.sizes = "440px";
			parts.image.src = source.currentSrc || source.src;
		} else parts.image.removeAttribute("src");
		parts.numeral.textContent = cell.dataset.posts;
		parts.name.textContent = text(".tag-cell__name");
		parts.count.textContent = text(".tag-cell__count");
		parts.description.textContent = text(".tag-cell__description");
		parts.description.hidden = !parts.description.textContent;
		const posts = recentPosts(cell.dataset.tag);
		parts.label.hidden = !posts.length;
		parts.posts.hidden = !posts.length;
		parts.posts.replaceChildren(
			...posts.map(row => {
				const source = row.querySelector("a");
				const time = row.querySelector("time");
				const item = element("li");
				const a = element("a", "tag-preview__post");
				a.href = source.getAttribute("href");
				const meta = element("span", "tag-preview__post-meta");
				const date = element("time", "", time?.textContent);
				if (time) date.dateTime = time.dateTime;
				meta.append(date);
				const minutes = row.querySelector("span")?.textContent.trim();
				if (minutes) meta.append(element("span", "tag-preview__dot", "·"), minutes);
				a.append(element("span", "tag-preview__post-title", source.textContent), meta);
				item.append(a);
				return item;
			}),
		);
		parts.more.href = link.getAttribute("href");
	};

	// Above the cell, centred on it, inside the viewport
	const place = cell => {
		const box = cell.getBoundingClientRect();
		const viewport = document.documentElement.clientWidth;
		const margin = viewport < 640 ? 12 : 16;
		const width = Math.round(Math.min(Math.max(box.width * 1.4, 300), 440, viewport - 2 * margin));
		const mediaHeight = Math.round(Math.min(Math.max((box.height * width) / box.width, 140), 240));
		panel.style.width = `${width}px`;
		panel.style.setProperty("--media-h", `${mediaHeight}px`);
		panel.style.maxHeight = `${innerHeight - 2 * margin}px`;
		const height = panel.offsetHeight;
		const left = Math.min(Math.max(box.left + box.width / 2 - width / 2, margin), viewport - margin - width);
		const top = Math.max(Math.min(box.top + box.height / 2 - mediaHeight / 2, innerHeight - margin - height), margin);
		// Page coordinates in the top layer; the cell's in the fallback
		const origin = native ? { x: -scrollX, y: -scrollY } : { x: box.left, y: box.top };
		panel.style.left = `${Math.round(left - origin.x)}px`;
		panel.style.top = `${Math.round(top - origin.y)}px`;
		return { box, left, top, width, height, mediaHeight };
	};

	const grow = ({ box, left, top, width, height, mediaHeight }) => {
		if (reducedMotion.matches) {
			panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
			return;
		}
		// From the cell: the picture of the card starts exactly over the cell, then grows to its place
		const scale = box.width / width;
		const dx = box.left + box.width / 2 - (left + width / 2);
		const dy = box.top + box.height / 2 - (top + mediaHeight / 2);
		panel.style.transformOrigin = `${width / 2}px ${mediaHeight / 2}px`;
		panel.animate(
			[
				// only the picture at first: the rest of the card unrolls under it
				{
					transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
					clipPath: `inset(0 0 ${Math.max(0, height - mediaHeight)}px 0 round 16px)`,
					boxShadow: "none",
				},
				{ transform: "none", clipPath: "inset(0 round 16px)", boxShadow: getComputedStyle(panel).boxShadow },
			],
			{ duration: 280, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
		);
		parts.body.animate([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }], {
			duration: 320,
			easing: "ease-out",
		});
	};

	const finish = () => {
		if (leaving) {
			leaving.cancel();
			leaving = null;
		}
		if (!panel) return;
		if (native) {
			if (panel.matches(":popover-open")) panel.hidePopover();
		} else panel.classList.remove("is-open");
		grid.querySelector(".tag-cell.is-previewed")?.classList.remove("is-previewed");
		panel.remove();
	};

	const show = (cell, mode) => {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		if (current?.cell === cell) {
			if (mode === "click") {
				current.mode = mode;
				panel.focus({ preventScroll: true });
			}
			return;
		}
		if (current) hide({ instant: true });
		finish();
		if (!panel) create();
		fill(cell);
		cell.append(panel);
		cell.classList.add("is-previewed");
		if (native) panel.showPopover();
		else panel.classList.add("is-open");
		const button = cell.querySelector("[data-tag-details]");
		button?.setAttribute("aria-expanded", "true");
		button?.setAttribute("aria-controls", panel.id);
		current = { cell, mode };
		grow(place(cell));
		if (mode === "click") panel.focus({ preventScroll: true });
	};

	function hide({ restore = false, instant = false } = {}) {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		if (!current) return;
		const { cell } = current;
		current = null;
		warmUntil = Date.now() + 900;
		const button = cell.querySelector("[data-tag-details]");
		button?.setAttribute("aria-expanded", "false");
		if (restore || panel.contains(document.activeElement)) button?.focus({ preventScroll: true });
		if (instant) return finish();
		leaving = panel.animate(
			reducedMotion.matches
				? [{ opacity: 1 }, { opacity: 0 }]
				: [
						{ opacity: 1, transform: "none" },
						{ opacity: 0, transform: "scale(0.97)" },
					],
			{ duration: 140, easing: "ease-in" },
		);
		leaving.onfinish = finish;
	}

	// Mouse: hover intent
	const enter = cell => {
		if (current?.cell === cell) {
			clearTimeout(closeTimer);
			return;
		}
		clearTimeout(openTimer);
		const delay = current || Date.now() < warmUntil ? WARM_DELAY : OPEN_DELAY;
		openTimer = setTimeout(() => show(cell, "hover"), delay);
	};
	const leave = cell => {
		clearTimeout(openTimer);
		if (current?.cell === cell && current.mode === "hover") closeTimer = setTimeout(() => hide(), CLOSE_DELAY);
	};
	const mouseCell = event =>
		event.pointerType === "mouse" && hoverable.matches ? event.target.closest?.(".tag-cell") : null;
	grid.addEventListener("pointerover", event => {
		const cell = mouseCell(event);
		if (cell && !cell.contains(event.relatedTarget)) enter(cell);
	});
	grid.addEventListener("pointerout", event => {
		const cell = mouseCell(event);
		if (cell && !cell.contains(event.relatedTarget)) leave(cell);
	});
	// A press on a cell (following its link) cancels a pending preview
	grid.addEventListener("pointerdown", () => clearTimeout(openTimer));

	// Keyboard and touch: the « Détails » button
	grid.addEventListener("click", event => {
		const button = event.target.closest("[data-tag-details]");
		if (button) show(button.closest(".tag-cell"), "click");
	});
	for (const button of grid.querySelectorAll("[data-tag-details]")) button.hidden = false;

	// Focus on the previewed cell's own link or button (under the card) or out of the cell closes it
	grid.addEventListener("focusin", event => {
		if (current && current.cell.contains(event.target) && !panel.contains(event.target)) hide({ instant: true });
	});
	grid.addEventListener("focusout", event => {
		if (current && event.relatedTarget && !current.cell.contains(event.relatedTarget)) hide();
	});
	document.addEventListener("keydown", event => {
		if (event.key === "Escape" && current) hide({ restore: current.mode === "click" });
	});
	document.addEventListener("pointerdown", event => {
		if (current && !current.cell.contains(event.target)) hide();
	});
	addEventListener(
		"scroll",
		() => {
			clearTimeout(openTimer);
			if (!current) return;
			if (current.mode === "hover") hide();
			else {
				// A card opened by the button follows the page; scrolled out of sight, it closes
				const box = panel.getBoundingClientRect();
				if (box.bottom < 0 || box.top > innerHeight) hide({ instant: true });
			}
		},
		{ passive: true },
	);
	// A new width moves the cells (phones also resize on scroll, as the address bar hides: not a new width)
	let width = innerWidth;
	addEventListener(
		"resize",
		() => {
			if (innerWidth !== width) hide({ instant: true });
			width = innerWidth;
		},
		{ passive: true },
	);

	return { close: () => hide({ instant: true }), isOpen: () => Boolean(current) };
};
