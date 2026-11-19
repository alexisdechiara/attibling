// « Archives » page (partials/pages/archives.hbs): the server renders every post as a row of one flat list
// (readable without JavaScript). This script groups the rows by year (headings) and month (label on the
// first row of a month), shows the filter bar and filters in the browser:
//   - year buttons (« Toutes », then every year found in the rows, newest first)
//   - title search (accents and case ignored)
//   - « Rubrique » list (a public tag)
//   - ?tag=<slug> in the address: any tag, internal ones included (a series #serie-x is hash-serie-x),
//     shown oldest first with a label and a button that clears it
// The live count says how many posts are shown; with a year chosen, buttons lead to the next and previous
// years. The year, search and tag are kept in the address (?year=, ?q=, ?tag=) so a filtered view can be
// shared or reloaded.
import { onReady } from "./helpers";

const normalize = text =>
	String(text || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();

const setUpArchives = root => {
	const list = root.querySelector("[data-archives-list]");
	const bar = root.querySelector("[data-archives-bar]");
	if (!list || !bar) return;
	const items = [...list.querySelectorAll("[data-archive-item]")];
	const yearsBox = root.querySelector("[data-archives-years]");
	const search = root.querySelector("[data-archives-search]");
	const select = root.querySelector("[data-archives-tag]");
	const count = root.querySelector("[data-archives-count]");
	const empty = root.querySelector("[data-archives-empty]");
	const filterBox = root.querySelector("[data-archives-filter]");
	const filterLabel = root.querySelector("[data-archives-filter-label]");
	const clearFilter = root.querySelector("[data-archives-clear]");
	const yearNav = root.querySelector("[data-archives-yearnav]");
	const newer = root.querySelector("[data-archives-newer]");
	const older = root.querySelector("[data-archives-older]");
	const internalNames = new Map(
		[...root.querySelectorAll("[data-archives-internal] [data-slug]")].map(li => [li.dataset.slug, li.textContent]),
	);
	const { i18nNone, i18nOne, i18nMany, i18nAll, i18nOlder, i18nSeries, i18nTag } = root.dataset;

	const data = items.map(item => ({
		item,
		year: item.dataset.year,
		month: item.dataset.month,
		monthName: item.dataset.monthName,
		tags: (item.dataset.tags || "").split(/\s+/).filter(Boolean),
		title: normalize(item.querySelector(".archive-item__title")?.textContent),
	}));
	const years = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);

	const params = new URLSearchParams(location.search);
	const state = {
		year: years.includes(params.get("year")) ? params.get("year") : "",
		query: params.get("q") || "",
		tag: params.get("tag") || "",
	};

	// Month label element of each row (shown on the first row of a month)
	data.forEach(d => {
		const label = document.createElement("span");
		label.className = "archive-item__month";
		label.setAttribute("aria-hidden", "true");
		label.textContent = d.monthName ? d.monthName[0].toUpperCase() + d.monthName.slice(1) : "";
		d.item.prepend(label);
	});

	// Year buttons
	const yearButton = (value, text) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "button button--s archives-year";
		button.dataset.year = value;
		button.textContent = text;
		button.addEventListener("click", () => {
			state.year = value;
			update();
		});
		return button;
	};
	yearsBox.replaceChildren(yearButton("", i18nAll), ...years.map(y => yearButton(y, y)));

	// A tag given in the address that the « Rubrique » list does not hold (internal tags): add it
	const tagName = slug => {
		const option = [...select.options].find(o => o.value === slug);
		if (option) return option.textContent.replace(/\s*\(\d+\)$/, "");
		return internalNames.get(slug) || slug;
	};
	const isSeries = slug => slug.startsWith("hash-serie-");
	const seriesName = slug =>
		tagName(slug)
			.replace(/^#serie-/i, "")
			.replace(/-/g, " ");
	if (state.tag && ![...select.options].some(o => o.value === state.tag)) {
		const option = new Option(isSeries(state.tag) ? seriesName(state.tag) : tagName(state.tag), state.tag);
		select.add(option);
	}
	select.value = state.tag;
	search.value = state.query;

	const plural = n => (n === 0 ? i18nNone : n === 1 ? i18nOne : i18nMany).replace("%", n);

	// Groups: one section per year, rebuilt after each change (the rows are moved, never copied)
	const groups = document.createElement("div");
	groups.className = "archives-groups";
	groups.setAttribute("data-archives-groups", "");
	list.replaceWith(groups);
	root.classList.add("archives--grouped");

	const render = visible => {
		const ordered = state.tag && isSeries(state.tag) ? [...visible].reverse() : visible;
		const sections = [];
		let current = null;
		let lastMonth = null;
		ordered.forEach(d => {
			if (!current || current.year !== d.year) {
				const section = document.createElement("section");
				section.className = "archives-group";
				section.setAttribute("aria-labelledby", `archives-year-${d.year}`);
				const heading = document.createElement("h2");
				heading.className = "archives-group__year";
				heading.id = `archives-year-${d.year}`;
				heading.textContent = d.year;
				const ol = document.createElement("ol");
				ol.className = "archives-group__list";
				ol.setAttribute("role", "list");
				section.append(heading, ol);
				current = { year: d.year, ol };
				sections.push(section);
				lastMonth = null;
			}
			d.item.toggleAttribute("data-first-month", d.month !== lastMonth);
			lastMonth = d.month;
			current.ol.append(d.item);
		});
		groups.replaceChildren(...sections);
	};

	const update = ({ push = true } = {}) => {
		const query = normalize(state.query);
		const visible = data.filter(
			d =>
				(!state.year || d.year === state.year) &&
				(!query || d.title.includes(query)) &&
				(!state.tag || d.tags.includes(state.tag)),
		);
		render(visible);
		empty.hidden = visible.length > 0;
		count.textContent = plural(visible.length);
		yearsBox
			.querySelectorAll("button")
			.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.year === state.year)));

		// The ?tag= label: series and internal tags (a public tag reads in the « Rubrique » list already,
		// but the label also gives the way back)
		if (state.tag) {
			filterLabel.textContent = isSeries(state.tag)
				? i18nSeries.replace("%", seriesName(state.tag))
				: i18nTag.replace("%", tagName(state.tag));
		}
		filterBox.hidden = !state.tag;

		// Next / previous year
		const index = years.indexOf(state.year);
		yearNav.hidden = !state.year || years.length < 2;
		newer.hidden = index <= 0;
		older.hidden = index < 0 || index >= years.length - 1;
		if (index > 0) newer.textContent = years[index - 1];
		if (index >= 0 && index < years.length - 1) older.textContent = i18nOlder.replace("%", years[index + 1]);

		if (push) {
			const url = new URL(location.href);
			for (const [key, value] of [
				["year", state.year],
				["q", state.query],
				["tag", state.tag],
			]) {
				if (value) url.searchParams.set(key, value);
				else url.searchParams.delete(key);
			}
			history.replaceState(history.state, "", url);
		}
	};

	search.addEventListener("input", () => {
		state.query = search.value;
		update();
	});
	select.addEventListener("change", () => {
		state.tag = select.value;
		update();
	});
	clearFilter.addEventListener("click", () => {
		state.tag = "";
		select.value = "";
		update();
		select.focus();
	});
	const goTo = year => {
		state.year = year;
		update();
		yearsBox.querySelector(`[data-year="${year}"]`)?.focus();
		root.querySelector(".archives-bar")?.scrollIntoView({ block: "start" });
	};
	newer.addEventListener("click", () => goTo(years[years.indexOf(state.year) - 1]));
	older.addEventListener("click", () => goTo(years[years.indexOf(state.year) + 1]));

	bar.hidden = false;
	update({ push: false });
};

onReady(() => {
	const root = document.querySelector("[data-archives]");
	if (root) setUpArchives(root);
});
