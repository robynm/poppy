#!/usr/bin/env python3
"""
Build script for My Wardrobe PWA.

What it does:
  1. Bumps the service worker cache version (sw.js: CACHE_NAME)
  2. Validates that referenced files exist and that key sources parse
  3. Zips the pwa/ folder into dist/wardrobe-pwa-vN.zip

Usage:
  python3 build.py                 # bump SW version + zip
  python3 build.py --no-bump       # zip without bumping (re-package current version)
  python3 build.py --set 12        # set version to a specific number
  python3 build.py --clean         # remove dist/ before building
  python3 build.py --validate-only # checks only, no zip

The script is intentionally dependency-free — just Python 3.8+ stdlib.
"""

import argparse
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

# --- config -----------------------------------------------------------------
ROOT = Path(__file__).parent.resolve()
SRC = ROOT / "pwa"
DIST = ROOT / "dist"
SW_FILE = SRC / "sw.js"
MANIFEST = SRC / "manifest.json"
INDEX = SRC / "index.html"
APP_JS = SRC / "app.js"
SEED_JS = SRC / "seed.js"

# Files that must exist for a valid build
REQUIRED_FILES = [
    "index.html",
    "app.js",
    "seed.js",
    "manifest.json",
    "sw.js",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable.png",
    "icons/apple-touch-icon.png",
    "icons/favicon.png",
]

# ANSI colors (degrade gracefully on non-TTY)
class C:
    if sys.stdout.isatty():
        OK = "\033[32m"; WARN = "\033[33m"; ERR = "\033[31m"; DIM = "\033[2m"; B = "\033[1m"; X = "\033[0m"
    else:
        OK = WARN = ERR = DIM = B = X = ""

def ok(msg):    print(f"  {C.OK}✓{C.X} {msg}")
def warn(msg):  print(f"  {C.WARN}!{C.X} {msg}")
def err(msg):   print(f"  {C.ERR}✗{C.X} {msg}")
def info(msg):  print(f"  {C.DIM}·{C.X} {msg}")
def header(s):  print(f"\n{C.B}{s}{C.X}")


# --- version bumping --------------------------------------------------------
SW_VERSION_RE = re.compile(r"^(const CACHE_NAME = 'wardrobe-v)(\d+)(';)\s*$", re.MULTILINE)

def read_sw_version() -> int:
    text = SW_FILE.read_text()
    m = SW_VERSION_RE.search(text)
    if not m:
        raise RuntimeError(f"Could not find CACHE_NAME line in {SW_FILE}")
    return int(m.group(2))

def write_sw_version(new_version: int):
    text = SW_FILE.read_text()
    new_text, count = SW_VERSION_RE.subn(
        lambda m: f"{m.group(1)}{new_version}{m.group(3)}",
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Failed to rewrite CACHE_NAME in sw.js")
    SW_FILE.write_text(new_text)


# --- validation -------------------------------------------------------------
def validate_files() -> bool:
    """Check that all required source files exist."""
    all_ok = True
    for rel in REQUIRED_FILES:
        p = SRC / rel
        if not p.exists():
            err(f"missing: {rel}")
            all_ok = False
        else:
            size = p.stat().st_size
            info(f"{rel} ({format_size(size)})")
    return all_ok


def validate_manifest() -> bool:
    """Parse manifest.json and check required fields."""
    try:
        data = json.loads(MANIFEST.read_text())
    except json.JSONDecodeError as e:
        err(f"manifest.json: invalid JSON ({e})")
        return False
    required = ["name", "short_name", "start_url", "display", "icons"]
    missing = [k for k in required if k not in data]
    if missing:
        err(f"manifest.json: missing fields {missing}")
        return False
    ok(f"manifest.json: name='{data['name']}', {len(data['icons'])} icons")
    return True


def validate_sw_references() -> bool:
    """Ensure every file in the sw.js CORE_ASSETS list actually exists."""
    text = SW_FILE.read_text()
    m = re.search(r"const CORE_ASSETS = \[(.*?)\];", text, re.DOTALL)
    if not m:
        err("sw.js: CORE_ASSETS array not found")
        return False
    referenced = re.findall(r"'\./([^']+)'", m.group(1))
    missing = []
    for rel in referenced:
        if rel == "" or rel == "./":
            continue
        if not (SRC / rel).exists():
            missing.append(rel)
    if missing:
        err(f"sw.js references files that don't exist: {missing}")
        return False
    ok(f"sw.js: {len(referenced)} cached assets all exist")
    return True


def quick_js_check(path: Path) -> bool:
    """Light sanity check on a JS file — non-empty, balanced top-level structure."""
    if not path.exists():
        err(f"missing: {path.name}")
        return False
    size = path.stat().st_size
    if size == 0:
        err(f"{path.name}: empty")
        return False
    ok(f"{path.name}: {format_size(size)}")
    return True


# --- packaging --------------------------------------------------------------
def make_zip(version: int) -> Path:
    DIST.mkdir(exist_ok=True)
    zip_path = DIST / f"wardrobe-pwa-v{version}.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(SRC.rglob("*")):
            if path.is_dir():
                continue
            if any(p.startswith(".") for p in path.relative_to(SRC).parts):
                continue
            if path.name == ".DS_Store":
                continue
            arcname = path.relative_to(SRC)
            zf.write(path, arcname)
    return zip_path


def format_size(n: int) -> str:
    for unit in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


# --- main -------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Build the My Wardrobe PWA package.")
    ap.add_argument("--no-bump", action="store_true", help="Don't bump the service worker version")
    ap.add_argument("--set", type=int, metavar="N", help="Set the service worker version to N")
    ap.add_argument("--clean", action="store_true", help="Remove dist/ before building")
    ap.add_argument("--validate-only", action="store_true", help="Run checks but don't package")
    args = ap.parse_args()

    if not SRC.exists():
        err(f"Source folder not found: {SRC}")
        sys.exit(1)

    if args.clean and DIST.exists():
        shutil.rmtree(DIST)
        info(f"cleaned {DIST}")

    header("Validating sources")
    checks = [
        validate_files(),
        validate_manifest(),
        validate_sw_references(),
        quick_js_check(APP_JS),
        quick_js_check(SEED_JS),
    ]
    if not all(checks):
        err("Validation failed — aborting build.")
        sys.exit(1)

    if args.validate_only:
        ok("All checks passed.")
        return

    # Bump version
    current = read_sw_version()
    if args.set is not None:
        new_version = args.set
        action = f"set to v{new_version}"
    elif args.no_bump:
        new_version = current
        action = f"kept at v{current}"
    else:
        new_version = current + 1
        action = f"bumped v{current} → v{new_version}"

    if new_version != current:
        write_sw_version(new_version)
    header("Service worker version")
    ok(action)

    # Package
    header("Packaging")
    zip_path = make_zip(new_version)
    size = zip_path.stat().st_size
    ok(f"wrote {zip_path.relative_to(ROOT)} ({format_size(size)})")

    # Summary
    header("Done")
    print(f"  Deploy by dragging {C.B}{zip_path.relative_to(ROOT)}{C.X} (unzipped) onto Netlify Drop,")
    print(f"  or by uploading the contents to your existing site.")
    print()


if __name__ == "__main__":
    main()
