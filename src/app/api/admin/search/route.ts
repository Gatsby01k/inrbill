import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Backs the admin Cmd+K command palette — a quick "jump to" across requests
// and partners by reference or name, so navigating the console doesn't
// depend on remembering which list page something lives under. Read-only,
// capped, admin-gated via session (not requireRole, since a redirect
// response would break the client's JSON fetch — a plain 401 is cleaner
// for an API route consumed by client JS).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ requests: [], partners: [] });
  }

  const [requests, partners] = await Promise.all([
    db.liquidityRequest.findMany({
      where: {
        OR: [
          { reference: { contains: q, mode: "insensitive" } },
          { company: { companyName: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, reference: true, status: true, company: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.partnerProfile.findMany({
      where: {
        OR: [
          { reference: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, reference: true, displayName: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      label: `${r.reference} — ${r.company.companyName}`,
      status: r.status,
      href: `/admin/requests/${r.id}`,
    })),
    partners: partners.map((p) => ({
      id: p.id,
      label: `${p.reference} — ${p.displayName}`,
      status: p.status,
      href: `/admin/partners/${p.id}`,
    })),
  });
}
