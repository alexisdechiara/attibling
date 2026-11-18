import { isRTL, isMobile, onReady, contentHeight, setUpPopover, throttleToFrame } from "./helpers";

onReady(() => {
	if (isRTL()) {
		document.documentElement.setAttribute("dir", "rtl");
		document.documentElement.classList.add("rtl");
	}

	const $body = document.body;
	const $header = document.querySelector(".js-header");
	const $openMenu = document.querySelectorAll(".js-open-menu");
	const $closeMenu = document.querySelectorAll(".js-close-menu");
	const $menu = document.querySelectorAll(".js-menu");
	const $toggleSubmenu = document.querySelectorAll(".js-toggle-submenu");
	const $submenu = document.querySelectorAll(".js-submenu");
	const $openSecondaryMenu = document.querySelector(".js-open-secondary-menu");
	const $themeSwitcher = document.querySelectorAll(".js-switch-theme");
	const $newsletterElements = document.querySelectorAll(".js-newsletter");
	const $darkColorsScheme = window.matchMedia("(prefers-color-scheme: dark)");

	let secondaryMenu = null;
	let submenu = null;

	// The submenu is a popover (see setUpPopover); these classes drive its look and animation
	const onSubmenuToggle = open => {
		$header.classList.toggle("submenu-is-active", open);
		$toggleSubmenu.forEach(el => el.classList.toggle("active", open));
		$submenu.forEach(el => {
			el.classList.toggle("opened", open);
			el.classList.toggle("closed", !open);
		});

		if (open) {
			$header.classList.remove("covered");
		} else {
			changeHeaderBackground();
		}
	};

	const toggleScrollVertical = () => {
		$body.classList.toggle("no-scroll-y");
	};

	const tryToRemoveNewsletter = () => {
		if (typeof disableNewsletter !== "undefined" && disableNewsletter) {
			$newsletterElements.forEach(el => el.remove());
		}
	};

	// The mobile menu covers the page: focus moves into it, Escape closes it and focus goes back
	// to the button that opened it.
	let menuOpener = null;

	const isMenuOpen = () => $header.classList.contains("mobile-menu-opened");

	const closeMenu = () => {
		$header.classList.remove("mobile-menu-opened");
		$menu.forEach(menu => menu.classList.remove("opened"));
		toggleScrollVertical();
		menuOpener?.focus();
		menuOpener = null;
	};

	$openMenu.forEach(el =>
		el.addEventListener("click", () => {
			$header.classList.add("mobile-menu-opened");
			$menu.forEach(menu => menu.classList.add("opened"));
			toggleScrollVertical();
			menuOpener = el;
			$closeMenu[0]?.focus();
		}),
	);

	$closeMenu.forEach(el => el.addEventListener("click", closeMenu));

	document.addEventListener("keydown", e => {
		if (e.key === "Escape" && isMenuOpen()) {
			closeMenu();
		}
	});

	$themeSwitcher.forEach(el =>
		el.addEventListener("click", () => {
			if (localStorage.getItem("theme") === "light") {
				$setAutoTheme();
			} else if (localStorage.getItem("theme") === "dark") {
				$setLightTheme();
			} else {
				$setDarkTheme();
			}

			const nativeComments = document.querySelector(".js-native-comments > div > iframe");

			if (nativeComments && nativeComments.contentDocument) {
				nativeComments.contentDocument.location.reload();
			}
		}),
	);

	const $showThemeIcon = theme => {
		["light", "dark", "auto"].forEach(name => {
			document.querySelectorAll(`.${name}-theme-icon`).forEach(icon => {
				icon.style.display = name === theme ? "block" : "none";
			});
		});
	};

	const $setLightTheme = (persist = true) => {
		document.documentElement.setAttribute("data-theme", "light");
		if (persist) {
			localStorage.setItem("theme", "light");
		}
		$showThemeIcon("light");
	};

	const $setDarkTheme = (persist = true) => {
		document.documentElement.setAttribute("data-theme", "dark");
		if (persist) {
			localStorage.setItem("theme", "dark");
		}
		$showThemeIcon("dark");
	};

	const $setAutoTheme = (persist = true) => {
		if (window.matchMedia && $darkColorsScheme.matches) {
			document.documentElement.setAttribute("data-theme", "dark");
		} else {
			document.documentElement.setAttribute("data-theme", "light");
		}
		if (persist) {
			localStorage.setItem("theme", "auto");
		}
		$showThemeIcon("auto");
	};

	$darkColorsScheme.addEventListener("change", () => {
		const storedTheme = localStorage.getItem("theme");

		if (!storedTheme || storedTheme === "auto") {
			$setAutoTheme(false);
		}
	});

	if (localStorage.getItem("theme") === "light") {
		$setLightTheme(false);
	} else if (localStorage.getItem("theme") === "dark") {
		$setDarkTheme(false);
	} else {
		$setAutoTheme(false);
	}

	window.addEventListener(
		"scroll",
		throttleToFrame(() => changeHeaderBackground()),
		{ passive: true },
	);

	const changeHeaderBackground = () => {
		if (!$header) {
			return;
		}

		if ($header.classList.contains("with-picture")) {
			const headerTop = $header.getBoundingClientRect().top + window.scrollY;

			$header.classList.toggle("covered", headerTop < contentHeight($header));
		} else {
			$header.classList.remove("covered");
		}
	};

	// Hide the header while scrolling down and bring it back on the way up, with the classes and
	// thresholds headroom.js used: a scroll of more than 40px down (20px up) between two frames,
	// and always shown within 15px of the top.
	const onHeaderUnpin = () => {
		if (!isMobile()) {
			secondaryMenu?.close();
			submenu?.close();
		}
	};

	if ($header) {
		let lastScrollY = Math.round(window.scrollY);

		const updateHeader = () => {
			const scrollY = Math.round(window.scrollY);
			const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
			const down = scrollY > lastScrollY;
			const top = scrollY <= 15;
			const toleranceExceeded = Math.abs(scrollY - lastScrollY) > (down ? 40 : 20);

			// Ignore the rubber-band overscroll of touch devices
			if (scrollY >= 0 && scrollY <= maxScrollY) {
				$header.classList.toggle("headroom--top", top);
				$header.classList.toggle("headroom--not-top", !top);

				if (down && !top && toleranceExceeded) {
					if (!$header.classList.contains("headroom--unpinned")) {
						$header.classList.remove("headroom--pinned");
						$header.classList.add("headroom--unpinned");
						onHeaderUnpin();
					}
				} else if ((!down && toleranceExceeded) || top) {
					$header.classList.replace("headroom--unpinned", "headroom--pinned");
				}
			}

			lastScrollY = scrollY;
		};

		$header.classList.add("headroom");
		updateHeader();
		window.addEventListener("scroll", throttleToFrame(updateHeader), { passive: true });
	}

	// Ghost's announcement bar ({{ghost_head}} adds #announcement-bar-root and fills it later) goes at
	// the top of the fixed header; --announcement-bar-height keeps the page and the submenu below it.
	const $announcementBar = document.getElementById("announcement-bar-root");

	if ($announcementBar && $header) {
		$header.classList.add("with-announcement-bar");
		$header.prepend($announcementBar);
		new ResizeObserver(() => {
			document.documentElement.style.setProperty("--announcement-bar-height", `${$announcementBar.offsetHeight}px`);
		}).observe($announcementBar);
	}

	if ($toggleSubmenu[0] && $submenu[0]) {
		submenu = setUpPopover($toggleSubmenu[0], $submenu[0], { onToggle: onSubmenuToggle, place: false });
	}

	if ($openSecondaryMenu) {
		secondaryMenu = setUpPopover($openSecondaryMenu, document.querySelector(".js-secondary-menu"));
	}

	tryToRemoveNewsletter();
});
