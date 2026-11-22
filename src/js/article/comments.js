// Ghost's native comments (post.hbs, [data-comments]), loaded only when they are about to be read. Ghost's
// comments-ui weighs ~250 KB from jsDelivr: loaded with the page, it shares a phone's connection with the
// header image (the LCP) for readers who never scroll that far.
//
// post.hbs keeps Ghost's own {{comments}} output, untouched, inside a <template> (inert: its script does not
// run). start() copies that script, with every attribute Ghost wrote (so a Ghost upgrade that changes them
// keeps working), right after the empty #ghost-comments-root: comments-ui reads document.currentScript and
// draws its frame in the script's previous sibling when that sibling has this id.
//
// When: once the page has loaded (the header image first), as the section comes within two screens of the
// viewport; at once when the address targets the comments (#ghost-comments, #ghost-comments-root,
// #ghost-comments-<id>: Ghost's comment notification e-mails and its newsletter's « Comment » button) or
// when the reader follows a link to them in the page; without IntersectionObserver, at load.
//
// States (data-comments on the section, styled by article/layout.css): "waiting", "loading" (the space is
// kept, a quiet « Chargement des commentaires… » shows, the frame stays hidden until comments-ui has drawn
// the comments), "ready", "error" (the script could not load: blocked, offline; or it loaded and drew no
// frame within TIMEOUT ms).
const TARGET = /^#ghost-comments(?:-|$)/;
const MARGIN = "200% 0px";
// comments-ui 1.6 creates its frame 400 px high and empty, draws a skeleton, and asks for the comments only
// once the frame is in view (its own IntersectionObserver); its content box then reads data-loaded="true"
// and the frame takes its final height. Shown only then, the frame changes the page once (from the space
// kept to its height) instead of three times. If comments-ui ever drew no such box (a later version), the
// frame shows FALLBACK ms after it appeared.
const LOADED_BOX = '[data-testid="content-box"]';
const FALLBACK = 8000;
// comments-ui adds its frame as soon as it runs: none this long after the script has loaded, it never will
// (it failed, or a later version draws elsewhere), and the section says so instead of « loading » for ever
const TIMEOUT = 15000;
const TICK = 150;

export const targetsComments = hash => TARGET.test(hash || "");

export const setUpComments = section => {
	if (!section) return;
	const source = section.querySelector("template[data-comments-script]")?.content.querySelector("script[src]");
	const root = section.querySelector("#ghost-comments-root");
	const status = section.querySelector("[data-comments-status]");
	if (!source || !root) {
		// Ghost printed nothing (comments turned off, or the reader may not read the post)
		section.hidden = true;
		return;
	}

	const cleanups = [];
	const setState = state => {
		section.dataset.comments = state;
		if (status) status.hidden = state === "ready";
	};

	const fail = () => {
		setState("error");
		if (status) status.textContent = section.dataset.commentsError || status.textContent;
	};

	// Shows the frame once comments-ui has drawn the comments and the frame's height has settled (the same on
	// two ticks in a row). Stops, with the error message, when the script has loaded and no frame comes.
	const whenDrawn = script => {
		let loaded = null;
		let appeared = null;
		let height = null;
		script.addEventListener("load", () => (loaded = performance.now()));
		const timer = setInterval(() => {
			if (section.dataset.comments !== "loading") return clearInterval(timer);
			const frame = root.querySelector("iframe:not([data-frame])");
			if (!frame) {
				if (loaded !== null && performance.now() - loaded > TIMEOUT) {
					clearInterval(timer);
					fail();
				}
				return;
			}
			appeared ??= performance.now();
			let box = null;
			try {
				box = frame.contentDocument?.querySelector(LOADED_BOX);
			} catch {
				// A frame of another origin: only the fallback applies
			}
			const drawn = box ? box.dataset.loaded === "true" : performance.now() - appeared > FALLBACK;
			if (!drawn) return;
			if (frame.style.height !== height) {
				height = frame.style.height;
				return;
			}
			clearInterval(timer);
			setState("ready");
		}, TICK);
	};

	let started = false;
	const start = () => {
		if (started) return;
		started = true;
		cleanups.forEach(cleanup => cleanup());
		setState("loading");
		const script = document.createElement("script");
		for (const { name, value } of source.attributes) script.setAttribute(name, value);
		script.addEventListener("error", fail);
		whenDrawn(script);
		root.after(script);
	};

	const listen = (target, type, handler, options) => {
		target.addEventListener(type, handler, options);
		cleanups.push(() => target.removeEventListener(type, handler, options));
	};

	setState("waiting");
	if (targetsComments(location.hash)) {
		start();
		return;
	}

	// A link of the page to the comments (a count, « Commenter »…), or the address changing to them
	listen(document, "click", event => {
		const link = event.target.closest?.("a[href*='#ghost-comments']");
		if (link && link.pathname === location.pathname && targetsComments(link.hash)) start();
	});
	listen(window, "hashchange", () => targetsComments(location.hash) && start());

	const observe = () => {
		if (started) return;
		if (!("IntersectionObserver" in window)) {
			start();
			return;
		}
		const observer = new IntersectionObserver(entries => entries.some(entry => entry.isIntersecting) && start(), {
			rootMargin: MARGIN,
		});
		observer.observe(section);
		cleanups.push(() => observer.disconnect());
	};
	if (document.readyState === "complete") observe();
	else listen(window, "load", observe, { once: true });
};
