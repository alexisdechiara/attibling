import Headroom from "headroom.js";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import shave from "shave";
import GhostContentAPI from "@tryghost/content-api";
import Fuse from "fuse.js";
import Swiper from "swiper";
import { FreeMode, A11y } from "swiper/modules";
import "swiper/css";
import { isRTL, formatDate, isMobile, onReady, contentHeight } from "./helpers";

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
	const $openSearch = document.querySelectorAll(".js-open-search");
	const $closeSearch = document.querySelector(".js-close-search");
	const $search = document.querySelector(".js-search");
	const $inputSearch = document.querySelector(".js-input-search");
	const $searchResults = document.querySelector(".js-search-results");
	const $searchNoResults = document.querySelector(".js-no-results");
	const $themeSwitcher = document.querySelectorAll(".js-switch-theme");
	const $mainNav = document.querySelectorAll(".js-main-nav, .js-main-nav-left");
	const $newsletterElements = document.querySelectorAll(".js-newsletter");
	const $darkColorsScheme = window.matchMedia("(prefers-color-scheme: dark)");
	const $reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	let fuse = null;
	let postsRequested = false;
	let submenuIsOpen = false;
	let secondaryMenuTippy = null;

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

	const showElement = (el, visible) => {
		if (el) {
			el.style.display = visible ? "block" : "none";
		}
	};

	const tryToRemoveNewsletter = () => {
		if (typeof disableNewsletter !== "undefined" && disableNewsletter) {
			$newsletterElements.forEach(el => el.remove());
		}
	};

	const isSearchEnabled = () => typeof ghostSearchApiKey !== "undefined" && typeof nativeSearchEnabled === "undefined";

	const trySearchFeature = () => {
		if (!isSearchEnabled()) {
			$openSearch.forEach(el => (el.style.visibility = "hidden"));
			$closeSearch?.remove();
			$search?.remove();
		}
	};

	const loadPostsOnce = () => {
		if (!postsRequested && isSearchEnabled()) {
			postsRequested = true;
			getAllPosts(ghostHost, ghostSearchApiKey);
		}
	};

	const getAllPosts = (host, key) => {
		const api = new GhostContentAPI({
			url: host,
			key,
			version: "v5.0",
		});
		const allPosts = [];
		const fuseOptions = {
			shouldSort: true,
			ignoreLocation: true,
			findAllMatches: true,
			includeScore: true,
			minMatchCharLength: 2,
			keys: ["title", "custom_excerpt", "tags.name"],
		};

		api.posts
			.browse({
				limit: "all",
				include: "tags",
				fields: "id, title, url, published_at, custom_excerpt",
			})
			.then(posts => {
				for (let i = 0, len = posts.length; i < len; i++) {
					allPosts.push(posts[i]);
				}

				fuse = new Fuse(allPosts, fuseOptions);
				runSearch();
			})
			.catch(err => {
				postsRequested = false;
				console.log(err);
			});
	};

	const buildSearchResult = item => {
		const article = document.createElement("article");
		const link = document.createElement("a");
		const title = document.createElement("h3");
		const date = document.createElement("span");

		article.className = "m-result";
		link.className = "m-result__link";
		link.href = item.url;
		title.className = "m-result__title";
		title.textContent = item.title;
		date.className = "m-result__date";
		date.textContent = formatDate(item.published_at);

		link.append(title, date);
		article.appendChild(link);

		return article;
	};

	const toggleDesktopTopbarOverflow = disableOverflow => {
		if (!isMobile()) {
			$mainNav.forEach(el => el.classList.toggle("toggle-overflow", disableOverflow));
		}
	};

	const closeSearch = () => {
		$inputSearch?.blur();
		$search?.classList.remove("opened");
		toggleScrollVertical();
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

	$openSearch.forEach(el =>
		el.addEventListener("click", () => {
			loadPostsOnce();
			$search?.classList.add("opened");
			setTimeout(() => {
				$inputSearch?.focus();
			}, 400);
			toggleScrollVertical();
		}),
	);

	$closeSearch?.addEventListener("click", closeSearch);

	const runSearch = () => {
		if (!$inputSearch || !$searchResults) {
			return;
		}

		$searchResults.replaceChildren();

		if ($inputSearch.value.length > 0 && fuse) {
			const results = fuse.search($inputSearch.value);
			const bestResults = results.filter(result => {
				if (result.score <= 0.5) {
					return result;
				}
			});

			if (bestResults.length > 0) {
				const fragment = document.createDocumentFragment();

				for (let i = 0, len = bestResults.length; i < len; i++) {
					fragment.appendChild(buildSearchResult(bestResults[i].item));
				}

				showElement($searchNoResults, false);
				$searchResults.appendChild(fragment);
				showElement($searchResults, true);
			} else {
				showElement($searchResults, false);
				showElement($searchNoResults, true);
			}
		} else {
			showElement($searchResults, false);
			showElement($searchNoResults, false);
		}
	};

	$inputSearch?.addEventListener("keyup", runSearch);

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

	$themeSwitcher.forEach(el => {
		el.addEventListener("mouseenter", () => {
			toggleDesktopTopbarOverflow(true);
		});

		el.addEventListener("mouseleave", () => {
			toggleDesktopTopbarOverflow(false);
		});
	});

	window.addEventListener("click", e => {
		if (submenuIsOpen) {
			if ($submenuOption && !$submenuOption.contains(e.target)) {
				submenuIsOpen = false;
				hideSubmenu();
			}
		}
	});

	document.addEventListener("keyup", e => {
		if (e.key === "Escape" && $search && $search.classList.contains("opened")) {
			closeSearch();
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

	if ($header) {
		const headroom = new Headroom($header, {
			tolerance: {
				down: 40,
				up: 20,
			},
			offset: 15,
			onUnpin: () => {
				if (!isMobile() && secondaryMenuTippy) {
					const desktopSecondaryMenuTippy = secondaryMenuTippy[0];

					if (desktopSecondaryMenuTippy && desktopSecondaryMenuTippy.state.isVisible) {
						desktopSecondaryMenuTippy.hide();
					}
				}
			},
		});
		headroom.init();
	}

	if ($recentSlider) {
		const recentSwiper = new Swiper(".js-recent-slider", {
			modules: [FreeMode, A11y],
			freeMode: true,
			slidesPerView: "auto",
			a11y: true,
			on: {
				init: function () {
					shave(".js-recent-article-title", 50);
				},
			},
		});
	}

	if ($openSecondaryMenu) {
		const template = document.getElementById("secondary-navigation-template");

		secondaryMenuTippy = tippy(".js-open-secondary-menu", {
			appendTo: document.body,
			content: template.innerHTML,
			allowHTML: true,
			arrow: true,
			trigger: "click",
			interactive: true,
			onShow() {
				toggleDesktopTopbarOverflow(true);
			},
			onHidden() {
				toggleDesktopTopbarOverflow(false);
			},
		});
	}

	tippy(".js-tooltip");

	shave(".js-article-card-title", 100);
	shave(".js-article-card-title-no-image", 250);

	tryToRemoveNewsletter();
	trySearchFeature();

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
