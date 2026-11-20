"""Builds the self-hosted Onest and Literata fonts of the theme (assets/fonts/) and their @font-face
rules (partials/fonts.hbs) from the npm packages @fontsource-variable/onest and
@fontsource-variable/literata (devDependencies; OFL-1.1, the licence files are copied next to the fonts).

    npm ci && python3 src/fonts/build-fonts.py

Needs Python 3 with fontTools and brotli (pip install fonttools brotli). Run it again after updating the
packages; commit assets/fonts/ and partials/fonts.hbs.

What it does, for each script subset the theme's locales need (latin, latin-ext, cyrillic, cyrillic-ext,
vietnamese: the 33 locale files include bg, kk, ky, ru, uk and vi; there is no Greek locale, and Arabic,
Hebrew, Persian, Thai, Chinese, Japanese and Korean are not covered by these fonts and use system fonts):
- keeps only the axis ranges the CSS uses, like the Google Fonts request the theme used to make: Onest
  weights 400 to 800; Literata roman weights 400 to 650 with optical sizes 7 to 72; Literata italic
  weight 400 (optical sizes 7 to 72). Same design, smaller files;
- writes one variable WOFF2 per subset and style; each @font-face has the subset's unicode-range, so a
  browser downloads a file only when the page has a character of that subset;
- measures the fonts against the metric-compatible system fonts (Arial / Liberation Sans for Onest,
  Times New Roman / Liberation Serif for Literata) and writes "Onest Fallback" and "Literata Fallback"
  faces with size-adjust and ascent/descent/line-gap overrides, so the text barely moves when the web
  font replaces the fallback (font-display: swap).
"""

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

# family, package file pattern, output name, CSS style, CSS weight, axis limits
FACES = [
    ("Onest", "onest", "onest-{s}-wght-normal.woff2", "onest/onest-{s}.woff2", "normal", "400 800", {"wght": (400, 800)}),
    ("Literata", "literata", "literata-{s}-opsz-normal.woff2", "literata/literata-{s}.woff2", "normal", "400 650", {"wght": (400, 650)}),
    ("Literata", "literata", "literata-{s}-opsz-italic.woff2", "literata/literata-italic-{s}.woff2", "italic", "400", {"wght": 400}),
]

# Metric-compatible system fonts, measured here on their free equivalents
FALLBACKS = {
    "Onest": ('local("Arial"), local("Liberation Sans")', "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    "Literata": ('local("Times New Roman"), local("Liberation Serif")', "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"),
}

# Text used to compare average glyph widths (French and English running text)
SAMPLE = (
    "Le site fonctionne avec Ghost, un logiciel libre de publication. Les articles parlent de jeux vidéo, "
    "d'anime et de technologie. The quick brown fox jumps over the lazy dog, 0123456789."
)


def unicode_ranges(package):
    import json

    with open(os.path.join(PACKAGES, package, "unicode.json")) as f:
        return json.load(f)


def average_width(font):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    widths = [hmtx[cmap[ord(c)]][0] for c in SAMPLE if ord(c) in cmap]
    return sum(widths) / len(widths) / font["head"].unitsPerEm


def fallback_face(family, primary_path):
    src, system_path = FALLBACKS[family]
    primary = TTFont(primary_path)
    system = TTFont(system_path)
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


def main():
    if not os.path.isdir(PACKAGES):
        sys.exit("Run npm ci first: node_modules/@fontsource-variable is missing")
    rules = {"Onest": [], "Literata": []}
    sizes = []
    for family, package, source, target, style, weight, limits in FACES:
        ranges = unicode_ranges(package)
        for subset in SUBSETS:
            font = TTFont(os.path.join(PACKAGES, package, "files", source.format(s=subset)))
            instancer.instantiateVariableFont(font, limits, inplace=True)
            font.flavor = "woff2"
            path = os.path.join(OUT, target.format(s=subset))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            font.save(path)
            sizes.append((target.format(s=subset), os.path.getsize(path)))
            url = '{{asset "fonts/' + target.format(s=subset) + '"}}'
            rules[family].append(
                f"@font-face{{font-family:{family};font-style:{style};font-weight:{weight};font-display:swap;"
                f'src:url("{url}") format("woff2");unicode-range:{ranges[subset]}}}'
            )
    for package in ("onest", "literata"):
        shutil.copyfile(os.path.join(PACKAGES, package, "LICENSE"), os.path.join(OUT, package, "OFL.txt"))

    onest_fallback = fallback_face("Onest", os.path.join(OUT, "onest", "onest-latin.woff2"))
    literata_fallback = fallback_face("Literata", os.path.join(OUT, "literata", "literata-latin.woff2"))

    with open(PARTIAL, "w") as f:
        f.write(
            "{{!-- Fonts served by the theme itself (no request to a font service): Onest for the interface and\n"
            "the headings on every page, Literata for the text of posts only. GENERATED by\n"
            "src/fonts/build-fonts.py from @fontsource-variable/onest and /literata (OFL-1.1, assets/fonts/*/OFL.txt):\n"
            "do not edit by hand. One variable WOFF2 per script subset: the browser only downloads the subsets\n"
            "whose characters the page uses (unicode-range). Preloaded: Onest latin everywhere, Literata latin on\n"
            "posts from 48rem (the files the first screen needs; on phones the article's picture fills the first\n"
            "screen and comes first). The fallback faces carry metric overrides so the\n"
            "text barely moves when the font arrives (font-display: swap). Ghost's custom fonts (Design > Brand >\n"
            "Typography) still win through --gh-font-heading / --gh-font-body (src/css/base/tokens.css). --}}\n"
        )
        f.write('<link rel="preload" href="{{asset "fonts/onest/onest-latin.woff2"}}" as="font" type="font/woff2" crossorigin>\n')
        f.write('{{#is "post"}}\n')
        f.write('  <link rel="preload" href="{{asset "fonts/literata/literata-latin.woff2"}}" as="font" type="font/woff2" media="(min-width: 48rem)" crossorigin>\n')
        f.write("{{/is}}\n")
        f.write("<style>\n")
        for rule in rules["Onest"]:
            f.write(rule + "\n")
        f.write(onest_fallback + "\n")
        f.write('{{#is "post"}}\n')
        for rule in rules["Literata"]:
            f.write(rule + "\n")
        f.write(literata_fallback + "\n")
        f.write("{{/is}}\n")
        f.write("</style>\n")

    for name, size in sizes:
        print(f"{size:>8}  assets/fonts/{name}")
    print(onest_fallback)
    print(literata_fallback)


if __name__ == "__main__":
    main()
