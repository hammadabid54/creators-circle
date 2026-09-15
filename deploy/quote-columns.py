#!/usr/bin/env python3
"""
Quote camelCase column references in raw SQL queries.
Same case-folding issue as tables: Postgres folds unquoted camelCase
identifiers to lowercase, but the actual stored names are camelCase.
"""
import os
import re
import sys

# camelCase: starts lowercase, contains uppercase, then any letters/digits
COL_PATTERN = re.compile(r'\b([a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*)\b')

# Identifiers that look camelCase but are actually SQL keywords/aliases/fns
SKIP_WORDS = {
    # SQL keywords
    'as', 'is', 'in', 'on', 'or', 'and', 'not', 'null', 'true', 'false',
    'select', 'from', 'where', 'join', 'order', 'group', 'having',
    'limit', 'offset', 'union', 'intersect', 'except',
    'case', 'when', 'then', 'else', 'end',
    'with', 'recursive', 'exists', 'between', 'like', 'ilike',
    'desc', 'asc', 'distinct', 'all', 'any', 'some',
    'inner', 'left', 'right', 'outer', 'cross', 'full',
    'integer', 'text', 'varchar', 'boolean', 'numeric', 'timestamp',
    'cast', 'coalesce', 'length', 'count', 'sum', 'avg', 'min', 'max',
    'concat', 'substring', 'lower', 'upper', 'trim', 'replace',
    'now', 'current_timestamp', 'current_date',
    # Common aliases
    'p', 'u', 's', 'm', 'c', 'r', 'd', 'ct', 'cr', 'e', 'f', 'g', 'h',
    'x', 'y', 'z', 'a', 'b', 'i', 'j', 'k', 'l', 'n', 'o', 'q', 't',
    'v', 'w', 'demo', 'fresh',
}


def fix_sql(sql: str) -> str:
    """Quote camelCase identifiers, but only inside SQL (not inside ${...} expressions)."""
    out = []
    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]
        # Track ${...} expressions (don't modify inside)
        if ch == '$' and i + 1 < n and sql[i + 1] == '{':
            # Copy ${...} verbatim
            depth = 1
            out.append('${')
            i += 2
            while i < n and depth > 0:
                if sql[i] == '{':
                    depth += 1
                elif sql[i] == '}':
                    depth -= 1
                    if depth == 0:
                        out.append('}')
                        i += 1
                        break
                out.append(sql[i])
                i += 1
            continue
        # Try to match camelCase identifier
        m = COL_PATTERN.match(sql, i)
        if m:
            word = m.group(1)
            if word.lower() not in SKIP_WORDS:
                # Check it's not already inside a quoted identifier
                # Look back for an unmatched "
                j = i - 1
                quote_count = 0
                while j >= 0 and sql[j] != '\n':
                    if sql[j] == '"':
                        quote_count += 1
                    j -= 1
                if quote_count % 2 == 0:
                    # Not already quoted — quote it
                    out.append(f'"{word}"')
                    i = m.end()
                    continue
        out.append(ch)
        i += 1
    return ''.join(out)


def fix_in_template(sql: str) -> str:
    """Only modify SQL inside backtick template literals."""
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
            # Find end of template
            j = i
            depth = 0
            while j < len(sql):
                if sql[j] == '$' and j + 1 < len(sql) and sql[j + 1] == '{':
                    # Skip ${...}
                    d = 1
                    j += 2
                    while j < len(sql) and d > 0:
                        if sql[j] == '{':
                            d += 1
                        elif sql[j] == '}':
                            d -= 1
                        j += 1
                    continue
                if sql[j] == '`':
                    break
                j += 1
            # Now we have template content from i to j
            chunk = sql[i:j]
            out.append(fix_sql(chunk))
            i = j
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
        print("Usage: quote-columns.py <dir> [<dir> ...]")
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
