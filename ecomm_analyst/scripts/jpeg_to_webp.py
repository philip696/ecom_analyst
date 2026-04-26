#!/usr/bin/env python3
"""
Convert JPEG (.jpg / .jpeg) to WebP.

Lossless mode (default): encodes the decoded bitmap with WebP lossless — no extra
quality loss beyond what the JPEG already introduced. File size vs the JPEG may
go up or down depending on the image.

Near-lossless mode (--near-lossless): lossy WebP at quality 100 with near_lossless
tuning (when using cwebp) or Pillow's highest practical quality — usually smaller
than JPEG while visually indistinguishable for most photos.

Requires: pip install pillow
Optional (often better lossless compression): brew install webp  # provides cwebp
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

JPEG_SUFFIXES = {".jpg", ".jpeg", ".JPG", ".JPEG"}


def _cwebp_available() -> bool:
    return shutil.which("cwebp") is not None


def convert_with_cwebp_lossless(src: Path, dst: Path) -> None:
    subprocess.run(
        ["cwebp", "-lossless", "-z", "9", "-mt", str(src), "-o", str(dst)],
        check=True,
        capture_output=True,
        text=True,
    )


def convert_with_cwebp_near_lossless(src: Path, dst: Path) -> None:
    # -q 100 -near_lossless 60: strong preservation, often beats JPEG size
    subprocess.run(
        [
            "cwebp",
            "-q",
            "100",
            "-near_lossless",
            "60",
            "-mt",
            str(src),
            "-o",
            str(dst),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def convert_pillow_lossless(src: Path, dst: Path) -> None:
    with Image.open(src) as im:
        im.load()
        rgb = im.convert("RGB")
        rgb.save(dst, format="WEBP", lossless=True, method=6)


def convert_pillow_near_lossless(src: Path, dst: Path) -> None:
    with Image.open(src) as im:
        im.load()
        rgb = im.convert("RGB")
        rgb.save(dst, format="WEBP", quality=100, lossless=False, method=6)


def collect_jpegs(paths: list[Path], recursive: bool) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        if p.is_file() and p.suffix in JPEG_SUFFIXES:
            out.append(p)
        elif p.is_dir():
            if recursive:
                for f in p.rglob("*"):
                    if f.is_file() and f.suffix in JPEG_SUFFIXES:
                        out.append(f)
            else:
                for f in p.iterdir():
                    if f.is_file() and f.suffix in JPEG_SUFFIXES:
                        out.append(f)
    return sorted(set(out))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "inputs",
        nargs="+",
        type=Path,
        help="JPEG files and/or directories containing JPEGs",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=None,
        help="Write .webp files here (default: next to each source file)",
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="When a path is a directory, include subfolders",
    )
    parser.add_argument(
        "--near-lossless",
        action="store_true",
        help="Prefer smaller files with visually lossless lossy WebP (quality 100)",
    )
    parser.add_argument(
        "--pillow-only",
        action="store_true",
        help="Do not use cwebp even if installed",
    )
    args = parser.parse_args()

    files = collect_jpegs(args.inputs, args.recursive)
    if not files:
        print("No JPEG files found.", file=sys.stderr)
        return 1

    use_cwebp = _cwebp_available() and not args.pillow_only
    near = args.near_lossless

    if use_cwebp:
        convert_one = (
            convert_with_cwebp_near_lossless if near else convert_with_cwebp_lossless
        )
        backend = "cwebp"
    else:
        convert_one = (
            convert_pillow_near_lossless if near else convert_pillow_lossless
        )
        backend = "Pillow"

    out_dir = args.output_dir
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    total_in = 0
    total_out = 0
    for src in files:
        if out_dir:
            dst = out_dir / (src.stem + ".webp")
        else:
            dst = src.with_suffix(".webp")
        try:
            convert_one(src, dst)
        except subprocess.CalledProcessError as e:
            print(f"{src}: cwebp failed: {e.stderr or e}", file=sys.stderr)
            return 1
        except OSError as e:
            print(f"{src}: {e}", file=sys.stderr)
            return 1

        in_size = src.stat().st_size
        out_size = dst.stat().st_size
        total_in += in_size
        total_out += out_size
        pct = (1 - out_size / in_size) * 100 if in_size else 0
        print(
            f"{backend}\t{src.name}\t{in_size}\t->\t{out_size}\t({pct:+.1f}% vs JPEG)"
        )

    if len(files) > 1:
        pct = (1 - total_out / total_in) * 100 if total_in else 0
        print(f"TOTAL\t{total_in}\t->\t{total_out}\t({pct:+.1f}% vs JPEG)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
