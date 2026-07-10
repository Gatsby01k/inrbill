"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { id: string; label: string; status: string; href: string };
type SearchResponse = { requests: Hit[]; partners: Hit[] };

/**
 * Cmd+K / Ctrl+K "jump to" across the admin console — search requests and
 * partners by reference or name without leaving whatever page you're on.
 * Mounted once in the admin layout; renders nothing until opened.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({ requests: [], partners: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ requests: [], partners: [] });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults({ requests: [], partners: [] });
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : { requests: [], partners: [] }))
        .then((data: SearchResponse) => setResults(data))
        .catch(() => setResults({ requests: [], partners: [] }))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  const allHits = [...results.requests, ...results.partners];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 hidden items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm hover:text-gold-700 lg:flex"
      >
        Search
        <kbd className="rounded border border-black/10 bg-black/[0.03] px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && allHits[0]) go(allHits[0].href);
          }}
          placeholder="Jump to a request or partner… (Cmd+K)"
          className="w-full border-b border-black/10 px-4 py-3 text-sm outline-none placeholder:text-slate-400"
        />
        <div className="max-h-80 overflow-y-auto py-1.5">
          {loading ? <p className="px-4 py-3 text-xs text-slate-400">Searching…</p> : null}
          {!loading && query.trim().length >= 2 && allHits.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">No matches.</p>
          ) : null}
          {!loading && query.trim().length < 2 ? (
            <p className="px-4 py-3 text-xs text-slate-400">Type a reference or name — e.g. REQ-0012, PTR-0003.</p>
          ) : null}
          {results.requests.length ? (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Requests
              </p>
              {results.requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => go(r.href)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 hover:bg-gold-500/[0.06]"
                >
                  <span>{r.label}</span>
                  <span className="text-[11px] text-slate-400">{r.status}</span>
                </button>
              ))}
            </div>
          ) : null}
          {results.partners.length ? (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Partners
              </p>
              {results.partners.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(p.href)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 hover:bg-gold-500/[0.06]"
                >
                  <span>{p.label}</span>
                  <span className="text-[11px] text-slate-400">{p.status}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
