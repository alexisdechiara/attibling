import $ from "jquery";
import Headroom from "headroom.js";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import shave from "shave";
import GhostContentAPI from "@tryghost/content-api";
import Fuse from 'fuse.js'
import Swiper from 'swiper';
import { FreeMode, A11y } from "swiper/modules";
import "swiper/css";
import { isRTL, formatDate, isMobile } from "./helpers";

$(() => {
	if (isRTL()) {
		$("html").attr("dir", "rtl").addClass("rtl");
	}

	const $body = $("body");
	const $header = $(".js-header");
	const $openMenu = $(".js-open-menu");
	const $closeMenu = $(".js-close-menu");
	const $menu = $(".js-menu");
	const $toggleSubmenu = $(".js-toggle-submenu");
	const $submenuOption = $(".js-submenu-option")[0];
	const $submenu = $(".js-submenu");
	const $recentSlider = $(".js-recent-slider");
	const $openSecondaryMenu = $(".js-open-secondary-menu");
	const $openSearch = $(".js-open-search");
	const $closeSearch = $(".js-close-search");
	const $search = $(".js-search");
	const $inputSearch = $(".js-input-search");
	const $searchResults = $(".js-search-results");
	const $searchNoResults = $(".js-no-results");
	const $themeSwitcher = $(".js-switch-theme");
	const $mainNav = $(".js-main-nav");
	const $mainNavLeft = $(".js-main-nav-left");
	const $newsletterElements = $(".js-newsletter");
	const $darkColorsScheme = window.matchMedia("(prefers-color-scheme: dark)");
	const $reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	let fuse = null;
	let postsRequested = false;
	let submenuIsOpen = false;
	let secondaryMenuTippy = null;

	const showSubmenu = () => {
		$header.addClass("submenu-is-active");
		$toggleSubmenu.addClass("active");
		$submenu.removeClass("closed").addClass("opened");
	};

	const hideSubmenu = () => {
		$header.removeClass("submenu-is-active");
		$toggleSubmenu.removeClass("active");
		$submenu.removeClass("opened").addClass("closed");
	};

	const toggleScrollVertical = () => {
		$body.toggleClass("no-scroll-y");
	};

	const tryToRemoveNewsletter = () => {
		if (typeof disableNewsletter !== "undefined" && disableNewsletter) {
			$newsletterElements.remove();
		}
	};

	const isSearchEnabled = () =>
		typeof ghostSearchApiKey !== "undefined" && typeof nativeSearchEnabled === "undefined";

	const trySearchFeature = () => {
		if (!isSearchEnabled()) {
			$openSearch.css("visibility", "hidden");
			$closeSearch.remove();
			$search.remove();
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
			if (disableOverflow) {
				$mainNav.addClass("toggle-overflow");
				$mainNavLeft.addClass("toggle-overflow");
			} else {
				$mainNav.removeClass("toggle-overflow");
				$mainNavLeft.removeClass("toggle-overflow");
			}
		}
	};

	$openMenu.on("click", () => {
		$header.addClass("mobile-menu-opened");
		$menu.addClass("opened");
		toggleScrollVertical();
	});

	$closeMenu.on("click", () => {
		$header.removeClass("mobile-menu-opened");
		$menu.removeClass("opened");
		toggleScrollVertical();
	});

	$toggleSubmenu.on("click", () => {
		submenuIsOpen = !submenuIsOpen;

		if (submenuIsOpen) {
			showSubmenu();
			$header.removeClass("covered");
		} else {
			hideSubmenu();
			changeHeaderBackground();
		}
	});

	$openSearch.on("click", () => {
		loadPostsOnce();
		$search.addClass("opened");
		setTimeout(() => {
			$inputSearch.trigger("focus");
		}, 400);
		toggleScrollVertical();
	});

	$closeSearch.on("click", () => {
		$inputSearch.trigger("blur");
		$search.removeClass("opened");
		toggleScrollVertical();
	});

	const runSearch = () => {
		if ($inputSearch.val().length > 0 && fuse) {
			const results = fuse.search($inputSearch.val());
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

				$searchNoResults.hide();
				$searchResults.html("");
				$searchResults[0].appendChild(fragment);
				$searchResults.show();
			} else {
				$searchResults.html("");
				$searchResults.hide();
				$searchNoResults.show();
			}
		} else {
			$searchResults.html("");
			$searchResults.hide();
			$searchNoResults.hide();
		}
	};

	$inputSearch.on("keyup", runSearch);

	$themeSwitcher.on("click", () => {
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
	});

	const $resetThemeIcons = () => {
		$(".light-theme-icon").css("display", "none");
		$(".dark-theme-icon").css("display", "none");
		$(".auto-theme-icon").css("display", "none");
	};

	const $setLightTheme = (persist = true) => {
		$resetThemeIcons();
		$("html").attr("data-theme", "light");
		if (persist) {
			localStorage.setItem("theme", "light");
		}
		$(".light-theme-icon").css("display", "block");
	};

	const $setDarkTheme = (persist = true) => {
		$resetThemeIcons();
		$("html").attr("data-theme", "dark");
		if (persist) {
			localStorage.setItem("theme", "dark");
		}
		$(".dark-theme-icon").css("display", "block");
	};

	const $setAutoTheme = (persist = true) => {
		if (window.matchMedia && $darkColorsScheme.matches) {
			$("html").attr("data-theme", "dark");
		} else {
			$("html").attr("data-theme", "light");
		}
		$resetThemeIcons();
		if (persist) {
			localStorage.setItem("theme", "auto");
		}
		$(".auto-theme-icon").css("display", "block");
	};

	$darkColorsScheme.addEventListener("change", () => {
		const storedTheme = localStorage.getItem("theme");

		if (!storedTheme || storedTheme === "auto") {
			$setAutoTheme(false);
		}
	});

	$themeSwitcher.on("mouseenter", () => {
		toggleDesktopTopbarOverflow(true);
	});

	$themeSwitcher.on("mouseleave", () => {
		toggleDesktopTopbarOverflow(false);
	});

	$(window).on("click", e => {
		if (submenuIsOpen) {
			if ($submenuOption && !$submenuOption.contains(e.target)) {
				submenuIsOpen = false;
				hideSubmenu();
			}
		}
	});

	$(document).on("keyup", e => {
		if (e.key === "Escape" && $search.hasClass("opened")) {
			$closeSearch.trigger("click");
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

	window.addEventListener("scroll", throttleToFrame(() => changeHeaderBackground()), { passive: true });

	const changeHeaderBackground = () => {
		if ($header.hasClass("with-picture")) {
			if ($header.offset().top < $header.height()) {
				$header.addClass("covered");
			} else {
				$header.removeClass("covered");
			}
		} else {
			$header.removeClass("covered");
		}
	};

	if ($header.length > 0) {
		const headroom = new Headroom($header[0], {
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

	if ($recentSlider.length > 0) {
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

	if ($openSecondaryMenu.length > 0) {
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

	var cover = $(".m-hero__picture");
	var coverPosition = 0;

	function prlx() {
		if (cover.length >= 1 && !$reducedMotion.matches) {
			var windowPosition = $(window).scrollTop();
			windowPosition > 0 ? (coverPosition = Math.floor(windowPosition * 0.5)) : (coverPosition = 0);
			cover.css({
				"-webkit-transform": "translate3d(0, " + coverPosition + "px, 0)",
				transform: "translate3d(0, " + coverPosition + "px, 0)",
			});
		}
	}
	prlx();

	const throttledPrlx = throttleToFrame(prlx);

	window.addEventListener("scroll", throttledPrlx, { passive: true });
	window.addEventListener("resize", throttledPrlx, { passive: true });
	window.addEventListener("orientationchange", throttledPrlx, { passive: true });
});
