import { isRTL, onReady, setUpPopover, throttleToFrame } from "./helpers";
import { setUpBookmarks } from "./store";
import { setUpPrefetch } from "./prefetch";
import { setUpTransitions } from "./transitions";
import { setUpPortalLinks } from "./portal-links";

// Before Ghost's Portal script binds its links: sign-up / sign-in go to the theme's page (portal-links.js)
setUpPortalLinks();

// Theme mode: "light", "dark" or "auto" (follows the system), stored in localStorage "theme".
// default.hbs applies it before the first paint; the switch cycles auto -> dark -> light -> auto.
const setUpThemeSwitch = () => {
	const switches = document.querySelectorAll(".js-switch-theme");
	const system = window.matchMedia("(prefers-color-scheme: dark)");
	const stored = () => {
		try {
			return localStorage.getItem("theme");
		} catch {
			return null;
		}
	};
	const apply = (mode, persist) => {
		const resolved = mode === "auto" ? (system.matches ? "dark" : "light") : mode;
		document.documentElement.setAttribute("data-theme", resolved);
		if (persist) {
			try {
				localStorage.setItem("theme", mode);
			} catch {
				// The choice only lasts for this page
			}
		}
		document.querySelectorAll("[data-theme-state]").forEach(icon => {
			icon.hidden = icon.dataset.themeState !== mode;
		});
	};
	const current = () => (["light", "dark"].includes(stored()) ? stored() : "auto");

	switches.forEach(el =>
		el.addEventListener("click", () => {
			const next = { auto: "dark", dark: "light", light: "auto" }[current()];
			apply(next, true);
			// Ghost's native comments draw their own frame: reload it in the new mode
			const comments = document.querySelector(".js-native-comments > div > iframe");
			comments?.contentDocument?.location.reload();
		}),
	);
	system.addEventListener("change", () => {
		if (current() === "auto") apply("auto", false);
	});
	apply(current(), false);
};

// Header: the "scrolled" look once the page leaves the top
const setUpHeader = header => {
	const update = () => header.toggleAttribute("data-scrolled", window.scrollY > 4);
	update();
	window.addEventListener("scroll", throttleToFrame(update), { passive: true });
};

// Main navigation: the items that do not fit in the bar move to the « Plus » popover (copies; the
// originals are hidden), and back when there is room again. « Plus » shows when it has something.
const setUpNavOverflow = header => {
	const list = header.querySelector("[data-nav-list]");
	const more = header.querySelector("[data-nav-more]");
	const overflow = header.querySelector("[data-nav-overflow]");
	if (!list || !more || !overflow) return;
	const items = [...list.querySelectorAll(":scope > [data-nav-item]")];
	const hasSecondary = Boolean(header.querySelector("[data-more-menu] .nav-list--secondary"));
	const nav = list.closest("nav");

	const layout = () => {
		items.forEach(item => (item.hidden = false));
		overflow.replaceChildren();
		more.hidden = !hasSecondary;
		if (!nav || nav.offsetParent === null) return;
		const fits = () => list.scrollWidth <= nav.clientWidth + 1;
		const moved = [];
		if (!fits()) more.hidden = false;
		for (let i = items.length - 1; i >= 0 && !fits(); i--) {
			items[i].hidden = true;
			moved.unshift(items[i]);
		}
		moved.forEach(item => {
			const copy = item.cloneNode(true);
			copy.hidden = false;
			copy.removeAttribute("data-nav-item");
			overflow.append(copy);
		});
		overflow.hidden = moved.length === 0;
		more.hidden = !hasSecondary && moved.length === 0;
	};

	// The bar's room depends on its other parts: lay it out when the bar changes size
	new ResizeObserver(throttleToFrame(layout)).observe(header.querySelector(".site-header__bar") || header);
	layout();
};

// Ghost's announcement bar ({{ghost_head}} adds #announcement-bar-root at the start of <body>)
// goes right before the header, after the skip link, and scrolls away with the page.
const placeAnnouncementBar = header => {
	const bar = document.getElementById("announcement-bar-root");
	if (bar && header) header.before(bar);
};

onReady(() => {
	if (isRTL()) {
		document.documentElement.setAttribute("dir", "rtl");
		document.documentElement.classList.add("rtl");
	}

	const header = document.getElementById("site-header");
	setUpThemeSwitch();
	setUpBookmarks();
	setUpTransitions();
	setUpPrefetch();

	if (header) {
		placeAnnouncementBar(header);
		setUpHeader(header);
		setUpNavOverflow(header);

		const moreButton = header.querySelector("[data-more-button]");
		const moreMenu = header.querySelector("[data-more-menu]");
		if (moreButton && moreMenu) setUpPopover(moreButton, moreMenu);
	}

	// Phones: the menu sheet (a popover: Escape and a click outside close it)
	const menuButton = document.querySelector("[data-menu-button]");
	const menu = document.querySelector("[data-mobile-menu]");
	if (menuButton && menu) {
		const sheet = setUpPopover(menuButton, menu, {
			place: false,
			onToggle: open => {
				menuButton.setAttribute("aria-expanded", String(open));
				if (open) requestAnimationFrame(() => menu.querySelector("[data-menu-close]")?.focus());
			},
		});
		menu.querySelector("[data-menu-close]")?.addEventListener("click", () => {
			if (!Object.hasOwn(HTMLElement.prototype, "popover")) sheet.close();
			menuButton.focus();
		});
		// Following a link inside the page closes the sheet
		menu.addEventListener("click", event => {
			if (event.target.closest("a")) sheet.close();
		});
	}
});
