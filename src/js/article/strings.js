// Small helpers shared by the article modules: the strings the template puts in data-* attributes,
// the polite live region, the clipboard.

// The element carrying the strings: the article (post.hbs) or a reference document (pages/document.hbs)
export const article = () => document.querySelector("[data-article], [data-document]");

// The string in data-<name> of the article (post.hbs and pages/document.hbs translate them), with {key}
// placeholders filled
export const text = (name, values = {}) => {
	let value = article()?.dataset[name] || "";
	for (const [key, replacement] of Object.entries(values)) value = value.replaceAll(`{${key}}`, replacement);
	return value;
};

// Reads a sentence to screen readers (post.hbs: [data-article-live], aria-live="polite")
export const announce = message => {
	const live = document.querySelector("[data-article-live]");
	if (!live) return;
	live.textContent = "";
	requestAnimationFrame(() => (live.textContent = message));
};

// Writes text to the clipboard; resolves to false when the browser refuses
export const copyText = async value => {
	try {
		await navigator.clipboard.writeText(value);
		return true;
	} catch {
		return false;
	}
};

// Turns a heading's text into an id ("Mise en place" -> "mise-en-place"), unique in the page
export const slugify = (value, taken = id => document.getElementById(id)) => {
	const base =
		String(value)
			.toLowerCase()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "section";
	let id = base;
	for (let i = 2; taken(id); i++) id = `${base}-${i}`;
	return id;
};
