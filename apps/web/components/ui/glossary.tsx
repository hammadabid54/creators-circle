'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Small (?) trigger that reveals a one-line explanation on hover/focus/
 * click. Used to explain jargon like "Pending payout" or "Pre-agreement"
 * without forcing the user to leave the page.
 */
export function Glossary({
  term,
  children,
}: {
  /** Short term label, e.g. "Pending payout". */
  term: string;
  /** Plain-text explanation, one line ideally. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="cc-glossary-trigger"
      data-open={open ? 'true' : 'false'}
      tabIndex={0}
      role="button"
      aria-label={`What is ${term}?`}
      onClick={() => setOpen((v) => !v)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      data-testid="glossary"
    >
      ?
      <span className={cn('cc-glossary-popover')} role="tooltip">
        {children}
      </span>
    </span>
  );
}

/**
 * Tiny helper for inline glossary triggers — renders the term as
 * a span with the (?) icon appended automatically.
 */
export function GlossaryTerm({
  term,
  explanation,
}: {
  term: string;
  explanation: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center">
      {term}
      <Glossary term={term}>{explanation}</Glossary>
    </span>
  );
}
