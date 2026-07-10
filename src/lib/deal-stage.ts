// Single source of truth for "where is this deal, right now" — derives one of
// a handful of plain stages from the raw status fields already on
// LiquidityRequest/Match/Introduction, so the visual progress bar, the
// contextual "what's next" hint, and (later) the reminder watchdogs all agree
// on the same picture instead of three pages inventing their own reading of
// the same data.

import type { IntroductionStatus, MatchStatus, RequestStatus } from "@prisma/client";

export type DealStageKey = "submitted" | "matching" | "introduced" | "in_discussion" | "closed" | "rejected";

export const DEAL_STEPS: { key: DealStageKey; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "matching", label: "Matching" },
  { key: "introduced", label: "Introduced" },
  { key: "in_discussion", label: "Deal room" },
  { key: "closed", label: "Closed" },
];

const ORDER = DEAL_STEPS.map((s) => s.key);

/** Position in the 5-step visual timeline; -1 for the off-path terminal state. */
export function stageIndex(stage: DealStageKey): number {
  return stage === "rejected" ? -1 : ORDER.indexOf(stage);
}

export type MatchStageInput = {
  matchStatus: MatchStatus;
  releasedToCompany: boolean;
  releasedToPartner: boolean;
  introStatus: IntroductionStatus | null;
  hasMessages: boolean;
};

/** Stage of a single match/introduction thread — used on deal-room pages. */
export function deriveMatchStage(m: MatchStageInput): DealStageKey {
  if (m.introStatus === "SUCCESSFUL") return "closed";
  if (m.introStatus === "RESPONDED" || m.hasMessages) return "in_discussion";
  if (m.introStatus === "SENT" || m.introStatus === "PENDING") return "introduced";
  return "matching";
}

/**
 * Stage of a whole request — the most advanced of its matches, falling back
 * to the request's own status when there are no released matches yet.
 */
export function deriveRequestStage(requestStatus: RequestStatus, matches: MatchStageInput[]): DealStageKey {
  if (requestStatus === "REJECTED") return "rejected";
  if (requestStatus === "CLOSED") return "closed";

  let best: DealStageKey = requestStatus === "MATCHING" || requestStatus === "IN_REVIEW" ? "matching" : "submitted";
  if (requestStatus === "INTRODUCED") best = "introduced";

  for (const m of matches) {
    const s = deriveMatchStage(m);
    if (ORDER.indexOf(s) > ORDER.indexOf(best)) best = s;
  }
  return best;
}

type RoleHint = { title: string; body: string };
type Role = "company" | "partner" | "admin";

const HINTS: Record<DealStageKey, Record<Role, RoleHint>> = {
  submitted: {
    company: {
      title: "Under review",
      body: "Operations is reviewing your request. Partners will appear below once matching starts — no action needed from you yet.",
    },
    partner: {
      title: "Nothing released yet",
      body: "This request hasn't been released to you yet.",
    },
    admin: {
      title: "Awaiting triage",
      body: "Review the request, then advance it into matching or leave a note if something's missing.",
    },
  },
  matching: {
    company: {
      title: "Finding your partners",
      body: "Operations is scoring the partner network against your requirement. Matches appear below as they're reviewed and released.",
    },
    partner: {
      title: "New match available",
      body: "A request has been matched to you. Review the requirement below — an introduction follows once operations releases it.",
    },
    admin: {
      title: "Candidates ready",
      body: "Suggested matches are listed below — shortlist the strongest, then release to both sides or use Approve & introduce.",
    },
  },
  introduced: {
    company: {
      title: "Introduction sent",
      body: "You've been introduced to the partner. Reply in the deal room below to get the conversation moving.",
    },
    partner: {
      title: "Introduction sent",
      body: "You've been introduced to the company. Reply in the deal room below to get the conversation moving.",
    },
    admin: {
      title: "Waiting on a reply",
      body: "The introduction is out. If neither side responds in a couple of days, a reminder goes out automatically.",
    },
  },
  in_discussion: {
    company: {
      title: "In discussion",
      body: "You and the partner are talking directly. Keep terms and next steps in the deal room so operations can help if something stalls.",
    },
    partner: {
      title: "In discussion",
      body: "You and the company are talking directly. Keep terms and next steps in the deal room so operations can help if something stalls.",
    },
    admin: {
      title: "Deal in progress",
      body: "Both sides are exchanging messages. No action needed unless they flag a blocker.",
    },
  },
  closed: {
    company: {
      title: "Closed",
      body: "This request has been closed. Start a new request any time your liquidity needs change.",
    },
    partner: {
      title: "Closed",
      body: "This introduction has been closed out.",
    },
    admin: {
      title: "Closed",
      body: "This request has been closed.",
    },
  },
  rejected: {
    company: {
      title: "Not accepted",
      body: "This request wasn't accepted into matching. Check the notes below — operations usually explains what would need to change for a resubmission.",
    },
    partner: {
      title: "Not proceeding",
      body: "This match did not proceed.",
    },
    admin: {
      title: "Rejected",
      body: "This request was rejected.",
    },
  },
};

export function dealStageHint(stage: DealStageKey, role: Role): RoleHint {
  return HINTS[stage][role];
}
