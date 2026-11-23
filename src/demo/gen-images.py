#!/usr/bin/env python3
"""Generate every local test image (no network, no remote URLs).

Output: $GEEKLY_DEMO_DIR/images/*.jpg|png + manifest.json (default ~/ghost-geekly/images), deterministic.
Run:    npm run demo:images           (skips files that already exist; --force to redo;
                                       --images <dir> writes elsewhere, e.g. to reuse a folder)
Needs:  Python 3 with numpy and Pillow, e.g. in a venv:
          python3 -m venv ~/ghost-geekly-venv && ~/ghost-geekly-venv/bin/pip install numpy pillow
Nothing is written inside the repository or under the system temp directory (see lib/workdir.mjs).

Photo-like 2400x1350 JPEGs built from multi-octave noise, soft shapes and film grain, in several
families so that the theme is exercised on varied inputs (see FAMILIES below):
  aurora   smooth gradient noise            geo    big blurred discs + polygons
  busy     dense, high-contrast, detailed   plain  light / pale, almost empty
  dark     dark scene with glow             flat   flat-colour banner ("aplat") with a small motif
  text     large headline text in the image (the guide says: avoid, so the theme must cope)
"""
import json, math, os, sys
from pathlib import Path


def target_dir(argv, env):
    """Folder to write into, refused when it is inside the repository or under the system temp dir."""
    import tempfile
    here = Path(__file__).resolve().parent
    repo = here.parent.parent
    if "--images" in argv:
        i = argv.index("--images")
        if i + 1 >= len(argv):
            sys.exit("--images demande un dossier")
        out = Path(argv[i + 1]).expanduser()
    else:
        work = env.get("GEEKLY_DEMO_DIR", "").strip() or str(Path.home() / "ghost-geekly")
        out = Path(work).expanduser() / "images"
    out = out.resolve()
    tmp = Path(tempfile.gettempdir()).resolve()
    for name, base in (("le dépôt", repo), ("le dossier temporaire du système", tmp)):
        if out == base or base in out.parents:
            sys.exit(f"Refus : {out} est dans {name} ({base}). Choisissez un autre dossier (GEEKLY_DEMO_DIR).")
    if out in repo.parents:
        sys.exit(f"Refus : {out} contient le dépôt. Choisissez un autre dossier (GEEKLY_DEMO_DIR).")
    return str(out)


OUT = target_dir(sys.argv, os.environ)
if "--check-only" in sys.argv:  # used by the tests: no numpy / Pillow needed
    print(OUT)
    sys.exit(0)

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("numpy et Pillow sont requis : python3 -m venv ~/ghost-geekly-venv && ~/ghost-geekly-venv/bin/pip install numpy pillow")

os.makedirs(OUT, exist_ok=True)
FORCE = "--force" in sys.argv
W, H = 2400, 1350

PALETTES = {  # per tag: 4 colours, dark -> light
    "jeux-video": [(12, 14, 40), (52, 40, 140), (232, 72, 120), (255, 196, 80)],
    "anime":      [(30, 12, 48), (150, 50, 150), (255, 110, 140), (255, 220, 200)],
    "actualites": [(8, 24, 44), (20, 90, 150), (66, 160, 230), (230, 244, 255)],
    "ia":         [(6, 20, 24), (10, 100, 110), (60, 210, 190), (220, 255, 240)],
    "dossiers":   [(24, 18, 12), (110, 70, 40), (220, 150, 70), (250, 232, 200)],
    "test":       [(20, 20, 20), (70, 70, 90), (160, 160, 200), (240, 240, 250)],
}
manifest = {}


def rng(seed):
    return np.random.default_rng(seed)


def noise(r, w, h, octaves=5, base=3, persistence=0.55):
    """Value noise in [0,1], shape (h, w)."""
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gw, gh = base * 2 ** o + 1, int(base * 2 ** o * h / w) + 2
        g = (r.random((gh, gw)) * 255).astype(np.uint8)
        im = Image.fromarray(g).resize((w, h), Image.BICUBIC)
        acc += np.asarray(im, np.float32) / 255 * amp
        tot += amp
        amp *= persistence
    acc /= tot
    lo, hi = acc.min(), acc.max()
    return (acc - lo) / (hi - lo + 1e-6)


def ramp(t, colors):
    """Map t in [0,1] (h,w) through a list of RGB colours -> float array (h,w,3)."""
    colors = np.array(colors, np.float32)
    n = len(colors) - 1
    x = np.clip(t, 0, 1) * n
    i = np.minimum(x.astype(int), n - 1)
    f = (x - i)[..., None]
    return colors[i] * (1 - f) + colors[i + 1] * f


def grain(arr, r, amount):
    return arr + r.normal(0, amount, arr.shape[:2])[..., None]


def finish(arr, r, grain_amt=4.0):
    arr = grain(arr, r, grain_amt)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def vignette(arr, strength=0.35):
    h, w = arr.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    return arr * (1 - strength * np.clip(d - 0.4, 0, 1))[..., None]


def blurred_layer(draw_fn, size, blur):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def font(size, bold=True):
    for p in ("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",
              "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/System/Library/Fonts/Helvetica.ttc",                      # macOS
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf",        # macOS
              "C:/Windows/Fonts/arialbd.ttf"):                            # Windows
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    try:
        return ImageFont.load_default(size)  # Pillow >= 10.1: scalable
    except TypeError:
        return ImageFont.load_default()


# ---------------------------------------------------------------- families
def f_aurora(r, pal, w=W, h=H):
    t = noise(r, w, h, 5, 2)
    t2 = noise(r, w, h, 4, 3)
    arr = ramp(0.65 * t + 0.35 * t2, pal)
    return finish(vignette(arr, 0.25), r, 3.5)


def f_geo(r, pal, w=W, h=H):
    base = ramp(noise(r, w, h, 3, 2), pal[:3])
    im = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert("RGBA")
    for _ in range(int(r.integers(4, 8))):
        cx, cy, rad = int(r.integers(0, w)), int(r.integers(0, h)), int(r.integers(150, 700))
        col = tuple(int(c) for c in pal[int(r.integers(1, 4))]) + (int(r.integers(70, 170)),)
        im = Image.alpha_composite(im, blurred_layer(
            lambda d: d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=col), (w, h), int(r.integers(8, 60))))
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(int(r.integers(3, 7))):
        pts = [(int(r.integers(0, w)), int(r.integers(0, h))) for _ in range(3)]
        d.polygon(pts, fill=tuple(int(c) for c in pal[3]) + (int(r.integers(20, 60)),))
    return finish(vignette(np.asarray(im.convert("RGB"), np.float32), 0.3), r, 3.0)


def f_busy(r, pal, w=W, h=H):
    """Dense city/circuit-like scene: many rects, lines, bright dots, strong noise."""
    arr = ramp(noise(r, w, h, 6, 4, 0.7), pal)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(900):
        x, y = int(r.integers(0, w)), int(r.integers(0, h))
        bw, bh = int(r.integers(6, 120)), int(r.integers(6, 220))
        col = tuple(int(c) for c in pal[int(r.integers(0, 4))]) + (int(r.integers(60, 220)),)
        d.rectangle([x, y, x + bw, y + bh], fill=col, outline=None)
    for _ in range(400):
        x, y = int(r.integers(0, w)), int(r.integers(0, h))
        d.line([x, y, x + int(r.integers(-300, 300)), y + int(r.integers(-300, 300))],
               fill=tuple(int(c) for c in pal[3]) + (int(r.integers(80, 220)),), width=int(r.integers(1, 5)))
    for _ in range(1500):
        x, y, s = int(r.integers(0, w)), int(r.integers(0, h)), int(r.integers(2, 9))
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 255, int(r.integers(120, 255))))
    arr = np.asarray(im.convert("RGB"), np.float32)
    return finish(arr, r, 14.0)  # heavy grain -> big JPEG, a "busy" worst case


def f_plain(r, pal, w=W, h=H):
    light = np.array([246, 244, 240], np.float32) * 0.5 + np.array(pal[3], np.float32) * 0.5
    t = noise(r, w, h, 2, 2)
    arr = np.ones((h, w, 3), np.float32) * light
    arr = arr * (0.96 + 0.04 * t)[..., None]
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    cx, cy, rad = int(w * 0.68), int(h * 0.5), int(h * 0.3)
    col = tuple(int(c) for c in pal[2]) + (90,)
    im = Image.alpha_composite(im, blurred_layer(
        lambda d: d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=col), (w, h), 40))
    return finish(np.asarray(im.convert("RGB"), np.float32), r, 1.5)


def f_dark(r, pal, w=W, h=H):
    t = noise(r, w, h, 5, 2)
    arr = ramp(0.25 * t, pal[:2] + [pal[1]])
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    for _ in range(3):
        cx, cy, rad = int(r.integers(w // 5, w * 4 // 5)), int(r.integers(h // 5, h * 4 // 5)), int(r.integers(180, 420))
        col = tuple(int(c) for c in pal[int(r.integers(2, 4))]) + (200,)
        im = Image.alpha_composite(im, blurred_layer(
            lambda d: d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=col), (w, h), 110))
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(120):
        x, y, s = int(r.integers(0, w)), int(r.integers(0, h)), int(r.integers(2, 6))
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 255, int(r.integers(90, 230))))
    return finish(vignette(np.asarray(im.convert("RGB"), np.float32), 0.5), r, 3.0)


def f_flat(r, pal, w=W, h=H):
    col = np.array(pal[1], np.float32)
    arr = np.ones((h, w, 3), np.float32) * col
    im = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(im, "RGBA")
    cx, cy, s = int(w * 0.72), int(h * 0.5), int(h * 0.28)
    d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=tuple(int(c) for c in pal[2]) + (255,))
    d.rectangle([cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2], fill=tuple(int(c) for c in pal[3]) + (255,))
    return finish(np.asarray(im.convert("RGB"), np.float32), r, 0.0)  # truly flat -> tiny JPEG


def f_text(r, pal, w=W, h=H, text="NOVA"):
    base = f_aurora(r, [pal[0], pal[1], pal[1], pal[2]])
    d = ImageDraw.Draw(base)
    size = 620
    fnt = font(size)
    while d.textlength(text, font=fnt) > w * 0.9:
        size -= 20
        fnt = font(size)
    tw = d.textlength(text, font=fnt)
    d.text(((w - tw) / 2, h / 2 - size * 0.62), text, font=fnt, fill=(255, 255, 255))
    return base


FAMILIES = dict(aurora=f_aurora, geo=f_geo, busy=f_busy, plain=f_plain, dark=f_dark, flat=f_flat, text=f_text)


def save(name, img, fmt="JPEG", q=84, alt="", **extra):
    path = os.path.join(OUT, name)
    img.save(path, fmt, quality=q, optimize=True, progressive=True) if fmt == "JPEG" else img.save(path, fmt, optimize=True)
    manifest[name] = dict(width=img.width, height=img.height, alt=alt, bytes=os.path.getsize(path), **extra)
    print(f"  {name:28s} {img.width}x{img.height} {os.path.getsize(path)//1024} KB")


def make(name, family, rubric, seed, w=W, h=H, alt="", **kw):
    if os.path.exists(os.path.join(OUT, name)) and not FORCE:
        manifest[name] = dict(width=w, height=h, alt=alt, bytes=os.path.getsize(os.path.join(OUT, name)), family=family)
        return
    r = rng(seed)
    img = FAMILIES[family](r, PALETTES[rubric], w, h, **kw)
    save(name, img, alt=alt, family=family)


# ---------------------------------------------------------------- the list
# (file, family, rubric) per post: posts.mjs refers to these names.
FEATURES = [
    # jeux-video (8)
    ("f01-jv-dark.jpg", "dark", "jeux-video"), ("f02-jv-busy.jpg", "busy", "jeux-video"),
    ("f03-jv-geo.jpg", "geo", "jeux-video"), ("f04-jv-aurora.jpg", "aurora", "jeux-video"),
    ("f05-jv-flat.jpg", "flat", "jeux-video"), ("f06-jv-geo.jpg", "geo", "jeux-video"),
    ("f07-jv-dark.jpg", "dark", "jeux-video"), ("f08-jv-plain.jpg", "plain", "jeux-video"),
    # anime (6)
    ("f09-an-aurora.jpg", "aurora", "anime"), ("f10-an-geo.jpg", "geo", "anime"),
    ("f11-an-busy.jpg", "busy", "anime"), ("f12-an-dark.jpg", "dark", "anime"),
    ("f13-an-plain.jpg", "plain", "anime"), ("f14-an-aurora.jpg", "aurora", "anime"),
    # actualites (6)
    ("f15-ac-geo.jpg", "geo", "actualites"), ("f16-ac-aurora.jpg", "aurora", "actualites"),
    ("f17-ac-busy.jpg", "busy", "actualites"), ("f18-ac-plain.jpg", "plain", "actualites"),
    ("f19-ac-dark.jpg", "dark", "actualites"), ("f20-ac-flat.jpg", "flat", "actualites"),
    # ia (5)
    ("f21-ia-aurora.jpg", "aurora", "ia"), ("f22-ia-busy.jpg", "busy", "ia"),
    ("f23-ia-geo.jpg", "geo", "ia"), ("f24-ia-dark.jpg", "dark", "ia"), ("f25-ia-plain.jpg", "plain", "ia"),
    # dossiers (5)
    ("f26-do-aurora.jpg", "aurora", "dossiers"), ("f27-do-geo.jpg", "geo", "dossiers"),
    ("f28-do-text.jpg", "text", "dossiers"), ("f29-do-dark.jpg", "dark", "dossiers"),
    ("f30-do-busy.jpg", "busy", "dossiers"),
]

if __name__ == "__main__":
    print("feature images")
    for i, (name, fam, rub) in enumerate(FEATURES):
        kw = {"text": "NOVA"} if fam == "text" else {}
        make(name, fam, rub, 1000 + i, alt="", **kw)

    print("tag images (2000x1200)")
    for i, rub in enumerate(["jeux-video", "anime", "actualites", "ia", "dossiers", "test"]):
        make(f"tag-{rub}.jpg", ["dark", "geo", "aurora", "busy", "geo", "aurora"][i], rub, 2000 + i, 2000, 1200)

    print("site cover / author pictures")
    make("cover.jpg", "dark", "jeux-video", 3000)
    for i, (nm, rub, ini) in enumerate([("author-alexis.jpg", "ia", "A"), ("author-lea.jpg", "anime", "L")]):
        if os.path.exists(os.path.join(OUT, nm)) and not FORCE:
            manifest[nm] = dict(width=512, height=512, alt="", bytes=os.path.getsize(os.path.join(OUT, nm)))
            continue
        r = rng(4000 + i)
        img = f_aurora(r, PALETTES[rub], 512, 512)
        d = ImageDraw.Draw(img)
        fnt = font(260)
        d.text((256 - d.textlength(ini, font=fnt) / 2, 100), ini, font=fnt, fill=(255, 255, 255))
        save(nm, img, q=88)
    for nm, i in [("author-alexis-cover.jpg", 0), ("author-lea-cover.jpg", 1)]:
        make(nm, "aurora", ["ia", "anime"][i], 4100 + i, 2000, 700)

    print("in-content images")
    inline = [  # (file, family, rubric, w, h, alt)
        ("c01-wide.jpg", "geo", "jeux-video", 1600, 900, "Capture d'écran fictive : un monastère flottant dans la brume"),
        ("c02-wide.jpg", "dark", "jeux-video", 1600, 900, "Capture d'écran fictive : combat de nuit contre un colosse de pierre"),
        ("c03-square.jpg", "aurora", "anime", 1200, 1200, "Visuel promotionnel fictif : portrait stylisé aux teintes violettes"),
        ("c04-portrait.jpg", "geo", "anime", 900, 1350, "Affiche fictive d'une série d'animation, format portrait"),
        ("c05-wide.jpg", "busy", "actualites", 1800, 1000, "Vue d'ensemble d'un salon fictif du jeu vidéo, stands et néons"),
        ("c06-wide.jpg", "aurora", "ia", 1600, 900, "Schéma décoratif : flux de données en dégradé turquoise"),
        ("c07-full.jpg", "dark", "dossiers", 2400, 1000, "Panorama fictif d'une salle d'arcade éteinte"),
        ("c08-wide.jpg", "plain", "dossiers", 1600, 900, "Illustration claire et épurée d'une manette stylisée"),
        ("c09-regular.jpg", "geo", "ia", 1200, 800, "Illustration d'un réseau de neurones en formes géométriques"),
        ("c10-regular.jpg", "flat", "jeux-video", 1200, 675, "Bannière fictive en aplat de couleur"),
    ]
    for i, (nm, fam, rub, w, h, alt) in enumerate(inline):
        make(nm, fam, rub, 5000 + i, w, h, alt=alt)
        manifest[nm]["alt"] = alt

    print("logos")
    for nm, fg in [("logo-dark-text.png", (20, 20, 24, 255)), ("logo-light-text.png", (255, 255, 255, 255))]:
        p = os.path.join(OUT, nm)
        if os.path.exists(p) and not FORCE:
            manifest[nm] = dict(width=900, height=240, alt="GEEKLY", bytes=os.path.getsize(p))
            continue
        img = Image.new("RGBA", (900, 240), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        fnt = font(190)
        d.text((10, 10), "GEEKLY", font=fnt, fill=fg)
        save(nm, img, "PNG", alt="GEEKLY")
    p = os.path.join(OUT, "icon.png")
    if not os.path.exists(p) or FORCE:
        img = Image.new("RGBA", (512, 512), (66, 133, 244, 255))
        d = ImageDraw.Draw(img)
        fnt = font(330)
        d.text((256 - d.textlength("G", font=fnt) / 2, 70), "G", font=fnt, fill=(255, 255, 255, 255))
        save("icon.png", img, "PNG", alt="GEEKLY")
    else:
        manifest["icon.png"] = dict(width=512, height=512, alt="GEEKLY", bytes=os.path.getsize(p))

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
    print("done:", len(manifest), "images in", OUT)
