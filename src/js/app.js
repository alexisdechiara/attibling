import Swiper from "swiper";
import { FreeMode, A11y } from "swiper/modules";
import "swiper/css";
import { isRTL, isMobile, onReady, contentHeight, setUpPopover } from "./helpers";

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
	const $submenuOption = document.querySelector(".js-submenu-option");
	const $submenu = document.querySelectorAll(".js-submenu");
	const $recentSlider = document.querySelector(".js-recent-slider");
	const $openSecondaryMenu = document.querySelector(".js-open-secondary-menu");
	const $themeSwitcher = document.querySelectorAll(".js-switch-theme");
	const $newsletterElements = document.querySelectorAll(".js-newsletter");
	const $darkColorsScheme = window.matchMedia("(prefers-color-scheme: dark)");
	const $reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	let submenuIsOpen = false;
	let secondaryMenu = null;

	const showSubmenu = () => {
		$header.classList.add("submenu-is-active");
		$toggleSubmenu.forEach(el => el.classList.add("active"));
		$submenu.forEach(el => {
			el.classList.remove("closed");
			el.classList.add("opened");
		});
	};

	const hideSubmenu = () => {
		$header.classList.remove("submenu-is-active");
		$toggleSubmenu.forEach(el => el.classList.remove("active"));
		$submenu.forEach(el => {
			el.classList.remove("opened");
			el.classList.add("closed");
		});
	};

	const toggleScrollVertical = () => {
		$body.classList.toggle("no-scroll-y");
	};

	const tryToRemoveNewsletter = () => {
		if (typeof disableNewsletter !== "undefined" && disableNewsletter) {
			$newsletterElements.forEach(el => el.remove());
		}
	};

	$openMenu.forEach(el =>
		el.addEventListener("click", () => {
			$header.classList.add("mobile-menu-opened");
			$menu.forEach(menu => menu.classList.add("opened"));
			toggleScrollVertical();
		}),
	);

	$closeMenu.forEach(el =>
		el.addEventListener("click", () => {
			$header.classList.remove("mobile-menu-opened");
			$menu.forEach(menu => menu.classList.remove("opened"));
			toggleScrollVertical();
		}),
	);

	$toggleSubmenu.forEach(el =>
		el.addEventListener("click", () => {
			submenuIsOpen = !submenuIsOpen;

			if (submenuIsOpen) {
				showSubmenu();
				$header.classList.remove("covered");
			} else {
				hideSubmenu();
				changeHeaderBackground();
			}
		}),
	);

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

	window.addEventListener("click", e => {
		if (submenuIsOpen) {
			if ($submenuOption && !$submenuOption.contains(e.target)) {
				submenuIsOpen = false;
				hideSubmenu();
			}
		}
	});

	if (localStorage.getItem("theme") === "light") {
		$setLightTheme(false);
	} else if (localStorage.getItem("theme") === "dark") {
		$setDarkTheme(false);
	} else {
		$setAutoTheme(false);
	}

	const throttleToFrame = callback => {
		let ticking = false;

		return () => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(() => {
					ticking = false;
					callback();
				});
			}
		};
	};

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

	if ($recentSlider) {
		const recentSwiper = new Swiper(".js-recent-slider", {
			modules: [FreeMode, A11y],
			freeMode: true,
			slidesPerView: "auto",
			a11y: true,
		});
	}

	if ($openSecondaryMenu) {
		secondaryMenu = setUpPopover($openSecondaryMenu, document.querySelector(".js-secondary-menu"));
	}

	tryToRemoveNewsletter();

	var cover = document.querySelectorAll(".m-hero__picture");
	var coverPosition = 0;

	function prlx() {
		if (cover.length >= 1 && !$reducedMotion.matches) {
			var windowPosition = window.scrollY;
			windowPosition > 0 ? (coverPosition = Math.floor(windowPosition * 0.5)) : (coverPosition = 0);
			cover.forEach(el => {
				el.style.transform = "translate3d(0, " + coverPosition + "px, 0)";
			});
		}
	}
	prlx();

	const throttledPrlx = throttleToFrame(prlx);

	window.addEventListener("scroll", throttledPrlx, { passive: true });
	window.addEventListener("resize", throttledPrlx, { passive: true });
	window.addEventListener("orientationchange", throttledPrlx, { passive: true });
});
