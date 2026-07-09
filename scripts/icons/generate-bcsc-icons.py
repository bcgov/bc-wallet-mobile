#!/usr/bin/env python3
"""
generate-bcsc-icons.py

Regenerates the byte content of the BCSC (BC Services Card) app-icon assets
under variants/_bcsc-base and variants/bcsc-{dev,qa,test,prod} from the
GCPE-approved v4.1 source artwork (issue #4114).

This is a DEV TOOL ONLY. It is never invoked from a build or CI path -- run
it by hand whenever new source art lands, inspect the diff, then commit the
regenerated overlay files (and this script, if the recipe changed). BC
Wallet's icon assets are untouched; this script only ever writes into
variants/_bcsc-base and variants/bcsc-{dev,qa,test,prod}.

Usage:
    python3 scripts/icons/generate-bcsc-icons.py [--src PATH] [--out variants]

    --src   Absolute path to the source-asset folder (see "Source files"
            below). Defaults to the current maintainer's local checkout --
            pass --src explicitly on any other machine.
    --out   Path to the variants/ directory to write into, resolved against
            the current working directory if relative. Defaults to
            "variants" (run from the repo root, matching the example above).

Source files (all 1024x1024 PNG, read from --src; not checked into this repo)
-------------------------------------------------------------------------------
    android_foreground_light.png                full-colour mark, transparent bg
    android_foreground_tinted.png                white/grey mono silhouette, transparent bg
    android_light_background.png                 prod bg, solid #013366, opaque
    android_light_background_{dev,qa,test}.png   env gradient bg, opaque
    android_light_composite_prod.png             fg over prod bg, opaque (playstore source)
    android_light_composite_{dev,qa,test}.png    fg over env bg, opaque (playstore source)
    ios_composite_light.png                      prod iOS "Any Appearance" icon
    ios_composite_light_{dev,qa,test}.png        env iOS "Any Appearance" icon
    ios_composite_dark.png                       iOS "Dark" icon, transparent bg
    ios_composite_tintable.png                   iOS "Tinted" icon, grayscale, transparent bg

Padding / scaling recipe
-------------------------
Delivered artwork is not tightly cropped -- the mark sits at roughly 63-67%
of the 1024 canvas, centered, with the rest transparent (Figma export
convention, see the icon source folder's README.md). Every foreground-
derived asset is therefore first trimmed to its own alpha bounding box, then
its longest side is rescaled to a fixed target pixel size on a fresh
1024x1024 canvas and re-centered. This generalizes the old
"resize NxN, gravity center, composite" ImageMagick recipe (DESIGNER_SPEC.md
in the source folder) so it is insensitive to exactly how much padding a
given delivered PNG happens to already have -- one source of truth for
padding, matching that doc's stated build philosophy ("scales the mark's
longest side into the safe-zone box and centers it").

    650px of 1024 (~63%)  -- adaptive foreground layer + all "mono" assets:
                             ic_launcher_foreground.png, ic_launcher_mono_foreground.webp,
                             ic_launcher_mono.webp, ic_launcher_mono_round.webp,
                             ic_launcher_mono-playstore.png.
                             Mono assets have no background layer to composite
                             against, so they share the foreground's convention
                             for visual alignment with the colour icon.
    580px of 1024 (~57%)  -- legacy launcher composite: ic_launcher.png / _round.png,
                             foreground composited over the variant's background.

Both pixel targets are carried forward unchanged from the pre-existing
(previously uncommitted) generation recipe -- see issue #4114 unresolved
question #3 for a note that the padding may want a fresh visual pass in a
follow-up PR.

ic_launcher-playstore.png and iTunesArtwork*.png are NOT re-composited here;
they are produced directly from the pre-baked *_composite_* / *_light* source
files (already fg-over-bg at final scale), just resized/format-converted.

Size table (Android density multiplier: mdpi=1x, hdpi=1.5x, xhdpi=2x, xxhdpi=3x, xxxhdpi=4x)
------------------------------------------------------------------------------------------
    ic_launcher_foreground.png        108,162,216,324,432   (mdpi base 108)
    ic_launcher_mono_foreground.webp  108,162,216,324,432
    ic_launcher_background.png        108,162,216,324,432
    ic_launcher.png                   48,72,96,144,192      (mdpi base 48)
    ic_launcher_round.png             48,72,96,144,192
    ic_launcher_mono.webp             48,72,96,144,192
    ic_launcher_mono_round.webp       48,72,96,144,192
    ic_launcher-playstore.png         512 (single)
    ic_launcher_mono-playstore.png    512 (single)
    iTunesArtwork*.png                1024 (single)

Output invariants asserted before every write, and re-checked from disk after
------------------------------------------------------------------------------
    - Every generated raster matches its expected pixel dimensions and mode.
    - iTunesArtwork.png (base + every variant) is mode RGB -- no alpha channel
      (App Store rejects alpha on the light/"Any Appearance" icon).
    - iTunesArtwork_Dark.png / _Tinted.png are RGBA with at least one fully
      transparent pixel (alpha_min == 0).
    - ic_launcher_background.png / ic_launcher.png / ic_launcher-playstore.png
      are fully opaque (alpha_min == 255).
    - ic_launcher_round.png / ic_launcher_mono_round.webp have transparent
      corners (alpha == 0 at all 4 corners).
    - prod's ic_launcher_background.png is a solid #013366.

This script only writes icon *bytes*. It does not touch the adaptive-icon
XML wiring (<monochrome> element) or the variants/bcsc-prod delete.txt /
v3-override structural changes -- those are separate, reviewable edits.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw
except ModuleNotFoundError as e:
    raise SystemExit("This tool requires Pillow. Install it with: pip install Pillow") from e

# ─── Constants ──────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SRC = REPO_ROOT.parent / "bc-wallet-mobile-icons"

CANVAS = 1024
FOREGROUND_TARGET_PX = 650  # ~63% of 1024 -- adaptive foreground + all mono assets
LEGACY_TARGET_PX = 580  # ~57% of 1024 -- legacy launcher composite
SUPERSAMPLE = 4  # circular-mask supersample factor before downscaling
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS  # Pillow >=9.1 enum, else legacy flat attr

DENSITIES = [
    ("mdpi", 1.0),
    ("hdpi", 1.5),
    ("xhdpi", 2.0),
    ("xxhdpi", 3.0),
    ("xxxhdpi", 4.0),
]
FOREGROUND_BASE_PX = 108
LAUNCHER_BASE_PX = 48
PLAYSTORE_PX = 512

PROD_BG_RGB = (0x01, 0x33, 0x66)  # #013366, confirmed with GCPE

VARIANT_SOURCES = {
    "dev": dict(
        bg="android_light_background_dev.png",
        composite="android_light_composite_dev.png",
        ios_light="ios_composite_light_dev.png",
    ),
    "qa": dict(
        bg="android_light_background_qa.png",
        composite="android_light_composite_qa.png",
        ios_light="ios_composite_light_qa.png",
    ),
    "test": dict(
        bg="android_light_background_test.png",
        composite="android_light_composite_test.png",
        ios_light="ios_composite_light_test.png",
    ),
    "prod": dict(
        bg="android_light_background.png",
        composite="android_light_composite_prod.png",
        ios_light="ios_composite_light.png",
    ),
}

SOURCE_FILES = [
    "android_foreground_light.png",
    "android_foreground_tinted.png",
    *[v["bg"] for v in VARIANT_SOURCES.values()],
    *[v["composite"] for v in VARIANT_SOURCES.values()],
    *[v["ios_light"] for v in VARIANT_SOURCES.values()],
    "ios_composite_dark.png",
    "ios_composite_tintable.png",
]

EXPECTED_FILE_COUNT = 24 + 4 * 17  # 24 shared base files + 17 per variant x 4 variants

written_files: list[Path] = []


# ─── Image helpers ──────────────────────────────────────────────


def foreground_size(mult: float) -> int:
    return round(FOREGROUND_BASE_PX * mult)


def launcher_size(mult: float) -> int:
    return round(LAUNCHER_BASE_PX * mult)


def load_source(src_dir: Path, name: str) -> Image.Image:
    path = src_dir / name
    if not path.exists():
        raise FileNotFoundError(f"Missing source asset: {path}")
    with Image.open(path) as im:
        im.load()
        if im.size != (CANVAS, CANVAS):
            raise AssertionError(f"{path} is {im.size[0]}x{im.size[1]}, expected {CANVAS}x{CANVAS}")
        return im.convert("RGBA")


def normalize_on_canvas(im: Image.Image, target_px: int, canvas: int = CANVAS) -> Image.Image:
    """Trim to the alpha bounding box, scale the longest side to target_px,
    and re-centre on a fresh transparent canvas x canvas RGBA image."""
    # Trim by the alpha channel specifically -- getbbox() alone considers all
    # bands, so fully-transparent pixels with non-zero RGB would not be
    # trimmed. Fall back to the whole-image bbox for alpha-less sources.
    bbox = im.getchannel("A").getbbox() if "A" in im.getbands() else im.getbbox()
    if bbox is None:
        raise AssertionError("source image is fully transparent, cannot normalize")
    cropped = im.crop(bbox)
    scale = target_px / max(cropped.size)
    new_w = max(1, round(cropped.width * scale))
    new_h = max(1, round(cropped.height * scale))
    resized = cropped.resize((new_w, new_h), LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.paste(resized, ((canvas - new_w) // 2, (canvas - new_h) // 2), resized)
    return out


def circular_mask(im: Image.Image, supersample: int = SUPERSAMPLE) -> Image.Image:
    """Clip a square RGBA image to a centred inscribed circle (transparent
    outside), intersected with any pre-existing alpha. The mask is drawn at
    supersample x resolution and downscaled for a clean anti-aliased edge."""
    size = im.size[0]
    assert im.size == (size, size), f"circular_mask expects a square image, got {im.size}"
    hi = size * supersample
    mask_hi = Image.new("L", (hi, hi), 0)
    ImageDraw.Draw(mask_hi).ellipse((0, 0, hi - 1, hi - 1), fill=255)
    mask = mask_hi.resize((size, size), LANCZOS)
    out = im.copy()
    out.putalpha(ImageChops.multiply(out.getchannel("A"), mask))
    return out


def downscale(im: Image.Image, size: int) -> Image.Image:
    if im.size == (size, size):
        return im.copy()
    return im.resize((size, size), LANCZOS)


def composite_over(bg: Image.Image, fg_normalized: Image.Image) -> Image.Image:
    """Alpha-composite fg over a fully opaque bg. Mathematically always fully
    opaque when bg is fully opaque, regardless of fg's alpha."""
    return Image.alpha_composite(bg, fg_normalized)


def assert_invariant(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def save(im: Image.Image, path: Path, expected_size: tuple[int, int], expected_mode: str, fmt: str) -> None:
    assert_invariant(im.size == expected_size, f"{path}: size {im.size} != expected {expected_size}")
    assert_invariant(im.mode == expected_mode, f"{path}: mode {im.mode} != expected {expected_mode}")
    path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "WEBP":
        im.save(path, "WEBP", lossless=True)
    else:
        im.save(path, fmt)
    written_files.append(path)


# ─── Generation ─────────────────────────────────────────────────


def generate_base(src_dir: Path, out_dir: Path) -> None:
    base_root = out_dir / "_bcsc-base" / "overlay" / "app"
    android_res = base_root / "android" / "app" / "src" / "main" / "res"
    ios_appicon = base_root / "ios" / "Media.xcassets" / "AppIcon.appiconset"

    fg_light_src = load_source(src_dir, "android_foreground_light.png")
    fg_tinted_src = load_source(src_dir, "android_foreground_tinted.png")

    fg_light_norm = normalize_on_canvas(fg_light_src, FOREGROUND_TARGET_PX)
    fg_tinted_norm = normalize_on_canvas(fg_tinted_src, FOREGROUND_TARGET_PX)

    for density, mult in DENSITIES:
        fg_size = foreground_size(mult)
        launcher_sz = launcher_size(mult)
        mipmap_dir = android_res / f"mipmap-{density}"

        # Adaptive foreground (full colour)
        save(
            downscale(fg_light_norm, fg_size),
            mipmap_dir / "ic_launcher_foreground.png",
            (fg_size, fg_size),
            "RGBA",
            "PNG",
        )

        # Mono (themed/monochrome) foreground -- same normalization + size tier as colour foreground
        save(
            downscale(fg_tinted_norm, fg_size),
            mipmap_dir / "ic_launcher_mono_foreground.webp",
            (fg_size, fg_size),
            "RGBA",
            "WEBP",
        )

        # Legacy-size mono assets (currently-unreferenced legacy mono resources; refreshed for parity)
        mono_legacy = downscale(fg_tinted_norm, launcher_sz)
        save(
            mono_legacy,
            mipmap_dir / "ic_launcher_mono.webp",
            (launcher_sz, launcher_sz),
            "RGBA",
            "WEBP",
        )
        save(
            circular_mask(mono_legacy),
            mipmap_dir / "ic_launcher_mono_round.webp",
            (launcher_sz, launcher_sz),
            "RGBA",
            "WEBP",
        )

    # Mono play store icon (512, from tinted foreground, no background)
    save(
        downscale(fg_tinted_norm, PLAYSTORE_PX),
        android_res.parent / "ic_launcher_mono-playstore.png",
        (PLAYSTORE_PX, PLAYSTORE_PX),
        "RGBA",
        "PNG",
    )

    # iOS: base's own iTunesArtwork.png is a fallback that every real variant overrides;
    # generated from the prod light composite for a sane default.
    ios_light_prod = load_source(src_dir, VARIANT_SOURCES["prod"]["ios_light"])
    save(
        ios_light_prod.convert("RGB"),
        ios_appicon / "iTunesArtwork.png",
        (CANVAS, CANVAS),
        "RGB",
        "PNG",
    )

    ios_dark = load_source(src_dir, "ios_composite_dark.png")
    save(ios_dark, ios_appicon / "iTunesArtwork_Dark.png", (CANVAS, CANVAS), "RGBA", "PNG")

    ios_tinted = load_source(src_dir, "ios_composite_tintable.png")
    save(ios_tinted, ios_appicon / "iTunesArtwork_Tinted.png", (CANVAS, CANVAS), "RGBA", "PNG")


def generate_variant(src_dir: Path, out_dir: Path, variant: str) -> None:
    sources = VARIANT_SOURCES[variant]
    variant_root = out_dir / f"bcsc-{variant}" / "overlay" / "app"
    android_res = variant_root / "android" / "app" / "src" / "main" / "res"
    ios_appicon = variant_root / "ios" / "Media.xcassets" / "AppIcon.appiconset"

    bg_src = load_source(src_dir, sources["bg"])
    fg_light_src = load_source(src_dir, "android_foreground_light.png")
    fg_legacy_norm = normalize_on_canvas(fg_light_src, LEGACY_TARGET_PX)
    legacy_composite_1024 = composite_over(bg_src, fg_legacy_norm)

    for density, mult in DENSITIES:
        bg_size = foreground_size(mult)
        launcher_sz = launcher_size(mult)
        mipmap_dir = android_res / f"mipmap-{density}"

        save(
            downscale(bg_src, bg_size),
            mipmap_dir / "ic_launcher_background.png",
            (bg_size, bg_size),
            "RGBA",
            "PNG",
        )

        launcher_icon = downscale(legacy_composite_1024, launcher_sz)
        save(
            launcher_icon,
            mipmap_dir / "ic_launcher.png",
            (launcher_sz, launcher_sz),
            "RGBA",
            "PNG",
        )
        save(
            circular_mask(launcher_icon),
            mipmap_dir / "ic_launcher_round.png",
            (launcher_sz, launcher_sz),
            "RGBA",
            "PNG",
        )

    # Play store icon: direct resize of the pre-baked composite, no re-compositing
    composite_src = load_source(src_dir, sources["composite"])
    save(
        downscale(composite_src, PLAYSTORE_PX),
        android_res.parent / "ic_launcher-playstore.png",
        (PLAYSTORE_PX, PLAYSTORE_PX),
        "RGBA",
        "PNG",
    )

    # iOS light icon: alpha stripped (App Store gate)
    ios_light_src = load_source(src_dir, sources["ios_light"])
    save(
        ios_light_src.convert("RGB"),
        ios_appicon / "iTunesArtwork.png",
        (CANVAS, CANVAS),
        "RGB",
        "PNG",
    )


# ─── Post-generation verification ──────────────────────────────


def verify_outputs(out_dir: Path) -> list[str]:
    """Re-reads every file this script wrote and checks content-level
    invariants that can't be asserted purely from in-memory generation
    (opacity, transparency, exact prod colour). Returns a list of failure
    messages (empty on success)."""
    failures: list[str] = []

    def alpha_extrema(path: Path) -> tuple[int, int]:
        with Image.open(path) as im:
            return im.convert("RGBA").getchannel("A").getextrema()

    for path in written_files:
        name = path.name
        if name == "iTunesArtwork.png":
            with Image.open(path) as im:
                mode = im.mode
            if mode != "RGB":
                failures.append(f"{path}: mode {mode} != RGB (App Store rejects alpha)")
        elif name in ("iTunesArtwork_Dark.png", "iTunesArtwork_Tinted.png"):
            lo, _hi = alpha_extrema(path)
            if lo != 0:
                failures.append(f"{path}: alpha_min={lo}, expected 0 (must contain transparent pixels)")
        elif name in ("ic_launcher_background.png", "ic_launcher.png", "ic_launcher-playstore.png"):
            lo, _hi = alpha_extrema(path)
            if lo != 255:
                failures.append(f"{path}: alpha_min={lo}, expected 255 (must be fully opaque)")
        elif name in ("ic_launcher_round.png", "ic_launcher_mono_round.webp"):
            with Image.open(path) as im:
                im = im.convert("RGBA")
                w, h = im.size
                corners = [im.getpixel((0, 0)), im.getpixel((w - 1, 0)), im.getpixel((0, h - 1)), im.getpixel((w - 1, h - 1))]
            for c in corners:
                if c[3] != 0:
                    failures.append(f"{path}: corner alpha={c[3]}, expected 0 (transparent)")
                    break

    # Prod background solid-colour check (any pixel; it's a flat fill)
    prod_bg_path = out_dir / "bcsc-prod" / "overlay" / "app" / "android" / "app" / "src" / "main" / "res" / "mipmap-mdpi" / "ic_launcher_background.png"
    if prod_bg_path in written_files:
        with Image.open(prod_bg_path) as im:
            px = im.convert("RGBA").getpixel((im.width // 2, im.height // 2))
        if px[:3] != PROD_BG_RGB:
            failures.append(f"{prod_bg_path}: center pixel {px[:3]} != expected {PROD_BG_RGB} (#013366)")

    if len(written_files) != EXPECTED_FILE_COUNT:
        failures.append(f"wrote {len(written_files)} files, expected exactly {EXPECTED_FILE_COUNT}")

    return failures


# ─── CLI ────────────────────────────────────────────────────────


def main() -> int:
    written_files.clear()  # reset so repeated in-process invocations don't accumulate

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC, help="Absolute path to the source-asset folder")
    parser.add_argument("--out", type=Path, default=Path("variants"), help="Path to the variants/ directory to write into")
    args = parser.parse_args()

    src_dir = args.src if args.src.is_absolute() else Path.cwd() / args.src
    out_dir = args.out if args.out.is_absolute() else Path.cwd() / args.out

    if not src_dir.is_dir():
        print(f"ERROR: source directory not found: {src_dir}", file=sys.stderr)
        return 1
    if not out_dir.is_dir():
        print(f"ERROR: output (variants) directory not found: {out_dir}", file=sys.stderr)
        return 1

    print(f"Source: {src_dir}")
    print(f"Output: {out_dir}")

    print("\n→ Validating source assets (1024x1024)...")
    for name in SOURCE_FILES:
        load_source(src_dir, name)  # raises on missing/wrong-size
    print(f"  {len(SOURCE_FILES)} source files OK")

    try:
        print("\n→ Generating _bcsc-base shared assets...")
        generate_base(src_dir, out_dir)

        for variant in ("dev", "qa", "test", "prod"):
            print(f"→ Generating bcsc-{variant} assets...")
            generate_variant(src_dir, out_dir, variant)
    except AssertionError as e:
        print(f"ERROR: output invariant failed during generation: {e}", file=sys.stderr)
        return 1

    print(f"\n→ Wrote {len(written_files)} files. Verifying...")
    failures = verify_outputs(out_dir)
    if failures:
        print("VERIFICATION FAILED:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1

    print(f"✓ All {len(written_files)} files verified (dimensions, mode, opacity/transparency, prod colour).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
