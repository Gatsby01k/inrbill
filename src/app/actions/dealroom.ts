"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, hasWorkspaceAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(path: string, msg: string): never {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

/**
 * Post a message into a match's deal room — the in-platform thread attached
 * to its latest introduction. Available to the company, the partner (once
 * released to that side), and ops. Kept as a single action rather than
 * separate per-role ones since the "who is this, and are they allowed to see
 * this match" check is the same shape either way, just against a different
 * side of the Match row.
 */
export async function postDealMessage(fd: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasWorkspaceAccess(session.user)) redirect("/verify-email?status=pending");

  const matchId = s(fd, "matchId");
  const body = s(fd, "body");

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      request: { include: { company: true } },
      partner: true,
      introductions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!match) redirect("/login");

  let authorSide: "COMPANY" | "PARTNER" | "INTERNAL";
  let authorLabel: string;
  let backPath: string;
  let notifyUserId: string | null = null;
  let notifyLink: string | null = null;

  if (session.user.role === "COMPANY") {
    if (
      !session.user.company ||
      match.request.companyId !== session.user.company.id ||
      !match.releasedToCompany
    ) {
      redirect("/company");
    }
    authorSide = "COMPANY";
    authorLabel = match.request.company.companyName;
    backPath = `/company/matches/${match.id}`;
    notifyUserId = match.partner.userId;
    notifyLink = `/partner/matches/${match.id}`;
  } else if (session.user.role === "PARTNER") {
    if (!session.user.partner || match.partnerId !== session.user.partner.id || !match.releasedToPartner) {
      redirect("/partner");
    }
    authorSide = "PARTNER";
    authorLabel = match.partner.displayName;
    backPath = `/partner/matches/${match.id}`;
    notifyUserId = match.request.company.userId;
    notifyLink = `/company/matches/${match.id}`;
  } else {
    // ADMIN — ops can post into any deal room, e.g. to nudge a stalled thread.
    authorSide = "INTERNAL";
    authorLabel = "Operator";
    backPath = s(fd, "back") || `/admin/requests/${match.requestId}`;
    notifyUserId = null;
  }

  if (!body || body.length < 1) fail(backPath, "Message can't be empty.");
  if (body.length > 4000) fail(backPath, "Message is too long.");

  const intro = match.introductions[0];
  if (!intro) fail(backPath, "No introduction recorded yet — nothing to reply to.");

  await db.introductionMessage.create({
    data: {
      introductionId: intro.id,
      authorId: session.user.id,
      authorLabel,
      authorSide,
      body,
    },
  });

  if (notifyUserId) {
    await notify(notifyUserId, {
      title: `New message from ${authorLabel}`,
      body: body.slice(0, 200),
      telegramHtml: `💬 New message from ${authorLabel} on your INRP2P introduction:\n"${body.slice(0, 200)}"`,
      link: notifyLink ?? undefined,
    });
  }

  revalidatePath(backPath);
  redirect(backPath);
}
