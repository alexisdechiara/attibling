// Guard: the seed never publishes a link to another site. Ghost sends a webmention to every external link
// found in a published post, so a demo post with a real URL would notify that site.

const LOCAL = /^(?:https?:)?\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:[/?#]|$)/i;
const ANY_URL = /(?:https?:)?\/\/[^\s"'<>)]+/gi;

/** The http(s) and protocol-relative URLs of `html` that do not point to localhost / 127.0.0.1. */
export function findExternalUrls(html) {
	const found = [];
	for (const match of String(html || "").matchAll(ANY_URL)) {
		if (!LOCAL.test(match[0])) found.push(match[0]);
	}
	return found;
}

/** Throws when `html` holds an external URL; `label` says which post or page. */
export function assertNoExternal(label, html) {
	const [first] = findExternalUrls(html);
	if (first) throw new Error(`${label} : lien externe interdit (${first}). Le seed ne publie que des liens locaux.`);
}
