#!/usr/bin/env python3
"""
Normalize line endings to LF on files I'm about to commit.

The repo is LF-only. PowerShell Edit/Write on Windows defaults to CRLF, which
creates huge diffs of pure line-ending churn. This script reads a list of
file paths and replaces CRLF -> LF in place, but only when the file actually
contains CRLF (so genuinely-CRLF files still get touched if needed, but we
don't gratuitously rewrite LF files).

Run as:  python scripts/check_eol.py <file1> <file2> ...
"""
import sys
from pathlib import Path

# Files we know should never have CRLF normalized (binary assets, etc.).
# We still inspect them — they're just images, won't match the text pattern.
SKIP = {
    "apps/web/public/images/hero-creator.jpg",
    "apps/web/public/images/hero-creator.webp",
}


def normalize(path: Path) -> str:
    """Return 'unchanged', 'normalized', or 'binary'."""
    raw = path.read_bytes()
    if b"\x00" in raw[:4096]:
        return "binary"
    if b"\r\n" not in raw:
        return "unchanged"
    new = raw.replace(b"\r\n", b"\n")
    path.write_bytes(new)
    return "normalized"


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: check_eol.py <file...>", file=sys.stderr)
        return 2
    counts = {"unchanged": 0, "normalized": 0, "binary": 0}
    normalized_files: list[str] = []
    for arg in argv:
        p = Path(arg)
        if not p.exists():
            print(f"missing: {arg}", file=sys.stderr)
            continue
        rel = str(p).replace("\\", "/")
        if rel in SKIP:
            counts["binary"] += 1
            continue
        result = normalize(p)
        counts[result] += 1
        if result == "normalized":
            normalized_files.append(arg)
    print(
        f"checked {sum(counts.values())} files: "
        f"{counts['unchanged']} LF, {counts['normalized']} normalized, {counts['binary']} binary"
    )
    for f in normalized_files:
        print(f"  normalized: {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
