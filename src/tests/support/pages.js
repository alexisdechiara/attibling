// Ready-made `render` options for harness.open(): the theme's templates with the sample site.
//   open({ render: home() })                         home page, visitor
//   open({ render: home({ member: true }) })         home page, signed-in member
//   open({ render: home({ site: { top: false } }) }) createSite() options
//   open({ render: paged(2) })                       /page/2/
//   open({ render: template("tag") })                another template with a matching context
import { createSite, indexContext } from "./site.js";

const MEMBER = { uuid: "member-1", email: "reader@example.com", name: "Reader", paid: false };

export const DEFAULT_CUSTOM = { use_geekly_logo: true };

export const home = ({ member = false, site = {}, custom = DEFAULT_CUSTOM, ...rest } = {}) => {
	const data = createSite(site);
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

export const template = (name, { member = false, site = {}, custom = DEFAULT_CUSTOM } = {}) => {
	const data = createSite(site);
	const contexts = {
		post: { post: { ...data.posts[1], html: "<p>Body</p>" } },
		page: { post: { ...data.posts[3], html: "<p>Body</p>" } },
		tag: { tag: data.tags[1], ...indexContext(data) },
		author: { author: data.authors[0], ...indexContext(data) },
		"page-tags": { post: { title: "Tags" } },
		"page-authors": { post: { title: "Authors" } },
		"page-newsletter": { post: { title: "Newsletter" } },
		"error-404": {},
	};
	const ghostContext = { "page-tags": "page", "page-authors": "page", "page-newsletter": "page", "error-404": "error" };
	return {
		template: name,
		site: data,
		context: contexts[name] || {},
		contexts: [ghostContext[name] || name],
		member: member ? MEMBER : null,
		custom,
	};
};
