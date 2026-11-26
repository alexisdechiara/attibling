// Server-side queries: how many {{#get}} each kind of page runs (every one is a database query on an
// uncached page), and that sharing a result between the places that use it does not change the markup.
import { describe, it } from "vite-plus/test";
import assert from "node:assert/strict";
import { renderTemplate, getCalls } from "./support/ghost.js";
import { home, template, DEFAULT_CUSTOM } from "./support/pages.js";
import { article } from "./support/article.js";

const render = options => renderTemplate(options.template, options);
const count = (resource, match) => getCalls(resource, match).length;
// The lookups of the subscription page (the footer and other partials query other pages)
const lookups = () => getCalls("pages").filter(call => call.filter.includes("newsletter")).length;

describe("header queries", () => {
	it("runs the posts, tags and subscription page queries of the header once, not once per use", () => {
		const html = render(template("post"));
		assert.equal(count("posts", { limit: 6 }), 1, "one query of recent posts");
		assert.equal(count("posts", { limit: 4 }), 0, "the phone sheet takes the first four of the same six");
		assert.equal(count("tags", { limit: 12 }), 1, "one query of tags");
		assert.equal(lookups(), 2, "one lookup for the two buttons of the header, one for the two of the teaser");
		assert.equal(html.match(/data-discover-menu/g).length, 1);
		assert.equal(html.match(/class="discover__tags"/g).length, 2, "the tags still show in the panel and the sheet");
	});

	it("asks the pool of recommendations once, for members only", () => {
		const visitor = render(template("post"));
		assert.equal(count("posts", { limit: 24 }), 0, "no pool for a visitor");
		assert.ok(!visitor.includes("data-discover-pool"));
		const member = render(template("post", { member: true }));
		assert.equal(count("posts", { limit: 24 }), 1, "one query for the panel and the sheet");
		assert.equal(member.match(/<template data-discover-pool>/g).length, 1);
		assert.equal(
			member.match(/data-recommended="Recommended for you"/g).length,
			2,
			"the heading of the panel and of the sheet",
		);
	});

	it("shows six posts in the desktop panel and the first four of them in the phone sheet", () => {
		const html = render(template("post"));
		const panel = html.split('id="site-discover"')[1].split("</header>")[0];
		const sheet = html.split('id="site-menu"')[1];
		const rows = part => [...part.split('class="discover__posts"')[1].split("</ul>")[0].matchAll(/<li>/g)].length;
		assert.equal(rows(panel), 6);
		assert.equal(rows(sheet), 4);
		const firstFour = part =>
			[...part.split('class="discover__posts"')[1].matchAll(/href="([^"]+)"/g)].slice(0, 4).map(m => m[1]);
		assert.deepEqual(firstFour(sheet), firstFour(panel));
	});

	it("looks up no subscription page for a member, nor when the setting gives it", () => {
		render(template("post", { member: true }));
		assert.equal(lookups(), 0);
		render(template("post", { custom: { ...DEFAULT_CUSTOM, subscribe_url: "/newsletter/" } }));
		assert.equal(lookups(), 0);
	});
});

describe("a query that is empty or fails", () => {
	const once = html => {
		assert.equal(html.match(/id="site-header"/g)?.length, 1, "one header");
		assert.equal(html.match(/id="site-menu"/g)?.length, 1, "one menu sheet");
		assert.equal(html.match(/id="site-discover"/g)?.length, 1, "one « ••• » panel");
	};
	const variants = {
		"no posts": { site: { adjust: s => (s.posts = []) } },
		"no tags": { site: { adjust: s => (s.tags = []) } },
		"neither posts nor tags": {
			site: {
				adjust: s => {
					s.posts = [];
					s.tags = [];
				},
			},
		},
	};

	for (const [name, site] of Object.entries(variants)) {
		it(`renders the header once with ${name}`, () => {
			once(render(template("tag", site)));
			once(render(home(site)));
		});
	}

	it("renders the header once when its queries fail, for a visitor and a member", () => {
		for (const failing of [["posts"], ["tags"], ["posts", "tags"], ["pages"], ["posts", "tags", "pages"]]) {
			for (const member of [false, true]) {
				const options = template("page-a-propos", { member });
				options.site.failGets = failing;
				once(render(options));
				const index = home({ member });
				index.site.failGets = failing;
				once(render(index));
			}
		}
	});

	it("renders the article when the authors query fails or finds nobody", () => {
		const failing = article();
		failing.site.failGets = ["authors"];
		const html = render(failing);
		assert.ok(html.includes('id="main"') && html.includes("data-article"));
		const none = article();
		none.site.authors = [];
		assert.ok(render(none).includes("data-article"));
	});

	it("renders the archives list when the posts query fails, and says how many posts are not listed", () => {
		const failing = template("page-archives");
		failing.site.failGets = ["posts"];
		assert.ok(render(failing).includes("data-archives-list"));
		const long = render({ ...template("page-archives", { site: { extra: 1100 } }), locale: "fr" });
		assert.match(long, /Seuls les 1000 articles les plus récents sont listés \(1\d{3} au total\)\./);
	});
});

describe("home queries", () => {
	it("looks up the subscription page once for the header, the hero and the subscription block", () => {
		const options = home({ pages: [{ slug: "abonnement", url: "/abonnement/" }] });
		const html = render(options);
		assert.equal(lookups(), 1);
		const hrefs = [...html.matchAll(/href="(\/abonnement\/#(?:inscription|connexion))" data-subscribe-page/g)].map(
			m => m[1],
		);
		// header (desktop + sheet), hero, block (subscribe + sign-in)
		assert.deepEqual(hrefs, [
			"/abonnement/#inscription",
			"/abonnement/#inscription",
			"/abonnement/#inscription",
			"/abonnement/#inscription",
			"/abonnement/#connexion",
		]);
	});

	it("falls back on Portal when the site has no subscription page", () => {
		const html = render(home());
		assert.equal(lookups(), 1);
		assert.ok(html.includes('href="#/portal/signup" data-portal="signup"'));
		assert.ok(html.includes('href="#/portal/signin" data-portal="signin"'));
	});

	it("queries the most used tags once for the rows without a « Home row » setting", () => {
		render(home());
		assert.equal(count("tags", { limit: 5 }), 1);
		const rows = ["jeux-video", "anime", "actualites", "ia", "dossiers"];
		const custom = Object.fromEntries(rows.map((slug, n) => [`home_row_${n + 1}`, slug]));
		render(home({ custom: { ...DEFAULT_CUSTOM, ...custom } }));
		assert.equal(count("tags", { limit: 5 }), 0, "no query of most used tags when every row is set");
		assert.equal(count("tags", { limit: 1 }), 5, "one query per pinned row");
	});

	it("never repeats a tag pinned by a setting in a fallback row", () => {
		const html = render(home({ custom: { ...DEFAULT_CUSTOM, home_row_2: "jeux-video" } }));
		const ids = [...html.matchAll(/id="row-([^"]+)"/g)].map(m => m[1]);
		assert.equal(new Set(ids).size, ids.length, `unique rows: ${ids}`);
	});
});

describe("post queries", () => {
	it("asks for the authors once", () => {
		render(article());
		assert.equal(count("authors"), 1);
	});

	it("fetches a series once per place and renders only the links that show", () => {
		const html = render(article({ series: { published: 100, current: 50 } }));
		assert.equal(count("posts", { limit: 100 }), 2, "the box and the end line");
		assert.equal(html.match(/class="series-step__link"/g).length, 4, "previous and next, in the box and at the end");
		assert.ok(!html.includes("series-step__current"));
	});

	it("renders no link before the first part nor after the last one", () => {
		const first = render(article({ series: { published: 4, current: 1 } }));
		assert.equal(first.match(/series-step--prev[^>]*>\s*<\/span>/g).length, 2);
		assert.equal(first.match(/class="series-step__link"/g).length, 2);
		const last = render(article({ series: { published: 4, current: 4 } }));
		assert.equal(last.match(/series-step--next[^>]*>\s*<\/span>/g).length, 2);
		assert.equal(last.match(/class="series-step__link"/g).length, 2);
	});

	it("gives each series box of a post its own heading id", () => {
		const options = article({ series: { published: 3, current: 2 } });
		const post = options.context.post;
		const second = {
			id: "tag-serie-b",
			name: "#serie-b",
			slug: "hash-serie-b",
			visibility: "internal",
			url: "/404/",
			description: "Autre série",
		};
		post.tags.push(second);
		options.site.posts.filter(p => p !== post).forEach(p => (p.tags = [...p.tags, second]));
		const html = render(options);
		const ids = [...html.matchAll(/class="series__heading" id="([^"]+)"/g)].map(m => m[1]);
		assert.equal(ids.length, 2);
		assert.equal(new Set(ids).size, 2, `unique ids: ${ids}`);
		for (const id of ids) assert.ok(html.includes(`aria-labelledby="${id}"`));
	});
});

describe("archives and tags queries", () => {
	const archives = extra => render(template("page-archives", { site: { extra } }));

	it("fetches only the pages of posts that exist", () => {
		archives(0);
		assert.equal(count("posts", { limit: 100 }), 1, "a short list is one query");
		archives(130);
		assert.equal(count("posts", { limit: 100 }), 2, "about 140 posts are two pages");
	});

	it("says when posts beyond the first thousand are not listed", () => {
		const short = archives(130);
		assert.ok(!short.includes("data-archives-cap"));
		const long = archives(1100);
		assert.equal(count("posts", { limit: 100 }), 10, "never more than ten pages");
		assert.ok(long.includes("data-archives-cap"));
	});

	it("queries the second page of tags only when the first one is full", () => {
		render(template("page-tags"));
		assert.equal(count("tags", { limit: 100 }), 1);
	});
});
