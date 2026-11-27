"""Builds the self-hosted fonts of the theme (assets/fonts/) and their @font-face rules (partials/fonts.hbs)
from the npm packages @fontsource-variable/onest, /noto-sans, /google-sans and /literata (devDependencies;
OFL-1.1, the licence files are copied next to the fonts).

    npm ci && python3 src/fonts/build-fonts.py        (Windows: python src/fonts/build-fonts.py)

Needs Python 3 with fontTools and brotli (pip install fonttools brotli). Run it again after updating the
packages; commit assets/fonts/ and partials/fonts.hbs.

Who uses what: Onest for the interface and the headings of every page; on posts, Noto Sans for the text of
the article and Google Sans for its title and its headings; Literata, the text font of the articles before
Noto Sans, stays a choice of the members' display settings (« Police du texte »), so its faces are only
written on posts for a member when the display settings are on.

What it does, for each script subset the theme's locales need (latin, latin-ext, cyrillic, cyrillic-ext,
vietnamese: the 33 locale files include bg, kk, ky, ru, uk and vi; there is no Greek locale, and Arabic,
Hebrew, Persian, Thai, Chinese, Japanese and Korean are not covered by these fonts and use system fonts):
- keeps only the axis ranges the CSS uses: Onest weights 400 to 800; Noto Sans roman weights 400 to 700
  (the package goes from 100 to 900), Noto Sans italic weight 400 (the browser draws a bold italic from
  it, as it did with Literata); Google Sans weights 400 to 700, all it has (the article title asks for
  750 and gets 700); Literata roman weights 400 to 650; Literata italic weight 400. Literata's optical
  size axis (opsz) is limited to LITERATA_OPSZ, 14 to 28: with font-optical-sizing: auto (the default,
  the theme never changes it) the browser sets opsz to the font size in CSS px, and the article text is
  17, 19 or 21 px (members' size setting; sup and sub 0.83 em of it, 14.2 px at the smallest), so the
  published design never leaves 14 to 21; 28 leaves room for a reader who raises the browser's default
  font size (the sizes are in rem) by a third. Outside the range the browser clamps to the nearest end.
  Measured with the rich article of src/tests/fonts.test.js, which also checks it. Same design, smaller
  files;
- writes one variable WOFF2 per subset and style; each @font-face has the subset's unicode-range, so a
  browser downloads a file only when the page has a character of that subset;
- measures the fonts against the metric-compatible system fonts (Arial / Liberation Sans for Onest, Noto
  Sans and Google Sans, Times New Roman / Liberation Serif for Literata) and writes "Onest Fallback",
  "Noto Sans Fallback", "Google Sans Fallback" and "Literata Fallback" faces with size-adjust and
  ascent/descent/line-gap overrides, so the text barely moves when the web font replaces the fallback
  (font-display: swap). The system font is read from the first place where it is found (SYSTEM_FONTS):
  Liberation on Linux, Arial and Times New Roman on Windows and macOS. Their glyph widths are the same
  (Liberation is metric-compatible), so the result does not depend on the machine.
"""

import json
import os
import shutil
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACKAGES = os.path.join(ROOT, "node_modules", "@fontsource-variable")
OUT = os.path.join(ROOT, "assets", "fonts")
PARTIAL = os.path.join(ROOT, "partials", "fonts.hbs")
# Order of the @font-face rules, as Google Fonts and fontsource write them: where two ranges overlap (œ, ‡,
# combining accents are in latin AND latin-ext), the browser uses the face declared LAST, so latin comes
# last and a French page never downloads latin-ext for an œ.
SUBSETS = ["cyrillic-ext", "cyrillic", "vietnamese", "latin-ext", "latin"]

# Optical sizes (px) kept in Literata, roman and italic; src/tests/fonts.test.js reads them back from the
# fvar table of the generated files and checks that every Literata text of an article is inside
LITERATA_OPSZ = (14, 28)

# family, package, package file pattern, output name, CSS style, CSS weight, axis limits (None: the file as it is)
FACES = [
    ("Onest", "onest", "onest-{s}-wght-normal.woff2", "onest/onest-{s}.woff2", "normal", "400 800", {"wght": (400, 800)}),
    ("Noto Sans", "noto-sans", "noto-sans-{s}-wght-normal.woff2", "noto-sans/noto-sans-{s}.woff2", "normal", "400 700", {"wght": (400, 700)}),
    ("Noto Sans", "noto-sans", "noto-sans-{s}-wght-italic.woff2", "noto-sans/noto-sans-italic-{s}.woff2", "italic", "400", {"wght": 400}),
    ("Google Sans", "google-sans", "google-sans-{s}-wght-normal.woff2", "google-sans/google-sans-{s}.woff2", "normal", "400 700", None),
    ("Literata", "literata", "literata-{s}-opsz-normal.woff2", "literata/literata-{s}.woff2", "normal", "400 650", {"wght": (400, 650), "opsz": LITERATA_OPSZ}),
    ("Literata", "literata", "literata-{s}-opsz-italic.woff2", "literata/literata-italic-{s}.woff2", "italic", "400", {"wght": 400, "opsz": LITERATA_OPSZ}),
]

# Metric-compatible system fonts, measured on the first of these files that exists: the free equivalents
# on Linux, the fonts themselves on Windows and macOS (same advance widths)
WINDOWS_FONTS = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts")
SYSTEM_FONTS = {
    "sans": [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf",
        os.path.join(WINDOWS_FONTS, "arial.ttf"),
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ],
    "serif": [
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/usr/share/fonts/liberation-serif/LiberationSerif-Regular.ttf",
        os.path.join(WINDOWS_FONTS, "times.ttf"),
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    ],
}
SANS = ('local("Arial"), local("Liberation Sans")', "sans")
SERIF = ('local("Times New Roman"), local("Liberation Serif")', "serif")
FALLBACKS = {"Onest": SANS, "Noto Sans": SANS, "Google Sans": SANS, "Literata": SERIF}

# Text used to compare average glyph widths (French and English running text)
SAMPLE = (
    "Le site fonctionne avec Ghost, un logiciel libre de publication. Les articles parlent de jeux vidéo, "
    "d'anime et de technologie. The quick brown fox jumps over the lazy dog, 0123456789."
)


def unicode_ranges(package):
    with open(os.path.join(PACKAGES, package, "unicode.json"), encoding="utf-8") as f:
        return json.load(f)


def average_width(font):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    widths = [hmtx[cmap[ord(c)]][0] for c in SAMPLE if ord(c) in cmap]
    return sum(widths) / len(widths) / font["head"].unitsPerEm


def system_font(kind):
    for path in SYSTEM_FONTS[kind]:
        if os.path.isfile(path):
            return path
    sys.exit(f"No {kind} system font to measure the fallback faces against. Looked for: " + ", ".join(SYSTEM_FONTS[kind]))


def fallback_face(family, primary_path):
    src, kind = FALLBACKS[family]
    primary = TTFont(primary_path)
    system = TTFont(system_font(kind))
    size_adjust = average_width(primary) / average_width(system)
    upm = primary["head"].unitsPerEm
    hhea = primary["hhea"]
    pct = lambda v: f"{v * 100:.2f}%"
    return (
        f'@font-face{{font-family:"{family} Fallback";src:{src};'
        f"size-adjust:{pct(size_adjust)};"
        f"ascent-override:{pct(hhea.ascent / upm / size_adjust)};"
        f"descent-override:{pct(abs(hhea.descent) / upm / size_adjust)};"
        f"line-gap-override:{pct(hhea.lineGap / upm / size_adjust)}}}"
    )


def package_file(package, axis):
    return os.path.join(PACKAGES, package, "files", f"{package}-latin-{axis}-normal.woff2")


def main():
    if not os.path.isdir(PACKAGES):
        sys.exit("Run npm ci first: node_modules/@fontsource-variable is missing")
    rules = {family: [] for family in FALLBACKS}
    sizes = []
    for family, package, source, target, style, weight, limits in FACES:
        ranges = unicode_ranges(package)
        name = f'"{family}"' if " " in family else family
        for subset in SUBSETS:
            font = TTFont(os.path.join(PACKAGES, package, "files", source.format(s=subset)))
            if limits:
                instancer.instantiateVariableFont(font, limits, inplace=True)
            font.flavor = "woff2"
            path = os.path.join(OUT, *target.format(s=subset).split("/"))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            font.save(path)
            sizes.append((target.format(s=subset), os.path.getsize(path)))
            url = '{{asset "fonts/' + target.format(s=subset) + '"}}'
            rules[family].append(
                f"@font-face{{font-family:{name};font-style:{style};font-weight:{weight};font-display:swap;"
                f'src:url("{url}") format("woff2");unicode-range:{ranges[subset]}}}'
            )
    for package in ("onest", "noto-sans", "google-sans", "literata"):
        shutil.copyfile(os.path.join(PACKAGES, package, "LICENSE"), os.path.join(OUT, package, "OFL.txt"))

    # Measured on the packages' own files (default instance: wght 400, and opsz 12 for Literata), not on the
    # limited output, whose default opsz is the lower end of LITERATA_OPSZ: the fallback stays the same
    # whatever the range
    fallbacks = {
        "Onest": fallback_face("Onest", package_file("onest", "wght")),
        "Noto Sans": fallback_face("Noto Sans", package_file("noto-sans", "wght")),
        "Google Sans": fallback_face("Google Sans", package_file("google-sans", "wght")),
        "Literata": fallback_face("Literata", package_file("literata", "opsz")),
    }

    # newline="\n": the same file on Windows as on Linux
    with open(PARTIAL, "w", encoding="utf-8", newline="\n") as f:
        f.write(
            "{{!-- Fonts served by the theme itself (no request to a font service): Onest for the interface and\n"
            "the headings on every page; on posts only, Noto Sans for the text of the article and Google Sans for\n"
            "its title and its headings; Literata, a choice of the members' display settings (« Police du texte »),\n"
            "on posts for a member when these settings are on. GENERATED by src/fonts/build-fonts.py from\n"
            "@fontsource-variable/onest, /noto-sans, /google-sans and /literata (OFL-1.1, assets/fonts/*/OFL.txt):\n"
            "do not edit by hand. One variable WOFF2 per script subset: the browser only downloads the subsets\n"
            "whose characters the page uses (unicode-range). Preloaded: Onest latin everywhere, Google Sans latin\n"
            "and Noto Sans latin on posts from 48rem (the files the first screen needs; on phones the article's\n"
            "picture fills the first screen and comes first). Literata is never preloaded and keeps the optical\n"
            "sizes 14 to 28 px only (LITERATA_OPSZ). The fallback faces carry metric overrides so the text barely\n"
            "moves when the font arrives (font-display: swap). Ghost's custom fonts (Design > Brand > Typography)\n"
            "still win through --gh-font-heading / --gh-font-body (src/css/base/tokens.css). --}}\n"
        )
        f.write('<link rel="preload" href="{{asset "fonts/onest/onest-latin.woff2"}}" as="font" type="font/woff2" crossorigin>\n')
        f.write('{{#is "post"}}\n')
        for file in ("google-sans/google-sans-latin.woff2", "noto-sans/noto-sans-latin.woff2"):
            f.write(
                '  <link rel="preload" href="{{asset "fonts/' + file + '"}}" as="font" type="font/woff2" '
                'media="(min-width: 48rem)" crossorigin>\n'
            )
        f.write("{{/is}}\n")
        f.write("<style>\n")
        for rule in rules["Onest"]:
            f.write(rule + "\n")
        f.write(fallbacks["Onest"] + "\n")
        f.write('{{#is "post"}}\n')
        for family in ("Noto Sans", "Google Sans"):
            for rule in rules[family]:
                f.write(rule + "\n")
            f.write(fallbacks[family] + "\n")
        f.write("{{#if @member}}{{#if @custom.reading_settings}}\n")
        for rule in rules["Literata"]:
            f.write(rule + "\n")
        f.write(fallbacks["Literata"] + "\n")
        f.write("{{/if}}{{/if}}\n")
        f.write("{{/is}}\n")
        f.write("</style>\n")

    for name, size in sizes:
        print(f"{size:>8}  assets/fonts/{name}")
    for face in fallbacks.values():
        print(face)


if __name__ == "__main__":
    main()
