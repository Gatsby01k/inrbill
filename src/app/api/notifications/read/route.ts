import { NextResponse, type NextRequest } from "next/server";
import { getSession, hasWorkspaceAccess } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasWorkspaceAccess(session.user)) return NextResponse.json({ error: "Email verification required" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string") : undefined;

  await markNotificationsRead(session.user.id, ids);
  return NextResponse.json({ ok: true });
}
