/**
 * INRP2P demo seed — OPTIONAL, separate from the real seed (prisma/seed.ts).
 *
 * Populates a fully walkable demo pipeline: companies, partners, requests,
 * matches, introductions, revenue and audit history — so the product can be
 * shown end-to-end without waiting for real submissions.
 *
 * Every demo record is clearly labelled "[DEMO]" in its display name and uses
 * @inrp2p.demo email addresses, so it can never be mistaken for real traction
 * in the admin UI. Safe to re-run — every write is keyed on a fixed id or
 * unique field, so re-running updates the same rows instead of duplicating.
 *
 * Run only against staging with DEMO_PASSWORD set explicitly.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function demoPassword() {
  const value = process.env.DEMO_PASSWORD;
  if (!value || value.length < 14 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) throw new Error("DEMO_PASSWORD must be 14+ characters with uppercase, lowercase and a number.");
  return value;
}
const DEMO_PASSWORD = demoPassword();

async function upsertUser(email: string, name: string, role: "ADMIN" | "COMPANY" | "PARTNER") {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return db.user.upsert({
    where: { email },
    update: { name, role, passwordHash, emailVerifiedAt: new Date() },
    create: { email, passwordHash, name, role, emailVerifiedAt: new Date() },
  });
}

async function audit(
  id: string,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    actorLabel: string;
    requestId?: string;
    partnerId?: string;
    matchId?: string;
    meta?: Record<string, unknown>;
  },
) {
  await db.auditLog.upsert({
    where: { id },
    update: {},
    create: {
      id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorLabel: input.actorLabel,
      requestId: input.requestId ?? null,
      partnerId: input.partnerId ?? null,
      matchId: input.matchId ?? null,
      meta: input.meta === undefined ? undefined : (input.meta as Prisma.InputJsonValue),
    },
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@inrp2p.local").toLowerCase();
  const adminUser = await upsertUser(email, process.env.ADMIN_NAME ?? "Network Operator", "ADMIN");

  // ── Companies ──────────────────────────────────────────────────────────
  const companySpecs = [
    {
      email: "demo-company-1@inrp2p.demo",
      companyName: "[DEMO] Meridian Exports Pvt Ltd",
      website: "https://meridian-exports.example",
      jurisdiction: "India",
      contactName: "Ananya Rao",
      contactRole: "Head of Treasury",
      telegram: "@ananya_meridian_demo",
    },
    {
      email: "demo-company-2@inrp2p.demo",
      companyName: "[DEMO] Solara Commerce FZE",
      website: "https://solara-commerce.example",
      jurisdiction: "UAE",
      contactName: "Faisal Al Marri",
      contactRole: "CFO",
      telegram: "@faisal_solara_demo",
    },
    {
      email: "demo-company-3@inrp2p.demo",
      companyName: "[DEMO] Northbridge Retail Ltd",
      website: "https://northbridge-retail.example",
      jurisdiction: "Singapore",
      contactName: "Wei Lin Tan",
      contactRole: "Finance Director",
      telegram: "@weilin_northbridge_demo",
    },
  ];

  const companies = [];
  for (const spec of companySpecs) {
    const user = await upsertUser(spec.email, spec.contactName, "COMPANY");
    const company = await db.companyProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: spec.companyName,
        website: spec.website,
        jurisdiction: spec.jurisdiction,
        contactName: spec.contactName,
        contactRole: spec.contactRole,
        telegram: spec.telegram,
      },
      create: {
        userId: user.id,
        companyName: spec.companyName,
        website: spec.website,
        jurisdiction: spec.jurisdiction,
        contactName: spec.contactName,
        contactRole: spec.contactRole,
        telegram: spec.telegram,
      },
    });
    companies.push(company);
  }
  const [meridian, solara, northbridge] = companies;

  // ── Partners ───────────────────────────────────────────────────────────
  const partnerSpecs = [
    {
      email: "demo-partner-1@inrp2p.demo",
      reference: "DEMO-PTR-01",
      displayName: "[DEMO] Kranti Forex Partners",
      legalName: "Kranti Forex Partners Pvt Ltd",
      contactName: "Rohit Deshmukh",
      status: "VERIFIED" as const,
      directions: ["INR_TO_USDT", "USDT_TO_INR"] as const,
      dailyCapacityBand: "₹2–10 crore / day",
      monthlyCapacityBand: "₹50–200 crore / month",
      minTicket: "₹5 lakh",
      maxTicket: "₹8 crore",
      operatingCountry: "India",
      riskNotes: null as string | null,
    },
    {
      email: "demo-partner-2@inrp2p.demo",
      reference: "DEMO-PTR-02",
      displayName: "[DEMO] Silverline Treasury",
      legalName: "Silverline Treasury Services LLC",
      contactName: "Priya Nair",
      status: "VERIFIED" as const,
      directions: ["INR_PAYOUTS", "INR_TO_USDT"] as const,
      dailyCapacityBand: "₹50 lakh – ₹2 crore / day",
      monthlyCapacityBand: "₹10–50 crore / month",
      minTicket: "₹2 lakh",
      maxTicket: "₹3 crore",
      operatingCountry: "India",
      riskNotes: null as string | null,
    },
    {
      email: "demo-partner-3@inrp2p.demo",
      reference: "DEMO-PTR-03",
      displayName: "[DEMO] Bluewave Settlements",
      legalName: null,
      contactName: "Daniyar Kenzhe",
      status: "UNDER_REVIEW" as const,
      directions: ["USDT_TO_INR"] as const,
      dailyCapacityBand: "₹10–50 lakh / day",
      monthlyCapacityBand: null,
      minTicket: null,
      maxTicket: null,
      operatingCountry: "Kazakhstan",
      riskNotes: null as string | null,
    },
    {
      email: "demo-partner-4@inrp2p.demo",
      reference: "DEMO-PTR-04",
      displayName: "[DEMO] Coastal FX Desk",
      legalName: null,
      contactName: "Marco Rivera",
      status: "REJECTED" as const,
      directions: ["INR_PAYOUTS"] as const,
      dailyCapacityBand: "Under ₹10 lakh / day",
      monthlyCapacityBand: null,
      minTicket: null,
      maxTicket: null,
      operatingCountry: "Philippines",
      riskNotes: "Could not evidence KYB documentation on request — declined at review.",
    },
    {
      email: "demo-partner-5@inrp2p.demo",
      reference: "DEMO-PTR-05",
      displayName: "[DEMO] Vertex Liquidity Group",
      legalName: "Vertex Liquidity Group DMCC",
      contactName: "Hana Suzuki",
      status: "LIMITED" as const,
      directions: ["USDT_TO_INR", "INR_TO_USDT"] as const,
      dailyCapacityBand: "₹50 lakh – ₹2 crore / day",
      monthlyCapacityBand: "₹10–50 crore / month",
      minTicket: "₹3 lakh",
      maxTicket: "₹2 crore",
      operatingCountry: "UAE",
      riskNotes: "Verified with a ticket-size cap pending a second compliance reference.",
    },
  ];

  const partners = [];
  for (const spec of partnerSpecs) {
    const user = await upsertUser(spec.email, spec.contactName, "PARTNER");
    const partner = await db.partnerProfile.upsert({
      where: { userId: user.id },
      update: {
        reference: spec.reference,
        displayName: spec.displayName,
        legalName: spec.legalName,
        contactName: spec.contactName,
        experienceBand: "3–5 years",
        directions: [...spec.directions],
        banks: ["HDFC Bank", "ICICI Bank", "Other / any"],
        methods: ["IMPS", "UPI", "RTGS"],
        dailyCapacityBand: spec.dailyCapacityBand,
        monthlyCapacityBand: spec.monthlyCapacityBand,
        minTicket: spec.minTicket,
        maxTicket: spec.maxTicket,
        settlementPreference: "Same-day bank transfer after confirmation",
        workingHours: "09:00–22:00 IST, 7 days",
        reserveBand: "₹1–5 crore",
        jurisdictions: "India nationwide",
        operatingCountry: spec.operatingCountry,
        complianceFlags: ["Registered business entity", "AML / KYC policy in place"],
        riskNotes: spec.riskNotes,
        status: spec.status,
        verifiedAt: spec.status === "VERIFIED" || spec.status === "LIMITED" ? new Date() : null,
      },
      create: {
        userId: user.id,
        reference: spec.reference,
        displayName: spec.displayName,
        legalName: spec.legalName,
        contactName: spec.contactName,
        experienceBand: "3–5 years",
        directions: [...spec.directions],
        banks: ["HDFC Bank", "ICICI Bank", "Other / any"],
        methods: ["IMPS", "UPI", "RTGS"],
        dailyCapacityBand: spec.dailyCapacityBand,
        monthlyCapacityBand: spec.monthlyCapacityBand,
        minTicket: spec.minTicket,
        maxTicket: spec.maxTicket,
        settlementPreference: "Same-day bank transfer after confirmation",
        workingHours: "09:00–22:00 IST, 7 days",
        reserveBand: "₹1–5 crore",
        jurisdictions: "India nationwide",
        operatingCountry: spec.operatingCountry,
        complianceFlags: ["Registered business entity", "AML / KYC policy in place"],
        riskNotes: spec.riskNotes,
        status: spec.status,
        verifiedAt: spec.status === "VERIFIED" || spec.status === "LIMITED" ? new Date() : null,
      },
    });
    partners.push(partner);
    await audit(`demo-audit-partner-${spec.reference}`, {
      action: "partner.applied",
      entityType: "PartnerProfile",
      entityId: partner.id,
      actorLabel: spec.displayName,
      partnerId: partner.id,
      meta: { reference: spec.reference },
    });
  }
  const [kranti, silverline, bluewave, , vertex] = partners;

  // ── Company requests ─────────────────────────────────────────────────
  const requestSpecs = [
    {
      reference: "DEMO-REQ-01",
      company: meridian,
      direction: "INR_TO_USDT" as const,
      requestType: "INR_TO_USDT" as const,
      status: "MATCHING" as const,
      urgency: "STANDARD" as const,
      dailyVolumeBand: "₹2–10 crore / day",
      monthlyVolumeBand: "₹50–200 crore / month",
      ticketSize: "₹20–50 lakh per ticket",
      countriesInvolved: "India, UAE",
      jurisdiction: "India",
    },
    {
      reference: "DEMO-REQ-02",
      company: solara,
      direction: "USDT_TO_INR" as const,
      requestType: "USDT_TO_INR" as const,
      status: "INTRODUCED" as const,
      urgency: "URGENT" as const,
      dailyVolumeBand: "₹50 lakh – ₹2 crore / day",
      monthlyVolumeBand: "₹10–50 crore / month",
      ticketSize: "₹5–15 lakh per ticket",
      countriesInvolved: "UAE, India",
      jurisdiction: "UAE",
    },
    {
      reference: "DEMO-REQ-03",
      company: northbridge,
      direction: "INR_PAYOUTS" as const,
      requestType: "INR_PAYOUTS" as const,
      status: "CLOSED" as const,
      urgency: "STANDARD" as const,
      dailyVolumeBand: "₹10–50 lakh / day",
      monthlyVolumeBand: "₹1–10 crore / month",
      ticketSize: "₹1–3 lakh per ticket",
      countriesInvolved: "Singapore, India",
      jurisdiction: "Singapore",
    },
  ];

  const requests = [];
  for (const spec of requestSpecs) {
    const request = await db.liquidityRequest.upsert({
      where: { reference: spec.reference },
      update: {
        status: spec.status,
        urgency: spec.urgency,
      },
      create: {
        reference: spec.reference,
        companyId: spec.company.id,
        direction: spec.direction,
        requestType: spec.requestType,
        dailyVolumeBand: spec.dailyVolumeBand,
        monthlyVolumeBand: spec.monthlyVolumeBand,
        ticketSize: spec.ticketSize,
        urgency: spec.urgency,
        countriesInvolved: spec.countriesInvolved,
        banks: ["HDFC Bank", "ICICI Bank"],
        methods: ["IMPS", "RTGS"],
        requiredSpeed: "Same day",
        jurisdiction: spec.jurisdiction,
        kycReadiness: "KYC documents available on request",
        kycNotes: "Demo request — sample compliance/licensing notes for review.",
        partnerRequirements: "Needs a partner comfortable with recurring corporate volume.",
        notes: "Seeded demo request for walkthrough purposes.",
        status: spec.status,
      },
    });
    requests.push(request);
    await audit(`demo-audit-request-${spec.reference}`, {
      action: "request.submitted",
      entityType: "LiquidityRequest",
      entityId: request.id,
      actorLabel: spec.company.companyName,
      requestId: request.id,
      meta: { reference: spec.reference, requestType: spec.requestType },
    });
  }
  const [meridianReq, solaraReq, northbridgeReq] = requests;

  // ── Matches ───────────────────────────────────────────────────────────
  const matchSpecs = [
    {
      request: meridianReq,
      partner: kranti,
      status: "SHORTLISTED" as const,
      confidenceScore: 78,
      nextAction: "Confirm KYB pack, then move to introduction.",
      releasedToCompany: false,
      releasedToPartner: false,
    },
    {
      request: meridianReq,
      partner: silverline,
      status: "SUGGESTED" as const,
      confidenceScore: 55,
      nextAction: "Awaiting partner capacity confirmation for this ticket size.",
      releasedToCompany: false,
      releasedToPartner: false,
    },
    {
      request: solaraReq,
      partner: kranti,
      status: "INTRODUCED" as const,
      confidenceScore: 82,
      nextAction: "Track first response from both sides.",
      releasedToCompany: true,
      releasedToPartner: true,
    },
    {
      request: solaraReq,
      partner: vertex,
      status: "ACCEPTED" as const,
      confidenceScore: 70,
      nextAction: "Backup partner — keep warm in case primary stalls.",
      releasedToCompany: true,
      releasedToPartner: true,
    },
    {
      request: northbridgeReq,
      partner: silverline,
      status: "ACCEPTED" as const,
      confidenceScore: 91,
      nextAction: "Closed successfully — monitor for repeat volume.",
      releasedToCompany: true,
      releasedToPartner: true,
    },
  ];

  const matches = [];
  for (const spec of matchSpecs) {
    const match = await db.match.upsert({
      where: { requestId_partnerId: { requestId: spec.request.id, partnerId: spec.partner.id } },
      update: {
        status: spec.status,
        confidenceScore: spec.confidenceScore,
        nextAction: spec.nextAction,
        releasedToCompany: spec.releasedToCompany,
        releasedToPartner: spec.releasedToPartner,
      },
      create: {
        requestId: spec.request.id,
        partnerId: spec.partner.id,
        status: spec.status,
        confidenceScore: spec.confidenceScore,
        nextAction: spec.nextAction,
        adminNote: "Seeded demo match for walkthrough purposes.",
        releasedToCompany: spec.releasedToCompany,
        releasedToPartner: spec.releasedToPartner,
      },
    });
    matches.push(match);
    await audit(`demo-audit-match-${spec.request.reference}-${spec.partner.reference}`, {
      action: "match.created",
      entityType: "Match",
      entityId: match.id,
      actorLabel: "Operator",
      requestId: spec.request.id,
      partnerId: spec.partner.id,
      matchId: match.id,
      meta: { partnerName: spec.partner.displayName, requestRef: spec.request.reference },
    });
  }
  const [, , solaraKrantiMatch, , northbridgeMatch] = matches;

  // ── Introductions ─────────────────────────────────────────────────────
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const introSpecs = [
    {
      id: "demo-intro-1",
      match: solaraKrantiMatch,
      status: "RESPONDED" as const,
      channel: "TELEGRAM" as const,
      summary: "Introduced Solara Commerce to Kranti Forex Partners over Telegram.",
      outcome: "Both sides discussing a pilot batch before committing to full volume.",
      followUpDate: yesterday,
      sentAt: yesterday,
      respondedAt: yesterday,
    },
    {
      id: "demo-intro-2",
      match: matches[3], // Solara ↔ Vertex
      status: "SENT" as const,
      channel: "EMAIL" as const,
      summary: "Backup introduction sent as a fallback option for Solara Commerce.",
      outcome: null,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      sentAt: yesterday,
      respondedAt: null,
    },
    {
      id: "demo-intro-3",
      match: northbridgeMatch,
      status: "SUCCESSFUL" as const,
      channel: "EMAIL" as const,
      summary: "Introduced Northbridge Retail to Silverline Treasury.",
      outcome: "Onboarded — first settlement completed successfully.",
      followUpDate: null,
      sentAt: yesterday,
      respondedAt: yesterday,
    },
  ];

  for (const spec of introSpecs) {
    const intro = await db.introduction.upsert({
      where: { id: spec.id },
      update: {
        status: spec.status,
        outcome: spec.outcome,
        followUpDate: spec.followUpDate,
      },
      create: {
        id: spec.id,
        matchId: spec.match.id,
        status: spec.status,
        channel: spec.channel,
        summary: spec.summary,
        outcome: spec.outcome,
        followUpDate: spec.followUpDate,
        sentAt: spec.sentAt,
        respondedAt: spec.respondedAt,
      },
    });
    await audit(`demo-audit-${spec.id}`, {
      action: "introduction.created",
      entityType: "Introduction",
      entityId: intro.id,
      actorLabel: "Operator",
      matchId: spec.match.id,
      requestId: spec.match.requestId,
      partnerId: spec.match.partnerId,
      meta: { channel: spec.channel },
    });
  }

  // ── Revenue ───────────────────────────────────────────────────────────
  const revenueSpecs = [
    {
      id: "demo-rev-1",
      request: meridianReq,
      match: null,
      amount: "150000",
      currency: "INR" as const,
      type: "INTRO_FEE" as const,
      status: "POTENTIAL" as const,
      payerType: "Company",
      payerName: meridian.companyName,
      basis: "Potential introduction fee — pending a confirmed match.",
      dueDate: null as Date | null,
      paidAt: null as Date | null,
    },
    {
      id: "demo-rev-2",
      request: solaraReq,
      match: solaraKrantiMatch,
      amount: "5000",
      currency: "USD" as const,
      type: "INTRO_FEE" as const,
      status: "AGREED" as const,
      payerType: "Partner",
      payerName: kranti.displayName,
      basis: "Agreed introduction fee, invoice pending.",
      dueDate: null as Date | null,
      paidAt: null as Date | null,
    },
    {
      id: "demo-rev-3",
      request: solaraReq,
      match: solaraKrantiMatch,
      amount: "2500",
      currency: "USD" as const,
      type: "MONTHLY_RETAINER" as const,
      status: "INVOICED" as const,
      payerType: "Company",
      payerName: solara.companyName,
      basis: "First month retainer for ongoing sourcing support.",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) as Date | null,
      paidAt: null as Date | null,
    },
    {
      id: "demo-rev-4",
      request: northbridgeReq,
      match: northbridgeMatch,
      amount: "300000",
      currency: "INR" as const,
      type: "SUCCESS_FEE" as const,
      status: "PAID" as const,
      payerType: "Company",
      payerName: northbridge.companyName,
      basis: "Success fee on completed introduction.",
      dueDate: null as Date | null,
      paidAt: new Date() as Date | null,
    },
  ];

  for (const spec of revenueSpecs) {
    await db.revenueRecord.upsert({
      where: { id: spec.id },
      update: {
        status: spec.status,
        amount: spec.amount,
      },
      create: {
        id: spec.id,
        requestId: spec.request.id,
        matchId: spec.match?.id ?? null,
        amount: spec.amount,
        currency: spec.currency,
        type: spec.type,
        payerType: spec.payerType,
        payerName: spec.payerName,
        basis: spec.basis,
        status: spec.status,
        dueDate: spec.dueDate,
        paidAt: spec.paidAt,
        invoicedAt: spec.status === "INVOICED" || spec.status === "PAID" ? new Date() : null,
      },
    });
    await audit(`demo-audit-${spec.id}`, {
      action: "revenue.created",
      entityType: "RevenueRecord",
      entityId: spec.id,
      actorLabel: "Operator",
      requestId: spec.request.id,
      matchId: spec.match?.id,
      meta: { amount: spec.amount, currency: spec.currency, type: spec.type },
    });
  }

  const line = "─".repeat(60);
  console.log(line);
  console.log("INRP2P demo seed complete.");
  console.log(`  Operator login: ${email}`);
  console.log("  Demo accounts use the DEMO_PASSWORD supplied to this process.");
  console.log("  e.g. demo-company-1@inrp2p.demo, demo-partner-1@inrp2p.demo");
  console.log("");
  console.log("  All demo records are prefixed [DEMO] and use @inrp2p.demo emails —");
  console.log("  safe to identify and safe to re-run (idempotent upserts).");
  console.log(line);

  void adminUser;
  void bluewave;
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
