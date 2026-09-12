'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Hash, MapPin, User } from 'lucide-react';

export type SearchSuggestion =
  | { kind: 'creator'; label: string; href: string }
  | { kind: 'niche'; label: string; href: string }
  | { kind: 'city'; label: string; href: string };

export function HeroSearch({ suggestions }: { suggestions: SearchSuggestion[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLFormElement | null>(null);

  // Close on outside click and Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q
    ? suggestions
        .filter((s) => s.label.toLowerCase().includes(q))
        .slice(0, 8)
    : suggestions.slice(0, 6);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = matches[active] || matches[0];
    if (target) {
      router.push(target.href);
    } else if (q) {
      router.push('/creators?q=' + encodeURIComponent(query));
    } else {
      router.push('/creators');
    }
    setOpen(false);
  }

  function pick(idx: number) {
    const target = matches[idx];
    if (!target) return;
    router.push(target.href);
    setOpen(false);
  }

  return (
    <form
      ref={rootRef}
      action="/creators"
      method="GET"
      onSubmit={onSubmit}
      className="mt-8 relative"
      role="search"
    >
      <div className="flex items-center gap-2 p-2 bg-white border border-[#d9cfd4] rounded-xl shadow-[0_3px_12px_#30212c05] focus-within:border-anjuman-purple">
        <Search
          className="ml-3 text-anjuman-ink-soft shrink-0 hidden sm:block"
          size={20}
          aria-hidden
        />
        <label htmlFor="creator-search" className="sr-only">
          Search creators by name, niche, or city
        </label>
        <input
          id="creator-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Try fashion, food, or a creator's name"
          className="min-w-0 flex-1 px-2 py-3 bg-transparent outline-none text-sm"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && matches.length) {
              e.preventDefault();
              pick(active);
            }
          }}
        />
        <button className="cc-button shrink-0" type="submit">
          Find creators
        </button>
      </div>
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-2 bg-white border border-anjuman-line rounded-2xl shadow-xl overflow-hidden"
        >
          {matches.map((s, i) => {
            const Icon = s.kind === 'creator' ? User : s.kind === 'city' ? MapPin : Hash;
            const group =
              s.kind === 'creator' ? 'Creator' : s.kind === 'city' ? 'City' : 'Niche';
            return (
              <li
                role="option"
                aria-selected={i === active}
                key={s.kind + ':' + s.href}
                className={
                  'flex items-center gap-3 px-4 py-3 text-sm cursor-pointer ' +
                  (i === active ? 'bg-[#f5eff3] text-anjuman-purple' : 'hover:bg-[#faf8f5]')
                }
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // mousedown beats the input's blur, so the click lands.
                  e.preventDefault();
                  pick(i);
                }}
              >
                <Icon size={16} className="text-anjuman-ink-soft shrink-0" />
                <span className="flex-1 truncate">{s.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-anjuman-ink-soft">
                  {group}
                </span>
              </li>
            );
          })}
          {q && (
            <li className="px-4 py-2.5 text-xs text-anjuman-ink-soft border-t border-anjuman-line bg-[#faf8f5]">
              Press Enter to search all of Kollabo for &ldquo;{query}&rdquo;.
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
