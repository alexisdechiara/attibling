import $ from "jquery";
import Headroom from "headroom.js";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import shave from "shave";
import GhostContentAPI from "@tryghost/content-api";
import Fuse from "fuse.js/dist/fuse.basic.esm.min.js";
import Swiper, { FreeMode, A11y } from "swiper";
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
	const $nativeComments = $(".js-native-comments > div > iframe")[0];
	const $darkColorsScheme = window.matchMedia("(prefers-color-scheme: dark)");

	let fuse = null;
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

  const trySearchFeature = () => {
    if (typeof ghostSearchApiKey !== 'undefined' && typeof nativeSearchEnabled === 'undefined') {
      getAllPosts(ghostHost, ghostSearchApiKey);
    } else {
      $openSearch.css('visibility', 'hidden');
      $closeSearch.remove();
      $search.remove();
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
			})
			.catch(err => {
				console.log(err);
			});
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

	$inputSearch.on("keyup", () => {
		if ($inputSearch.val().length > 0 && fuse) {
			const results = fuse.search($inputSearch.val());
			const bestResults = results.filter(result => {
				if (result.score <= 0.5) {
					return result;
				}
			});

			let htmlString = "";

			if (bestResults.length > 0) {
				for (let i = 0, len = bestResults.length; i < len; i++) {
					htmlString += `
          <article class="m-result">\
            <a href="${bestResults[i].item.url}" class="m-result__link">\
              <h3 class="m-result__title">${bestResults[i].item.title}</h3>\
              <span class="m-result__date">${formatDate(bestResults[i].item.published_at)}</span>\
            </a>\
          </article>`;
				}

				$searchNoResults.hide();
				$searchResults.html(htmlString);
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
	});

	$themeSwitcher.on("click", () => {
		if (localStorage.getItem("theme") === "light") {
			$setAutoTheme();
		} else if (localStorage.getItem("theme") === "dark") {
			$setLightTheme();
		} else {
			$setDarkTheme();
		}

		if ($nativeComments) {
			$nativeComments.contentDocument.location.reload(true);
		}
	});

	const $resetThemeIcons = () => {
		$(".light-theme-icon").css("display", "none");
		$(".dark-theme-icon").css("display", "none");
		$(".auto-theme-icon").css("display", "none");
	};

	const $setLightTheme = () => {
		console.log("set light theme");
		$resetThemeIcons();
		$("html").attr("data-theme", "light");
		localStorage.setItem("theme", "light");
		$(".light-theme-icon").css("display", "block");
	};

	const $setDarkTheme = () => {
		console.log("set dark theme");
		$resetThemeIcons();
		$("html").attr("data-theme", "dark");
		localStorage.setItem("theme", "dark");
		$(".dark-theme-icon").css("display", "block");
	};

	const $setAutoTheme = () => {
		console.log("set light theme");
		if (window.matchMedia && $darkColorsScheme.matches) {
			$("html").attr("data-theme", "dark");
		} else {
			$("html").attr("data-theme", "light");
		}
		$resetThemeIcons();
		localStorage.setItem("theme", "auto");
		$(".auto-theme-icon").css("display", "block");
	};

	$darkColorsScheme.addEventListener("change", () => {
		$setAutoTheme();
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

	if (localStorage.getItem("theme")) {
		console.log("1");
		if (localStorage.getItem("theme") === "light") {
			$setLightTheme();
		} else if (localStorage.getItem("theme") === "dark") {
			$setDarkTheme();
		} else {
			$setAutoTheme();
		}
	} else {
		console.log("2");
		$setAutoTheme();
	}

	$(window).on("scroll", () => {
		changeHeaderBackground();
	});

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
		if (cover.length >= 1) {
			var windowPosition = $(window).scrollTop();
			windowPosition > 0 ? (coverPosition = Math.floor(windowPosition * 0.5)) : (coverPosition = 0);
			cover.css({
				"-webkit-transform": "translate3d(0, " + coverPosition + "px, 0)",
				transform: "translate3d(0, " + coverPosition + "px, 0)",
			});
		}
	}
	prlx();

	$(window).on({
		scroll: function () {
			prlx();
		},
		resize: function () {
			prlx();
		},
		orientationchange: function () {
			prlx();
		},
	});
});
