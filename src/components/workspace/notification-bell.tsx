"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 20_000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Live-ish (polling) in-app notification bell — shared by admin, company,
    and partner workspaces via WorkspaceShell. Independent of Telegram: this
    is the one place a user sees updates even if they never linked a chat. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  async function poll() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent — the bell just doesn't update this tick.
    }
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function openPanel() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={openPanel}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-black/[0.04] hover:text-slate-700"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 max-h-96 w-80 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-xl">
          <p className="border-b border-black/10 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-3.5 py-4 text-xs text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {items.map((n) => {
                const inner = (
                  <div className="px-3.5 py-2.5 hover:bg-black/[0.02]">
                    <p className="text-[12.5px] font-medium text-slate-800">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
