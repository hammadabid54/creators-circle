#!/usr/bin/env python3
"""
Replace boolean=integer comparisons in raw SQL with boolean=true.
SQLite accepted enabled=1 (treating 1 as true); Postgres is strict and
needs enabled=true.
"""
import os
import re
import sys

BOOLEAN_COLUMNS = [
    "enabled", "published", "indexable", "verified", "available",
    "consumed", "isPublic", "read",
]
# Match: column=1 followed by end-of-word (so we don't touch numeric columns)
PATTERN = re.compile(
    r'\b(' + '|'.join(BOOLEAN_COLUMNS) + r')=1\b'
)


def fix_in_template(sql: str) -> str:
    """Only modify inside backtick template literals."""
    out = []
    i = 0
    in_template = False
    while i < len(sql):
        ch = sql[i]
        if ch == '`':
            in_template = not in_template
            out.append(ch)
            i += 1
            continue
        if in_template:
            m = PATTERN.match(sql, i)
            if m:
                col = m.group(1)
                out.append(f'{col}=true')
                i = m.end()
                continue
        out.append(ch)
        i += 1
    return ''.join(out)


def process_file(path: str) -> int:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new = fix_in_template(content)
    if new != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
        return 1
    return 0


def main():
    if len(sys.argv) < 2:
        print("Usage: fix-boolean-comparisons.py <dir> [<dir> ...]")
        sys.exit(1)
    changed = 0
    for root in sys.argv[1:]:
        for dirpath, _dirs, files in os.walk(root):
            if any(skip in dirpath for skip in ('node_modules', '.next', '.git')):
                continue
            for name in files:
                if not name.endswith(('.ts', '.tsx')):
                    continue
                p = os.path.join(dirpath, name)
                if process_file(p):
                    changed += 1
                    print(f"  changed: {p}")
    print(f"\n{changed} files updated")

if __name__ == '__main__':
    main()
