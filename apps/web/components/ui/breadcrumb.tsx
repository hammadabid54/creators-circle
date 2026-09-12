import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  /** Visible label. */
  label: string;
  /** Optional link target. The last item is rendered as the current page. */
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="cc-eyebrow">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-anjuman-ink-soft hover:text-anjuman-ink"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-anjuman-ink font-medium">
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-anjuman-ink-soft/60">
                  <ChevronRight size={13} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
