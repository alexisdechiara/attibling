// Copy buttons of the article: the link of each section (h2, h3 of the content) and the code of each
// code block. A copied state shows for 2 seconds and the live region announces it. Where the browser
// refuses the clipboard, a heading's button simply follows its anchor.
import { announce, copyText, slugify, text } from "./strings";

const DONE_MS = 2000;

const icon = paths =>
	`<svg class="m-icon-svg icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
const LINK = icon(
	'<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
);
const CHECK = icon('<path d="m5 12 5 5 9-10"/>');
const COPY = icon(
	'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
);

// Headings of the content get an id when they have none (headings inside HTML cards)
export const ensureHeadingIds = content => {
	content.querySelectorAll("h2, h3").forEach(heading => {
		if (!heading.id) heading.id = slugify(heading.textContent);
	});
};

export const setUpHeadingLinks = content => {
	content.querySelectorAll(":scope > :is(h2, h3)[id]").forEach(heading => {
		const button = document.createElement("button");
		const title = heading.textContent.trim();
		let timer = null;
		button.type = "button";
		button.className = "heading-link";
		button.setAttribute("aria-label", `${text("copyLink")} « ${title} »`);
		button.innerHTML = `<span class="heading-link__icon">${LINK}</span><span class="heading-link__done">${CHECK}</span>`;
		heading.append(button);

		button.addEventListener("click", async () => {
			const url = new URL(location.href);
			url.hash = heading.id;
			if (!(await copyText(url.href))) {
				location.hash = heading.id;
				return;
			}
			clearTimeout(timer);
			heading.querySelector(".heading-link__toast")?.remove();
			const toast = document.createElement("span");
			toast.className = "heading-link__toast";
			toast.setAttribute("aria-hidden", "true");
			toast.textContent = text("linkCopied");
			heading.append(toast);
			button.dataset.state = "copied";
			announce(text("linkCopied"));
			timer = setTimeout(() => {
				delete button.dataset.state;
				toast.remove();
			}, DONE_MS);
		});
	});
};

export const setUpCodeBlocks = content => {
	content.querySelectorAll("pre").forEach(pre => {
		if (pre.closest(".code-block")) return;
		// A long line scrolls sideways: the keyboard can reach and scroll the block too
		if (!pre.hasAttribute("tabindex")) pre.tabIndex = 0;
		const code = pre.querySelector("code") || pre;
		const language = [...code.classList].find(name => name.startsWith("language-"))?.slice(9);
		const block = document.createElement("div");
		block.className = "code-block";
		const bar = document.createElement("div");
		bar.className = "code-block__bar";
		if (language) {
			const label = document.createElement("span");
			label.className = "code-block__language";
			label.textContent = language;
			bar.append(label);
		}
		const button = document.createElement("button");
		button.type = "button";
		button.className = "code-block__copy";
		button.setAttribute("aria-label", text("copyCode"));
		const show = done => {
			button.innerHTML = `${done ? CHECK : COPY}<span>${text(done ? "copied" : "copy")}</span>`;
		};
		show(false);
		bar.append(button);
		pre.before(block);
		block.append(bar, pre);

		let timer = null;
		button.addEventListener("click", async () => {
			if (!(await copyText(code.textContent))) return;
			clearTimeout(timer);
			button.dataset.state = "copied";
			show(true);
			announce(text("codeCopied"));
			timer = setTimeout(() => {
				delete button.dataset.state;
				show(false);
			}, DONE_MS);
		});
	});
};
