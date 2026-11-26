// Series box (partials/article/series.hbs): the series name and planned total from the tag's
// description (« Calendrier de l'Avent 2025 · total: 24 »), « Partie N sur T », the progress bar,
// « N parties à venir », and the condensed list of a long series (first, ⋯ n parts, previous,
// current, next, ⋯ n parts, last), unfolded by its « ⋯ » buttons.

const CONDENSE_ABOVE = 7;

export const parseDescription = description => {
	const value = String(description || "");
	const match = value.match(/total\s*:\s*(\d+)/i);
	return {
		total: match ? Number(match[1]) : 0,
		name: value
			.replace(/total\s*:\s*\d+/i, "")
			.replace(/[\s\-–—|·•,;:]+$/u, "")
			.replace(/^[\s\-–—|·•,;:]+/u, "")
			.trim(),
	};
};

const fill = (template, values) =>
	Object.entries(values).reduce((out, [key, value]) => out.replaceAll(`{${key}}`, value).replace("%", value), template);

export const setUpSeries = box => {
	const published = Number(box.dataset.published) || 0;
	const { total: planned, name } = parseDescription(box.dataset.description);
	const total = Math.max(planned, published);
	const list = box.querySelector("[data-series-list]");
	const count = box.querySelector("[data-series-count]");
	const current = Number(count?.dataset.current) || 0;

	if (name) box.querySelector("[data-series-name]").textContent = name;

	if (count && total !== published) {
		count.querySelector(".series__count-long").textContent = box.dataset.labelCount
			.replace("{n}", current)
			.replace("{total}", total);
		count.querySelector(".series__count-short").textContent = `${current} / ${total}`;
		box.querySelector(".series__bar")?.style.setProperty("--total", total);
	}

	// Parts announced but not published yet
	if (total > published) {
		const item = document.createElement("li");
		item.className = "series__upcoming";
		item.dataset.seriesUpcoming = "";
		item.textContent = fill(box.dataset.labelUpcoming, { n: total - published });
		list.append(item);
	}

	// Long series: keep the first, previous, current, next and last parts; fold the others
	const items = [...list.querySelectorAll(":scope > .series__item")];
	if (items.length <= CONDENSE_ABOVE) return;
	const index = items.findIndex(item => item.matches(".series__item--current"));
	const keep = new Set([0, items.length - 1, index - 1, index, index + 1].filter(i => i >= 0));
	const runs = [];
	items.forEach((item, i) => {
		if (keep.has(i)) return;
		const last = runs.at(-1);
		if (last && last.end === i - 1) {
			last.items.push(item);
			last.end = i;
		} else runs.push({ items: [item], end: i });
	});

	runs
		.filter(run => run.items.length > 1)
		.forEach(run => {
			const holder = document.createElement("li");
			const button = document.createElement("button");
			button.type = "button";
			button.className = "series__more";
			button.setAttribute("aria-expanded", "false");
			button.textContent = fill(box.dataset.labelMore, { n: run.items.length });
			holder.append(button);
			run.items[0].before(holder);
			run.items.forEach(item => (item.hidden = true));
			button.addEventListener("click", () => {
				run.items.forEach(item => (item.hidden = false));
				holder.remove();
				run.items[0].querySelector("a")?.focus();
			});
		});
};
