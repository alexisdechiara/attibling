// Prefetch on intent: when the pointer rests on a link of the site, a finger touches it or the keyboard
// focuses it, the browser fetches the page ahead, so the click shows it almost at once.
// - Speculation Rules where supported (prefetch, "moderate" eagerness: hover of ~200 ms, pointer down,
//   focus), added from here so that the conditions below apply;
// - elsewhere a small fallback adding <link rel="prefetch"> on hover (80 ms), touchstart and focus.
// Never with Save-Data, a 2G connection or prefers-reduced-data. Only same-site links that are plain
// page loads: never Ghost Admin (/ghost/), the members' API and magic links (/members/), unsubscribe,
// feeds, files and images (/content/, /assets/), links with a query (?) or a fragment (#, Portal's
// #/portal/... links included), sign-out (data-members-signout), Portal buttons (data-portal), links
// opening elsewhere (target), downloads, rel="nofollow" / "external", or an element marked
// data-no-prefetch (also on a parent).
export const EXCLUDE = [
	'[href*="/ghost/"]',
	'[href*="/members/"]',
	'[href*="/unsubscribe"]',
	'[href*="/email/"]',
	'[href*="/r/"]',
	'[href*="/rss"]',
	'[href*="/feed"]',
	'[href*="/content/"]',
	'[href*="/assets/"]',
	'[href*="?"]',
	'[href*="#"]',
	'[href^="javascript:"]',
	"[data-members-signout]",
	"[data-portal]",
	"[data-no-prefetch]",
	"[data-no-prefetch] *",
	"[target]",
	"[download]",
	'[rel~="nofollow"]',
	'[rel~="external"]',
].join(", ");

export const rules = () => ({
	prefetch: [
		{
			source: "document",
			where: { and: [{ href_matches: "/*" }, { not: { selector_matches: EXCLUDE } }] },
			eagerness: "moderate",
		},
	],
});

// Save-Data, slow connections, prefers-reduced-data
export const saveData = () => {
	const connection = navigator.connection;
	return Boolean(
		connection?.saveData ||
		/(^|-)2g$/.test(connection?.effectiveType || "") ||
		window.matchMedia("(prefers-reduced-data: reduce)").matches,
	);
};

const eligible = link => {
	if (!link || !link.href || link.origin !== location.origin || link.matches(EXCLUDE)) return false;
	return link.href !== location.href.split("#")[0];
};

const setUpFallback = () => {
	const done = new Set();
	let timer = null;
	const prefetch = link => {
		if (!eligible(link) || done.has(link.href) || done.size >= 20) return;
		done.add(link.href);
		const hint = document.createElement("link");
		hint.rel = "prefetch";
		hint.href = link.href;
		document.head.append(hint);
	};
	const linkOf = event => event.target.closest?.("a[href]");
	document.addEventListener("pointerover", event => {
		if (event.pointerType !== "mouse") return;
		const link = linkOf(event);
		clearTimeout(timer);
		if (link) timer = setTimeout(() => prefetch(link), 80);
	});
	document.addEventListener("pointerout", () => clearTimeout(timer));
	document.addEventListener("touchstart", event => prefetch(linkOf(event)), { passive: true });
	document.addEventListener("focusin", event => prefetch(linkOf(event)));
};

export const setUpPrefetch = () => {
	if (saveData()) return "off";
	if (HTMLScriptElement.supports?.("speculationrules")) {
		const script = document.createElement("script");
		script.type = "speculationrules";
		script.textContent = JSON.stringify(rules());
		document.head.append(script);
		return "rules";
	}
	setUpFallback();
	return "fallback";
};
