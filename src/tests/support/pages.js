// Ready-made `render` options for harness.open(): the theme's templates with the sample site.
//   open({ render: home() })                         home page, visitor
//   open({ render: home({ member: true }) })         home page, signed-in member
//   open({ render: home({ site: { top: false } }) }) createSite() options
//   open({ render: paged(2) })                       /page/2/
//   open({ render: template("tag") })                another template with a matching context
import { createSite, indexContext } from "./site.js";

const MEMBER = { uuid: "member-1", email: "reader@example.com", name: "Reader", paid: false };

export const DEFAULT_CUSTOM = { use_geekly_logo: true };

// pages: the site's pages for {{#get "pages"}} (default none), e.g. [{ slug: "newsletter", url: "/newsletter/" }]
export const home = ({ member = false, site = {}, custom = DEFAULT_CUSTOM, pages = [], ...rest } = {}) => {
	const data = createSite(site);
	data.pages = pages;
	return {
		template: "index",
		site: data,
		context: indexContext(data),
		contexts: ["home"],
		member: member ? MEMBER : null,
		custom,
		currentUrl: "/",
		...rest,
	};
};

export const paged = (page, { member = false, site = {}, custom = DEFAULT_CUSTOM } = {}) => {
	const data = createSite(site);
	return {
		template: "index",
		site: data,
		context: indexContext(data, { page }),
		contexts: ["paged", "index"],
		member: member ? MEMBER : null,
		custom,
	};
};

// Pages using one of the theme's page templates (page-*.hbs, custom-*.hbs): the page's own data
const PAGE = { title: "Page", html: "<p>Body</p>", custom_excerpt: null };

export const template = (
	name,
	{ member = false, site = {}, custom = DEFAULT_CUSTOM, page = {}, post = {}, paged = false, pages = [] } = {},
) => {
	const data = createSite(site);
	data.pages = pages;
	const pageContext = title => ({ post: { ...PAGE, title, ...post } });
	const contexts = {
		post: { post: { ...data.posts[1], html: "<p>Body</p>" } },
		page: { post: { ...data.posts[3], html: "<p>Body</p>" } },
		tag: { tag: data.tags[1], ...indexContext(data) },
		author: { author: data.authors[0], ...indexContext(data) },
		"page-tags": pageContext("Tags"),
		"page-authors": pageContext("Authors"),
		"page-newsletter": pageContext("Newsletter"),
		"page-abonnement": pageContext("Abonnement"),
		"page-subscribe": pageContext("Subscribe"),
		"page-archives": pageContext("Archives"),
		"page-favoris": pageContext("Saved posts"),
		"page-a-propos": pageContext("About"),
		"error-404": {},
	};
	for (const [custom_, page_] of [
		["custom-tags", "page-tags"],
		["custom-authors", "page-authors"],
		["custom-subscribe", "page-newsletter"],
		["custom-archives", "page-archives"],
		["custom-saved-posts", "page-favoris"],
		["custom-about", "page-a-propos"],
	]) {
		contexts[custom_] = contexts[page_];
	}
	if (paged && contexts[name]?.pagination) {
		Object.assign(contexts[name], indexContext(data, { page: 2 }));
	}
	if (contexts[name]?.post && name !== "post") Object.assign(contexts[name].post, post);
	const ghostContext = name === "error-404" ? "error" : /^(page|custom)-/.test(name) ? "page" : name;
	return {
		template: name,
		site: data,
		context: contexts[name] || {},
		contexts: paged ? ["paged", ghostContext] : [ghostContext],
		member: member ? MEMBER : null,
		custom,
		page: { show_title_and_feature_image: true, ...page },
	};
};
