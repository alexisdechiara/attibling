// Arrangement of the « Tags » page (partials/pages/tags.hbs): a bento grid whose large cells and order
// change on every visit, drawn from a seed.
//
//  - layout(seed, tags, columns) is pure: tags = [{ posts, image, description }] in the server's order (most posts
//    first); it returns { order, cells } where order is the visual (and DOM) order as indexes into tags,
//    the same for every number of columns, and cells = [{ index, x, y, w, h }] in that order: an exact
//    tiling of a rectangle `columns` wide (no hole, nothing outside the grid). Cells come in row-major
//    order of their top-left corner, so CSS grid's ordinary (sparse) auto-placement of the spans alone,
//    in DOM order, puts every cell exactly there: the reading and focus order match the visual order.
//    Seed 0 is the default arrangement: the server's order, the largest cells for the tags with the most
//    posts (and an image).
//  - arrange(grid, seed) applies it to the grid: moves the cells into the new order and gives each one
//    its spans for 2, 4 and 6 columns (--w2/--h2, --w4/--h4, --w6/--h6; the CSS picks by breakpoint).
//  - prepaint() runs from an inline script of <head>, ahead of the style sheets (partials/tags/prepaint.hbs):
//    as soon as the parser has built the grid, and without waiting for the style sheets as a script
//    placed after the grid would, it arranges it and asks for the pictures of its first rows. It keeps
//    the seed of this page view in history.state, so going back to the page shows the same
//    arrangement; a new visit or a reload draws a new one; Save-Data keeps the default.
//
// No import here: the build (vite.config.mjs) inlines this file into partials/tags/prepaint.hbs.
// src/js/tags.js imports it for the « Mélanger » button.

export const COLUMNS = [2, 4, 6];

export const STATE_KEY = "attiblingTagsSeed";

// mulberry32: a small seeded generator of floats in [0, 1)
export const random = seed => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

// Share of the cells that want to be 2×2, and 2×1 or 1×2, per number of columns
const SHARES = { 2: [0.05, 0.2], 4: [0.09, 0.22], 6: [0.11, 0.22] };

// Weighted random order (Efraimidis–Spirakis keys u^(1/w)): tags with more posts or an image tend to
// come first without always doing so
const shuffle = (rnd, weights) =>
	weights
		.map((w, i) => [Math.pow(rnd(), 1 / w), i])
		.sort((a, b) => b[0] - a[0] || a[1] - b[1])
		.map(k => k[1]);

const logPosts = tag => Math.log2(1 + Math.max(0, tag.posts || 0));

export const order = (seed, tags) => {
	if (!seed) return tags.map((_, i) => i);
	return shuffle(
		random(seed),
		tags.map(t => 1 + logPosts(t) / 2 + (t.image ? 0.5 : 0)),
	);
};

// The size each tag would like at this number of columns: the most prominent ones 2×2, the next ones
// 2×1 or 1×2 (tall rather for a picture, wide rather for a name on a tint), the others 1×1. Large cells
// go preferably to tags with a picture and many posts, so a large empty cell is rare.
const desires = (seed, tags, columns) => {
	const rnd = random(seed ^ 0x5bd1e995);
	let rank;
	let tall;
	if (!seed) {
		rank = tags
			.map((t, i) => [(t.image ? 2 : 1) * (1 + (t.posts || 0)), i])
			.sort((a, b) => b[0] - a[0] || a[1] - b[1])
			.map(k => k[1]);
		tall = tags.map(t => Boolean(t.image));
	} else {
		rank = shuffle(
			rnd,
			tags.map(t => (t.image ? 5 : 1) * (1 + logPosts(t) / 3)),
		);
		tall = tags.map(t => rnd() < (t.image ? 0.6 : 0.12));
	}
	const [big, long] = SHARES[columns] || SHARES[6];
	const nBig = Math.round(tags.length * big);
	const nLong = Math.round(tags.length * long);
	// A 2×2 cell needs something to show: a picture, a description or one of the three largest counts
	const top = [...tags.keys()].sort((a, b) => (tags[b].posts || 0) - (tags[a].posts || 0)).slice(0, 3);
	const showy = i => tags[i].image || tags[i].description || top.includes(i);
	const want = [];
	let bigs = 0;
	let longs = 0;
	for (const index of rank) {
		if (bigs < nBig && showy(index)) {
			want[index] = [2, 2];
			bigs++;
		} else if (longs < nLong + nBig - bigs) {
			want[index] = tall[index] ? [1, 2] : [2, 1];
			longs++;
		} else want[index] = [1, 1];
	}
	// Round the wished area up to full rows with 1×1 cells made 2×1 or 1×2 (pictures first, in rank
	// order), so that the last row rarely needs stretched cells without a picture
	let missing = (columns - (want.reduce((sum, [w, h]) => sum + w * h, 0) % columns)) % columns;
	for (const pass of [true, false]) {
		for (const index of rank) {
			if (!missing) break;
			if (want[index][0] * want[index][1] === 1 && Boolean(tags[index].image) === pass) {
				want[index] = tags[index].image && tall[index] ? [1, 2] : [2, 1];
				missing--;
			}
		}
	}
	return want;
};

// Sizes tried for a cell, its wish first; wider single-row cells only when nothing else can close the
// grid (very few tags)
const STANDARD = [
	[1, 1],
	[2, 1],
	[1, 2],
	[2, 2],
];
const candidates = ([w, h]) => {
	const smaller = STANDARD.filter(([x, y]) => x <= w && y <= h && (x !== w || y !== h)).reverse();
	const larger = STANDARD.filter(([x, y]) => (x > w || y > h) && !(x <= w && y <= h));
	return [[w, h], ...smaller, ...larger];
};

// Free runs (lengths) of a row bit mask
const runs = (mask, columns) => {
	const out = [];
	let length = 0;
	for (let x = 0; x < columns; x++) {
		if ((mask >> x) & 1) {
			if (length) out.push(length);
			length = 0;
		} else length++;
	}
	if (length) out.push(length);
	return out;
};

// Can `m` more cells, placed from the first free cell (row r), complete the rectangle? Sufficient test:
// with single-row cells of width 1 to maxW, a run of L free cells takes from ceil(L/maxW) to L cells, a
// new full row from ceil(columns/maxW) to columns. Cells are at most 2 tall, so only rows r and r + 1
// can be partly filled.
const feasible = (rows, r, m, maxW, columns) => {
	let min = 0;
	let max = 0;
	for (const mask of [rows[r] || 0, rows[r + 1] || 0]) {
		if (!mask) continue;
		for (const length of runs(mask, columns)) {
			min += Math.ceil(length / maxW);
			max += length;
		}
	}
	if (!m) return !max;
	const perRow = Math.ceil(columns / maxW);
	return Math.max(0, Math.ceil((m - max) / columns)) <= Math.floor((m - min) / perRow);
};

const firstFree = (rows, r, columns) => {
	const full = (1 << columns) - 1;
	while ((rows[r] || 0) === full) r++;
	let x = 0;
	while (((rows[r] || 0) >> x) & 1) x++;
	return [r, x];
};

const fits = (rows, r, x, w, h, columns) => {
	if (x + w > columns) return false;
	const bits = ((1 << w) - 1) << x;
	for (let y = r; y < r + h; y++) if ((rows[y] || 0) & bits) return false;
	return true;
};

const put = (rows, r, x, w, h) => {
	const next = rows.slice();
	const bits = ((1 << w) - 1) << x;
	for (let y = r; y < r + h; y++) next[y] = (next[y] || 0) | bits;
	return next;
};

// Packs the wished sizes, in order, each at the first free cell, with the largest size (wish first)
// that still lets the remaining cells complete the rectangle
const pack = (wishes, columns) => {
	let rows = [];
	let r = 0;
	const cells = [];
	wishes.forEach((wish, i) => {
		const left = wishes.length - i - 1;
		let x;
		[r, x] = firstFree(rows, r, columns);
		const wide = [];
		for (let w = 3; w <= columns; w++) wide.push([w, 1]);
		const tries = [
			[2, candidates(wish).filter(([w]) => w <= columns)],
			[columns, [...candidates(wish), ...wide].filter(([w]) => w <= columns)],
		];
		for (const [maxW, sizes] of tries) {
			const found = sizes.find(([w, h]) => {
				if (!fits(rows, r, x, w, h, columns)) return false;
				const next = put(rows, r, x, w, h);
				return feasible(next, firstFree(next, r, columns)[0], left, maxW, columns);
			});
			if (found) {
				const [w, h] = found;
				rows = put(rows, r, x, w, h);
				cells.push({ x, y: r, w, h });
				return;
			}
		}
		// Unreachable (a single-row cell always closes the row), kept as a guard
		rows = put(rows, r, x, 1, 1);
		cells.push({ x, y: r, w: 1, h: 1 });
	});
	return cells;
};

export const layout = (seed, tags, columns) => {
	const visual = order(seed, tags);
	const want = desires(seed, tags, columns);
	const cells = pack(
		visual.map(i => want[i]),
		columns,
	).map((cell, k) => ({ index: visual[k], ...cell }));
	return { order: visual, cells };
};

// The grid's cells, in the server's order (their first rank is kept in data-rank)
const cellsOf = grid => {
	const cells = [...grid.children].filter(el => el.hasAttribute("data-tag"));
	cells.forEach((cell, i) => {
		if (!cell.dataset.rank) {
			cell.dataset.rank = i;
			// A tint per tag for the cells without a picture, the same whatever the order
			cell.style.setProperty("--tile-tint", `var(--tint-${(i % 4) + 1})`);
		}
	});
	return cells.sort((a, b) => a.dataset.rank - b.dataset.rank);
};

// A vertical scrollbar, which the page has not got yet when the estimate is made, narrows the grid by up to
// 1.2% (15 px at 1350 px): a cell of 399.7 px that asked for 405 would get the next rendition up for the
// sake of 5 px, so the width asked for is 1.5% under the estimate (a picture 1.5% too small is not seen)
const SCROLLBAR_ALLOWANCE = 0.985;

// The width a picture needs to cover its cell (object-fit: cover): its box's width, or, when the cell is tall,
// the width at which the picture is as high as the cell: height × the picture's ratio (its width and height
// attributes when the markup has them, else 16:9)
const coverWidth = (img, width, height) => {
	const ratio = Number(img.getAttribute("width")) / Number(img.getAttribute("height")) || 16 / 9;
	return `${Math.ceil(Math.max(width, height * ratio) * SCROLLBAR_ALLOWANCE)}px`;
};

// first = { columns, rows, column, gap, row } (firstRows): the cells that start in these rows at this number
// of columns load their pictures at once (loadFirst), each at the width of its cell: sizes="auto" (the
// template) needs a layout, which the page does not have yet, and the browser would take the whole
// screen's width instead. Every cell's picture gets its sizes (a cell 1 column wide and 2 high needs a picture
// three times wider than the cell) at the number of columns of the screen, which `auto` cannot know: it only
// takes the width of the box. (SCROLLBAR_ALLOWANCE: a hair under the estimate)
export const arrange = (grid, seed, first) => {
	const cells = cellsOf(grid);
	const tags = cells.map(cell => ({
		posts: Number(cell.dataset.posts) || 0,
		image: cell.hasAttribute("data-image"),
		description: Boolean(cell.querySelector(".tag-cell__description")),
	}));
	const geometry = first || firstRows();
	let visual = [];
	let early = [];
	let current = [];
	for (const columns of COLUMNS) {
		const result = layout(seed, tags, columns);
		visual = result.order;
		for (const { index, w, h } of result.cells) {
			cells[index].style.setProperty(`--w${columns}`, w);
			cells[index].style.setProperty(`--h${columns}`, h);
		}
		if (geometry.columns === columns) current = result.cells;
		if (first?.columns === columns) early = result.cells.filter(c => c.y < first.rows);
	}
	grid.append(...visual.map(i => cells[i]));
	grid.dataset.seed = seed;
	grid.setAttribute("data-arranged", "");
	const { column, gap, row } = geometry;
	for (const c of current) {
		const img = cells[c.index].querySelector("img");
		if (img) img.sizes = coverWidth(img, c.w * column + (c.w - 1) * gap, c.h * row + (c.h - 1) * gap);
	}
	// The largest cell first: it is the largest picture of the screen
	early.sort((a, b) => b.w * b.h - a.w * a.h);
	loadFirst(early.map(c => cells[c.index].querySelector("img")));
	return seed;
};

// Count of tags in the heading (data-i18n-one / -many on the grid)
export const showCount = grid => {
	const n = cellsOf(grid).length;
	const count = document.querySelector("[data-tags-count]");
	if (count && n) count.textContent = (n === 1 ? grid.dataset.i18nOne : grid.dataset.i18nMany).replace("%", n);
};

export const saveSeed = seed => {
	const state = history.state && typeof history.state === "object" ? history.state : {};
	history.replaceState({ ...state, [STATE_KEY]: seed }, "");
};

// The template gives every picture loading="lazy", since the server cannot know which cells come first:
// these ones load at once, the first of the list (if no picture was put first yet) before the others
const loadFirst = images => {
	let first = !document.querySelector(".tag-cell__image[fetchpriority=high]");
	for (const img of images) {
		if (!img) continue;
		if (first) img.setAttribute("fetchpriority", "high");
		first = false;
		img.loading = "eager";
	}
};

// How many rows of the grid are on the first screen for sure, and its number of columns, before any
// style sheet has arrived (no layout to ask, see prepaint): the numbers of src/css/tags.css (columns,
// gap, row height) and of src/css/base/tokens.css (--gutter, --page-max), with the grid starting at
// GRID_TOP px at most (under the site header and the page's heading). Too few rows only leaves
// pictures to loadFirstScreen; too many would download pictures nobody sees.
const GRID_TOP = 420;
export const firstRows = () => {
	const columns = matchMedia("(width >= 64rem)").matches ? 6 : matchMedia("(width >= 40rem)").matches ? 4 : 2;
	const gap = 8 + columns;
	const width = Math.min(innerWidth - 2 * Math.min(56, Math.max(16, innerWidth * 0.04)), 1328);
	const column = (width - (columns - 1) * gap) / columns;
	const row = Math.max(112, column * 0.8);
	return { columns, column, gap, row, rows: Math.max(1, Math.ceil((innerHeight - GRID_TOP) / (row + gap))) };
};

// Once the page is laid out: the pictures of every cell on the first screen, whatever firstRows guessed.
// Cells are in row-major order, so the first one below the screen ends the list.
export const loadFirstScreen = grid => {
	const images = [];
	for (const img of grid.querySelectorAll("img")) {
		if (img.getBoundingClientRect().top >= innerHeight) break;
		if (img.loading === "lazy") images.push(img);
	}
	loadFirst(images);
};

// Called from <head>. The grid does not exist yet: an observer waits for the parser to close it (something
// follows it). The parser runs the observer before the next script of the page, and a script waits for
// the style sheets: so the grid is arranged, and its first pictures requested, while the style sheets
// are still on their way. Until then the grid is hidden (data-tags-arranging: no visible reshuffle) and
// the places of the count and of « Mélanger » are kept (nothing moves when they appear).
// Returns the function the script right after the grid calls (partials/pages/tags.hbs), once the
// style sheets are there: it adds the pictures of the first screen that the estimate left out.
export const prepaint = () => {
	const root = document.documentElement;
	let grid = null;
	root.setAttribute("data-tags-arranging", "");
	const run = () => {
		if (grid) return;
		const found = document.querySelector("[data-tag-bento]");
		if (!found || (!found.nextSibling && document.readyState === "loading")) return;
		grid = found;
		observer.disconnect();
		try {
			const kept = history.state && history.state[STATE_KEY];
			const navigation = performance.getEntriesByType("navigation")[0];
			const saving = navigator.connection?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches;
			let seed = navigation?.type === "back_forward" && typeof kept === "number" ? kept : null;
			if (seed === null) seed = saving ? 0 : crypto.getRandomValues(new Uint32Array(1))[0] || 1;
			arrange(grid, seed, firstRows());
			showCount(grid);
			// Shuffling needs something to move: not with no tag, or a single one
			if (cellsOf(grid).length >= 2) document.querySelector("[data-tags-shuffle]")?.removeAttribute("hidden");
			saveSeed(seed);
		} catch {
			// The server's order stays (CSS dense packing)
		}
		root.removeAttribute("data-tags-arranging");
	};
	const observer = new MutationObserver(run);
	observer.observe(root, { childList: true, subtree: true });
	// A page without the grid (or cut short): nothing stays hidden
	document.addEventListener("DOMContentLoaded", () => {
		run();
		observer.disconnect();
		root.removeAttribute("data-tags-arranging");
	});
	return () => {
		run();
		if (grid) loadFirstScreen(grid);
	};
};
