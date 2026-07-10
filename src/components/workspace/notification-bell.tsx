"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 20_000;
const PANEL_WIDTH = 320;

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
    is the one place a user sees updates even if they never linked a chat.

    The dropdown renders `fixed` and positions itself from the button's own
    on-screen coordinates (measured on open) rather than `absolute` inside
    the shell's narrow sidebar column — a 320px panel anchored `absolute`
    inside a 236px-wide sidebar has nowhere to lay out correctly and looks
    broken. Position is anchored to the button's left edge and then clamped
    to stay within the viewport.

    It's also rendered through a React portal straight into `document.body`,
    not inline where the button sits. Reason: WorkspaceShell's sidebar
    (`<aside>`) is `position: sticky`, which makes it establish its own CSS
    stacking context. A `position: fixed` dropdown nested *inside* that
    sidebar never actually competes for top-most paint order against the
    rest of the page on its own z-index — it's confined to painting
    wherever the sidebar's context lands, which is earlier in DOM order than
    the main content column. In practice that meant any positioned element
    in the page content (e.g. a card in the request wizard) could paint over
    the open dropdown and clip it, even though the dropdown's z-index was
    higher. Portalling to `document.body` escapes that ancestor entirely, so
    the dropdown's own z-index is compared at the top level like it should
    be. (CommandPalette/AiCopilot don't need this — they're already mounted
    outside the sidebar, as siblings of WorkspaceShell in admin/layout.tsx.) */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openPanel() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const margin = 16;
      const maxLeft = window.innerWidth - PANEL_WIDTH - margin;
      const left = Math.min(Math.max(rect.left, margin), Math.max(margin, maxLeft));
      setPos({ top: rect.bottom + 8, left });
    }
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
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
    <>
      <button
        ref={buttonRef}
        onClick={openPanel}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base leading-none text-slate-500 hover:bg-black/[0.04] hover:text-slate-700"
        aria-label="Notifications"
      >
        <span className="leading-none">🔔</span>
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#F6F1E7] bg-rose-500 px-1 text-[9px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, width: `min(${PANEL_WIDTH}px, calc(100vw - 2rem))` }}
              className="fixed z-50 max-h-96 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-2xl"
            >
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
