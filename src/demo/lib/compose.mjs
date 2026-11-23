// Builds the HTML body of a post from the prose pools. Deterministic (seeded per post slug).
// Image placeholders look like {{img:c01-wide.jpg}} and are replaced by the seed once uploaded.
import { SENTENCES, HEADINGS, H3, QUOTES } from "./prose.mjs";

function hash(str) {
	let h = 2166136261;
	for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}
function mulberry32(a) {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A deck that deals each item once, reshuffles when empty. */
function deck(items, rnd) {
	let pile = [];
	return () => {
		if (!pile.length) {
			pile = items.slice();
			for (let i = pile.length - 1; i > 0; i--) {
				const j = Math.floor(rnd() * (i + 1));
				[pile[i], pile[j]] = [pile[j], pile[i]];
			}
		}
		return pile.pop();
	};
}

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const words = html =>
	html
		.replace(/<[^>]+>/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
const card = html => `<!--kg-card-begin: html-->${html}<!--kg-card-end: html-->`;

export function figure({ img, width = "regular", caption = "", alt = "" }) {
	const cls = width === "regular" ? "" : ` kg-width-${width}`;
	return `<figure class="kg-card kg-image-card${cls}"><img src="{{img:${img}}}" class="kg-image" alt="${esc(alt)}" loading="lazy" width="{{w:${img}}}" height="{{h:${img}}}">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
}

export function enBref(items, ia = false) {
	return card(
		`<ol class="en-bref"${ia ? ' data-source="ia"' : ""}>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ol>`,
	);
}

export function ficheTest(f) {
	const dl = f.infos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
	const li = a => a.map(x => `<li>${esc(x)}</li>`).join("");
	return card(
		`<aside class="fiche-test"${f.type ? ` data-type="${f.type}"` : ""}>` +
			`<p class="fiche-test__type">Fiche de test</p>` +
			`<h2 class="fiche-test__titre">${esc(f.titre)}</h2>` +
			`<p class="fiche-test__note"><strong>${f.note}</strong>/${f.sur || 10}</p>` +
			`<dl class="fiche-test__infos">${dl}</dl>` +
			`<div class="fiche-test__plus"><p>Points forts</p><ul>${li(f.plus)}</ul></div>` +
			`<div class="fiche-test__moins"><p>Points faibles</p><ul>${li(f.moins)}</ul></div>` +
			`<p class="fiche-test__verdict"><strong>Verdict</strong> · ${esc(f.verdict)}</p>` +
			`</aside>`,
	);
}

/**
 * post: { slug, subject, domain, extra (other pools), words, lead, blocks: {afterSection: [html...]}, ... }
 * blocks keys: "top" (before the first section), numbers (after section N), "end".
 */
export function composeBody(post) {
	const rnd = mulberry32(hash(post.slug));
	const subject = post.subject || post.title;
	const domains = [post.domain, ...(post.extra || [])];
	const sentDecks = Object.fromEntries(
		["generic", ...domains].map(d => [d, deck(SENTENCES[d] || SENTENCES.generic, rnd)]),
	);
	const headDecks = Object.fromEntries(
		["generic", ...domains].map(d => [d, deck(HEADINGS[d] || HEADINGS.generic, rnd)]),
	);
	const h3deck = deck(H3, rnd);
	const quoteDeck = deck(QUOTES, rnd);
	const usedHeads = new Set();

	const sentence = () => {
		const r = rnd();
		const d = r < 0.62 ? domains[Math.floor(rnd() * domains.length)] : "generic";
		return sentDecks[d]().replaceAll("{s}", subject);
	};
	const paragraph = () => {
		const n = 3 + Math.floor(rnd() * 3);
		const out = [];
		for (let i = 0; i < n; i++) out.push(sentence());
		let text = esc(out.join(" "));
		if (rnd() < 0.12) text = text.replace(/\b(\w{6,})\b/, "<strong>$1</strong>");
		if (rnd() < 0.08) text = text.replace(/\b(\w{7,})\b/, "<em>$1</em>");
		return `<p>${text}</p>`;
	};
	const heading = () => {
		for (let k = 0; k < 40; k++) {
			const d = rnd() < 0.7 ? domains[Math.floor(rnd() * domains.length)] : "generic";
			const h = headDecks[d]();
			if (!usedHeads.has(h)) {
				usedHeads.add(h);
				return h;
			}
		}
		return `Chapitre ${usedHeads.size + 1}`;
	};
	const list = () => {
		const n = 3 + Math.floor(rnd() * 3);
		const items = [];
		for (let i = 0; i < n; i++) {
			const s = sentence().replace(/[.:]$/, "");
			items.push(s.length > 90 ? s.split(/[,;]/)[0] : s);
		}
		return `<ul>${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
	};

	const parts = [];
	const blocks = post.blocks || {};
	if (blocks.top) parts.push(...blocks.top);
	if (post.lead) parts.push(`<p>${post.lead}</p>`);
	parts.push(paragraph());

	const target = post.words || 500;
	const perSection = post.long ? 230 : 190;
	const sections = Math.max(2, Math.round((target - 90) / perSection));
	const slugId = t =>
		t
			.toLowerCase()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	for (let s = 1; s <= sections; s++) {
		const h = heading();
		parts.push(`<h2 id="${slugId(h)}">${esc(h)}</h2>`);
		parts.push(paragraph());
		if (post.long && s % 2 === 0) {
			const h3 = h3deck();
			parts.push(`<h3 id="${slugId(h3)}-${s}">${esc(h3)}</h3>`);
			parts.push(paragraph());
		}
		if (rnd() < 0.5 || post.long) parts.push(paragraph());
		if (post.long && s % 3 === 1) parts.push(`<h3 id="${slugId("detail")}-${s}-b">${esc(h3deck())}</h3>`, paragraph());
		if (post.longList && s === 2) parts.push(list());
		if (post.quote && s === Math.ceil(sections / 2)) parts.push(`<blockquote>${esc(quoteDeck())}</blockquote>`);
		if (blocks[s]) parts.push(...blocks[s]);
	}
	if (blocks.end) parts.push(...blocks.end);
	return parts.join("\n");
}
