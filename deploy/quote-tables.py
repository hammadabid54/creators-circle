#!/usr/bin/env python3
"""
Quote PascalCase table names in raw SQL queries inside Prisma templates.
Postgres preserves case in quoted identifiers; without quotes, identifiers
fold to lowercase and don't match the actual stored names.
"""
import os
import re
import sys

# Prisma model names (PascalCase) that appear in raw SQL
MODEL_NAMES = [
    "User", "Account", "Session", "VerificationToken", "OtpToken",
    "CreatorProfile", "SocialAccount", "Audience", "RateCard",
    "PortfolioItem", "BrandCollab", "BrandProfile", "Verification",
    "Campaign", "Application", "Contract", "Milestone",
    "ContentSubmission", "Message", "Review", "Transaction",
    "Dispute", "CreatorMetricSnapshot", "DiscoveryTaxon",
    "CreatorTaxon", "DiscoveryPage", "DeliveryReview",
    "Notification", "NotificationDelivery", "NotificationPreference",
    "AuditEvent",
]

# Build regex: \b(?:FROM|INTO|UPDATE|JOIN) <ModelName>\b
# Only quote when NOT already quoted (i.e., not preceded by ")
KEYWORDS = ["FROM", "INTO", "UPDATE", "JOIN"]
PATTERN = re.compile(
    r'(?<!["\w])(' + '|'.join(KEYWORDS) + r')\s+(' + '|'.join(MODEL_NAMES) + r')(?!["\w])'
)

def quote_in_string(sql: str) -> str:
    """Quote table name only inside Prisma template literals (backticks)."""
    # Simple state machine: only modify inside backticks
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
            # Try to match keyword + ModelName here
            m = PATTERN.match(sql, i)
            if m:
                keyword, model = m.group(1), m.group(2)
                out.append(f'{keyword} "{model}"')
                i = m.end()
                continue
        out.append(ch)
        i += 1
    return ''.join(out)


def process_file(path: str) -> int:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new = quote_in_string(content)
    if new != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
        return 1
    return 0


def main():
    if len(sys.argv) < 2:
        print("Usage: quote-tables.py <dir> [<dir> ...]")
        sys.exit(1)
    changed_files = 0
    total_changes = 0
    for root in sys.argv[1:]:
        for dirpath, _dirs, files in os.walk(root):
            # Skip build / node_modules / .next
            if any(skip in dirpath for skip in ('node_modules', '.next', '.git')):
                continue
            for name in files:
                if not name.endswith(('.ts', '.tsx')):
                    continue
                p = os.path.join(dirpath, name)
                if process_file(p):
                    changed_files += 1
                    # Count diffs for reporting
                    with open(p, 'r', encoding='utf-8') as f:
                        new = f.read()
                    total_changes += new.count('"User"') + new.count('"CreatorProfile"')
                    print(f"  changed: {p}")
    print(f"\n{changed_files} files updated")

if __name__ == '__main__':
    main()
