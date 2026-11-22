// Generic page (page.hbs) and reference document (pages/document.hbs): content enhancements (loose text,
// embed ratios, galleries, zoomable images), tables that scroll sideways on narrow screens, and, on a
// document, its table of contents, heading links and print button (document.js, loaded only there).
import mediumZoom from "medium-zoom";
import {
	setEmbedRatios,
	adjustImageGallery,
	managePostImages,
	makeImagesZoomable,
	markPrintLinks,
	onReady,
	runEach,
	wrapLooseText,
} from "./helpers";

// A table wider than the column scrolls inside its own box (not the page); the box is focusable only
// while it overflows, so the keyboard can scroll it too. A table with a header row is also prepared to
// be read as stacked rows on phones (pages/content.css): each cell gets its column's name (data-label)
// and explicit table roles, which some browsers drop when the CSS changes how a table is displayed.
const stackable = table => {
	const headers = [...(table.tHead?.rows[0]?.cells || [])].map(cell => cell.textContent.trim());
	if (headers.length < 2) return false;
	const roles = { TABLE: "table", THEAD: "rowgroup", TBODY: "rowgroup", TR: "row", TH: "columnheader", TD: "cell" };
	table.setAttribute("role", "table");
	table.querySelectorAll("thead, tbody, tr, th, td").forEach(el => el.setAttribute("role", roles[el.tagName]));
	for (const row of table.tBodies[0]?.rows || []) {
		[...row.cells].forEach((cell, i) => headers[i] && (cell.dataset.label = headers[i]));
	}
	return true;
};

const wrapTables = content => {
	content.querySelectorAll(":scope > table").forEach(table => {
		const box = document.createElement("div");
		box.className = "table-scroll";
		if (stackable(table)) box.classList.add("table-scroll--stack");
		table.before(box);
		box.append(table);
		const update = () => {
			if (box.scrollWidth > box.clientWidth + 1) box.tabIndex = 0;
			else box.removeAttribute("tabindex");
		};
		update();
		new ResizeObserver(update).observe(box);
	});
};

onReady(() => {
	// Each on its own (runEach): content the theme did not foresee must not cost the reader the rest
	runEach(
		...[...document.querySelectorAll(".gh-content")].flatMap(content => [
			() => wrapLooseText(content),
			() => wrapTables(content),
			() => markPrintLinks(content),
		]),
		setEmbedRatios,
		adjustImageGallery,
		managePostImages,
		() => makeImagesZoomable(mediumZoom),
	);

	const documentRoot = document.querySelector("[data-document]");
	if (documentRoot) import("./document").then(({ setUpDocument }) => setUpDocument(documentRoot));

	// « Cookies et confidentialité » (partials/privacy/page.hbs): what this browser holds, and the choices
	const privacy = document.querySelector("[data-privacy-page]");
	if (privacy) {
		import("./privacy/controls").then(({ setUpControls, setUpStoredTable }) => {
			privacy.querySelectorAll("[data-privacy-nojs]").forEach(el => (el.hidden = true));
			privacy.querySelectorAll("[data-privacy-js]").forEach(el => (el.hidden = false));
			const controls = privacy.querySelector("[data-privacy-controls]");
			if (controls) setUpControls(controls, { allProviders: true });
			const held = privacy.querySelector("[data-privacy-held]");
			if (held) setUpStoredTable(held);
		});
	}
});
