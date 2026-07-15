import type { NextRequest } from "next/server";
import { getSession, hasWorkspaceAccess } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

// Server-Sent Events replacement for the bell's old 20s-interval fetch
// polling. There's no message broker in this stack (Upstash's REST API
// doesn't support a blocking SUBSCRIBE, so genuine push isn't available
// without adding a new paid service) — this keeps the same "poll the DB"
// approach but moves the polling server-side and only pushes to the client
// when something actually changed. The client-visible effect is the same
// as real push (near-instant updates, no visible refresh) even though the
// server is still checking every few seconds under the hood. Honest
// tradeoff, documented rather than hidden.
//
// Runs on the Node runtime (not Edge) since it goes through the same
// Prisma client as everything else. Each connection self-closes after
// MAX_DURATION_MS; EventSource's built-in auto-reconnect opens a fresh one
// transparently, so the client never needs its own reconnect logic.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 4_000;
const MAX_DURATION_MS = 4 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!hasWorkspaceAccess(session.user)) return new Response("Email verification required", { status: 403 });
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller already closed on the other side of a race — ignore.
        }
      }

      let lastSignature = "";
      const startedAt = Date.now();

      async function tick() {
        if (closed) return;
        try {
          const { items, unreadCount } = await listNotifications(userId, 15);
          const signature = `${unreadCount}:${items.map((n) => n.id).join(",")}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            send("notifications", {
              unreadCount,
              items: items.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                link: n.link,
                read: n.read,
                createdAt: n.createdAt.toISOString(),
              })),
            });
          }
        } catch (err) {
          console.error("notifications stream tick failed", err);
        }
        if (Date.now() - startedAt > MAX_DURATION_MS) {
          closed = true;
          if (interval) clearInterval(interval);
          try {
            controller.close();
          } catch {
            // Already closed — fine.
          }
        }
      }

      tick();
      interval = setInterval(tick, POLL_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed — fine.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
