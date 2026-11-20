import { onReady, setUpSlider } from "./helpers";
import { setUpDock } from "./dock";
import { setUpIntro } from "./intro";
import { isAvailable, readingProgress, savedPosts } from "./store";

const PROMO_KEY = "attibling-promo-closed";

// Hero: the pager shows one featured post at a time. Slides switched off are inert (out of the
// tab order and of the accessibility tree) and fade out; the current dot has aria-current="true".
const setUpHero = hero => {
	const slides = [...hero.querySelectorAll("[data-hero-slide]")];
	const pager = hero.querySelector("[data-hero-pager]");
	const dots = [...hero.querySelectorAll("[data-hero-dot]")];
	if (slides.length < 2 || !pager || dots.length !== slides.length) return;

	// The other slides stay hidden (display: none) until the reader shows interest in them: their
	// pictures (loading="lazy") are not downloaded with the page. Pointing at, touching or focusing a dot
	// readies its slide: laid out, faded out and inert, its picture asked for.
	const ready = slide => {
		if (!slide.hidden) return;
		slide.inert = true;
		slide.hidden = false;
		slide.querySelector("img")?.setAttribute("loading", "eager");
	};

	let current = -1;
	const show = index => {
		const changed = current !== -1 && current !== index;
		if (slides[index].hidden) {
			ready(slides[index]);
			// Laid out faded out first, so the change below fades it in
			slides[index].getBoundingClientRect();
		}
		current = index;
		slides.forEach((slide, i) => {
			if (slide.hidden) return;
			slide.inert = i !== index;
			slide.toggleAttribute("data-current", i === index);
			// The post's text rises in when the reader changes the slide (not on load)
			slide.toggleAttribute("data-entering", changed && i === index);
		});
		dots.forEach((dot, i) => {
			if (i === index) dot.setAttribute("aria-current", "true");
			else dot.removeAttribute("aria-current");
		});
	};

	dots.forEach((dot, i) => {
		dot.addEventListener("click", () => show(i));
		for (const type of ["pointerenter", "touchstart", "focus"]) {
			dot.addEventListener(type, () => ready(slides[i]), { once: true, passive: true });
		}
	});
	// Arrow keys move between the dots
	pager.addEventListener("keydown", event => {
		const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
		let step = keys[event.key];
		const from = dots.indexOf(document.activeElement);
		if (!step || from < 0) return;
		event.preventDefault();
		if (/Left|Right/.test(event.key) && getComputedStyle(pager).direction === "rtl") step = -step;
		const to = (from + step + dots.length) % dots.length;
		dots[to].focus();
		show(to);
	});
	pager.hidden = false;
	show(0);
	setUpPagerCue(pager, dots);
};

// The pager's one-time cue: once per browser session, when the hero first shows (after the arrival
// animation), the other dots ripple one after the other (data-cue, src/css/home/hero.css). Never with
// reduced motion; the CSS has the timing.
const CUE_KEY = "attibling-hero-cue";
const setUpPagerCue = (pager, dots) => {
	dots.forEach((dot, i) => dot.style.setProperty("--dot-index", String(i)));
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	try {
		if (sessionStorage.getItem(CUE_KEY)) return;
	} catch {
		return;
	}
	const root = document.documentElement;
	const play = () => {
		try {
			sessionStorage.setItem(CUE_KEY, "1");
		} catch {
			// Played on this page only
		}
		pager.setAttribute("data-cue", "");
		setTimeout(() => pager.removeAttribute("data-cue"), 640 + dots.length * 110 + 100);
	};
	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			observer.disconnect();
			// After the arrival animation when it plays, else a moment after the page shows
			const wait = () => (root.hasAttribute("data-intro") ? setTimeout(wait, 200) : setTimeout(play, 900));
			wait();
		},
		{ threshold: 0.6 },
	);
	observer.observe(pager);
};

// Subscription block: the close button hides it for good on this browser
const setUpPromo = promo => {
	const close = promo.querySelector("[data-promo-close]");
	if (!close) return;
	close.hidden = false;
	close.addEventListener("click", () => {
		try {
			localStorage.setItem(PROMO_KEY, "1");
		} catch {
			// Closed for this page only
		}
		document.documentElement.setAttribute("data-promo-closed", "");
		// Keep keyboard focus on the page: the next section's first link
		const next = promo.nextElementSibling?.querySelector("a, button:not([hidden])");
		(next || document.getElementById("main"))?.focus({ preventScroll: true });
	});
};

// Members' lists: « Reprendre la lecture » / « À lire plus tard », switched by the title
const setUpMemberLists = section => {
	if (!isAvailable()) return;
	const button = section.querySelector("[data-list-switch]");
	const label = section.querySelector("[data-list-switch-label]");
	const menu = section.querySelector("[data-list-menu]");
	const options = [...menu.querySelectorAll("[role=option]")];
	const items = section.querySelector("[data-list-items]");
	const template = section.querySelector("[data-list-template]");
	const clear = section.querySelector("[data-list-clear]");
	const all = section.querySelector("[data-list-all]");
	const { i18nRead, i18nLeft, i18nMinutes, i18nRemove } = section.dataset;
	const lang = document.documentElement.lang || undefined;
	const percent = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
	let current = null;

	const lists = { resume: () => readingProgress.list(), saved: () => savedPosts.list() };
	const stores = { resume: readingProgress, saved: savedPosts };

	const card = (entry, list) => {
		const node = template.content.firstElementChild.cloneNode(true);
		const link = node.querySelector(".tile__link");
		const img = node.querySelector("img");
		link.href = entry.url;
		node.querySelector("[data-field=title]").textContent = entry.title;
		node.querySelector("[data-field=placeholder]").textContent = entry.title;
		if (entry.image) img.src = entry.image;
		else {
			img.remove();
			node.querySelector(".tile").classList.add("tile--no-image");
		}
		const lead = node.querySelector("[data-field=lead]");
		const rest = node.querySelector("[data-field=rest]");
		const minutes = Number(entry.readingTime) || 0;
		if (list === "resume") {
			node.querySelector(".progress").style.setProperty("--progress", `${Math.round(entry.progress * 100)}%`);
			lead.textContent = i18nRead.replace("%", percent.format(entry.progress));
			const left = Math.max(1, Math.round(minutes * (1 - entry.progress)));
			if (minutes) rest.textContent = i18nLeft.replace("%", left);
			else rest.previousElementSibling.remove();
		} else {
			node.querySelector(".progress").remove();
			lead.className = "meta__tag";
			lead.textContent = entry.tag;
			if (minutes) rest.textContent = i18nMinutes.replace("%", minutes);
			if (!entry.tag || !minutes) rest.previousElementSibling.remove();
			if (!entry.tag) lead.remove();
		}
		const remove = node.querySelector("[data-remove]");
		remove.setAttribute("aria-label", i18nRemove.replace("%", entry.title));
		remove.addEventListener("click", () => {
			const position = [...items.children].indexOf(node);
			stores[list].remove(entry.url);
			// Focus the next card's remove button, or the switch when the list is empty
			const next = items.children[position] || items.children[position - 1];
			(next?.querySelector("[data-remove]") || button).focus();
		});
		return node;
	};

	const render = () => {
		const resume = lists.resume();
		const saved = lists.saved();
		if (!resume.length && !saved.length) {
			section.hidden = true;
			current = null;
			return;
		}
		section.hidden = false;
		if (!current) current = resume.length ? "resume" : "saved";
		const entries = current === "resume" ? resume : saved;
		label.textContent = options.find(o => o.dataset.list === current).textContent.trim();
		options.forEach(o => o.setAttribute("aria-selected", String(o.dataset.list === current)));
		items.replaceChildren(...entries.map(entry => card(entry, current)));
		section
			.querySelectorAll("[data-list-empty]")
			.forEach(p => (p.hidden = entries.length > 0 || p.dataset.listEmpty !== current));
		clear.hidden = current !== "resume" || !entries.length;
		all.hidden = current !== "saved";
		items.dispatchEvent(new Event("scroll"));
	};

	// The switch: a listbox under the title
	const isOpen = () => !menu.hidden;
	const open = () => {
		menu.hidden = false;
		button.setAttribute("aria-expanded", "true");
		(options.find(o => o.getAttribute("aria-selected") === "true") || options[0]).focus();
	};
	const close = (focusButton = true) => {
		menu.hidden = true;
		button.setAttribute("aria-expanded", "false");
		if (focusButton) button.focus();
	};
	const choose = option => {
		current = option.dataset.list;
		close();
		render();
	};
	button.addEventListener("click", () => (isOpen() ? close() : open()));
	button.addEventListener("keydown", event => {
		if (["ArrowDown", "ArrowUp"].includes(event.key)) {
			event.preventDefault();
			open();
		}
	});
	options.forEach(option => option.addEventListener("click", () => choose(option)));
	menu.addEventListener("keydown", event => {
		const index = options.indexOf(document.activeElement);
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			options[(index + step + options.length) % options.length].focus();
		} else if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			options[event.key === "Home" ? 0 : options.length - 1].focus();
		} else if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			if (index >= 0) choose(options[index]);
		} else if (event.key === "Escape") {
			event.preventDefault();
			close();
		} else if (event.key === "Tab") {
			close(false);
		}
	});
	document.addEventListener("click", event => {
		if (isOpen() && !menu.contains(event.target) && !button.contains(event.target)) close(false);
	});

	clear.addEventListener("click", () => {
		readingProgress.clear();
		button.focus();
	});
	readingProgress.subscribe(render);
	savedPosts.subscribe(render);
	render();
};

// Shelves: rows of tiles that scroll sideways, with previous / next buttons
const setUpShelves = () => {
	document.querySelectorAll("[data-shelf]").forEach(shelf => {
		shelf.querySelectorAll(".js-slider-prev, .js-slider-next").forEach(button => (button.hidden = false));
		setUpSlider(shelf);
	});
};

onReady(() => {
	setUpIntro();
	setUpDock();
	const hero = document.querySelector("[data-hero]");
	if (hero) setUpHero(hero);
	const promo = document.querySelector("[data-promo]");
	if (promo) setUpPromo(promo);
	const lists = document.querySelector("[data-member-lists]");
	if (lists) setUpMemberLists(lists);
	setUpShelves();
});
