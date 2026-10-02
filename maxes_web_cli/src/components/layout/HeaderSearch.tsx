"use client";

import { FormEvent, useEffect, useState } from "react";

const RECENT_SEARCHES_STORAGE_KEY = "maxes_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function readRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const savedSearches = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || "[]");
    return Array.isArray(savedSearches)
      ? savedSearches.filter((search): search is string => typeof search === "string" && Boolean(search.trim())).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

interface HeaderSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  size?: "default" | "large";
  showLabel?: boolean;
}

export default function HeaderSearch({
  value,
  onChange,
  onSubmit,
  className = "",
  size = "default",
  showLabel = false,
}: HeaderSearchProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setRecentSearches(readRecentSearches()));
  }, []);

  const saveRecentSearch = (search: string) => {
    const normalizedSearch = search.trim();
    if (!normalizedSearch) return;

    setRecentSearches((current) => {
      const nextSearches = [
        normalizedSearch,
        ...current.filter((item) => item.localeCompare(normalizedSearch, "es", { sensitivity: "base" }) !== 0),
      ].slice(0, MAX_RECENT_SEARCHES);
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(nextSearches));
      return nextSearches;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = value.trim();
    if (!search) return;
    saveRecentSearch(search);
    setIsHistoryOpen(false);
    onSubmit?.(search);
  };

  const handleSelectRecentSearch = (search: string) => {
    saveRecentSearch(search);
    onChange(search);
    setIsHistoryOpen(false);
    onSubmit?.(search);
  };

  const clearRecentSearches = () => {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    setRecentSearches([]);
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative ${className}`}>
      <label
        htmlFor="header-search"
        className={showLabel ? "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]" : "sr-only"}
      >
        Buscar artículo
      </label>
      <div className={`flex w-full items-center overflow-hidden rounded-md border border-transparent bg-white ${size === "large" ? "h-12 lg:h-14" : "h-11"}`}>
        <input
          id="header-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsHistoryOpen(true)}
          onBlur={() => setIsHistoryOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsHistoryOpen(false);
              event.currentTarget.blur();
            }
          }}
          placeholder="¿Qué estás buscando? Encontrá productos, marcas y más..."
          aria-label="¿Qué estás buscando? Encontrá productos, marcas y más"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] sm:px-4"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex h-full shrink-0 items-center bg-[var(--color-primary)] px-2 text-[var(--color-primary-foreground)] transition hover:brightness-95 sm:px-3"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {isHistoryOpen && recentSearches.length > 0 && (
        <div
          role="listbox"
          aria-label="Últimas búsquedas"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-[var(--color-foreground)] shadow-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-3 px-3 pb-1.5 pt-1 sm:px-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Últimas búsquedas
            </p>
            <button
              type="button"
              onClick={clearRecentSearches}
              className="text-xs font-bold text-[var(--color-foreground)] underline-offset-2 hover:underline"
            >
              Limpiar
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {recentSearches.map((search) => (
              <button
                key={search}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelectRecentSearch(search)}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold transition hover:bg-slate-50 sm:px-4"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                <span className="truncate">{search}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
