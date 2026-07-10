import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

// Polled by the bell icon in every workspace (admin/company/partner alike)
// every ~20s. Any logged-in user can read their own notifications — no role
// restriction, since the feature is shared across all three roles.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, unreadCount } = await listNotifications(session.user.id, 15);
  return NextResponse.json({
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
