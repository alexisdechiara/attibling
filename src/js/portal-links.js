// The theme's « S'abonner » and « Se connecter » buttons lead to its subscription page
// (partials/subscribe-href.hbs marks them data-subscribe-page) and never carry data-portal. Other links
// may still ask Ghost's Portal window for the same thing: one typed in a post (#/portal/signup), or one
// written by a partial that does not use subscribe-href. When the page exists, they lead there too:
//   - their href becomes the page (#inscription or #connexion) and data-portal goes (hover, copy, open
//     in a new tab show the page);
//   - Ghost's Portal script (deferred, from {{ghost_head}}) may have bound a click handler on a
//     data-portal link already: a click on any of these links is caught on the way down (capture on the
//     document, before the link's own handlers) and goes to the page.
// Account links (#/portal/account) keep Portal: Ghost has no other screen for e-mail preferences.
const PORTAL = /#\/portal\/(signup|signin)/;
const SELECTOR =
	'a[data-portal^="signup"], a[data-portal^="signin"], a[href*="#/portal/signup"], a[href*="#/portal/signin"]';
const REROUTED = "data-portal-rerouted";

const actionOf = link => {
	const portal = link.getAttribute("data-portal") || "";
	const match = portal.match(/^(signup|signin)/) || (link.getAttribute("href") || "").match(PORTAL);
	return match ? match[1] : null;
};

export const setUpPortalLinks = (doc = document) => {
	const page = doc.querySelector("a[data-subscribe-page]");
	if (!page) return;
	const base = new URL(page.getAttribute("href"), doc.baseURI);
	base.hash = "";
	const destination = action => `${base.href}#${action === "signin" ? "connexion" : "inscription"}`;

	const reroute = link => {
		const action = actionOf(link);
		if (!action) return;
		link.setAttribute("href", destination(action));
		link.removeAttribute("data-portal");
		link.setAttribute(REROUTED, "");
	};
	doc.querySelectorAll(SELECTOR).forEach(reroute);

	doc.addEventListener(
		"click",
		event => {
			const target = event.target instanceof Element ? event.target : null;
			const link = target?.closest(`${SELECTOR}, a[${REROUTED}]`);
			if (!link) return;
			reroute(link);
			event.stopImmediatePropagation();
			// A new tab or window (modifier keys) opens the rerouted href by itself
			if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			window.location.assign(link.href);
		},
		true,
	);
};
