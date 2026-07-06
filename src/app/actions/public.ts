"use server";

import { redirect } from "next/navigation";
import { audit, nextReference } from "@/lib/audit";
import { createSession, getSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  accountSchema,
  companyRequestSchema,
  flattenErrors,
  partnerApplicationSchema,
  type ActionState,
} from "@/lib/schemas";
import type { Direction } from "@prisma/client";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function arr(formData: FormData, key: string) {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

/** Company submits an INR liquidity request (public form or company workspace). */
export async function submitCompanyRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Honeypot — bots fill hidden fields; pretend success without writing.
  if (str(formData, "website_hp")) redirect("/request/submitted?ref=received");

  const session = await getSession();
  const loggedInCompany =
    session && session.user.role === "COMPANY" && session.user.company
      ? session.user.company
      : null;

  const input = {
    companyName: loggedInCompany ? loggedInCompany.companyName : str(formData, "companyName"),
    website: loggedInCompany ? (loggedInCompany.website ?? "") : str(formData, "website"),
    companyJurisdiction: loggedInCompany
      ? loggedInCompany.jurisdiction
      : str(formData, "companyJurisdiction"),
    contactName: loggedInCompany ? loggedInCompany.contactName : str(formData, "contactName"),
    contactRole: loggedInCompany ? (loggedInCompany.contactRole ?? "") : str(formData, "contactRole"),
    telegram: loggedInCompany ? (loggedInCompany.telegram ?? "") : str(formData, "telegram"),
    phone: loggedInCompany ? (loggedInCompany.phone ?? "") : str(formData, "phone"),
    direction: str(formData, "direction"),
    dailyVolumeBand: str(formData, "dailyVolumeBand"),
    monthlyVolumeBand: str(formData, "monthlyVolumeBand"),
    banks: arr(formData, "banks"),
    methods: arr(formData, "methods"),
    requiredSpeed: str(formData, "requiredSpeed"),
    jurisdiction: str(formData, "jurisdiction"),
    kycReadiness: str(formData, "kycReadiness"),
    kycNotes: str(formData, "kycNotes"),
    notes: str(formData, "notes"),
  };

  const parsed = companyRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  }
  const data = parsed.data;

  let companyId: string;
  let userId: string | null = null;
  let actor = data.companyName;

  if (loggedInCompany) {
    companyId = loggedInCompany.id;
    userId = session!.user.id;
    actor = loggedInCompany.companyName;
  } else {
    const account = accountSchema.safeParse({
      email: str(formData, "email"),
      password: str(formData, "password"),
    });
    if (!account.success) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: flattenErrors(account.error),
      };
    }
    const existing = await db.user.findUnique({ where: { email: account.data.email } });
    if (existing) {
      return {
        fieldErrors: {},
        error:
          "An account already exists for this email. Log in first, then submit the request from your workspace.",
      };
    }
    const passwordHash = await hashPassword(account.data.password);
    const created = await db.user.create({
      data: {
        email: account.data.email,
        passwordHash,
        name: data.contactName,
        role: "COMPANY",
        company: {
          create: {
            companyName: data.companyName,
            website: data.website,
            jurisdiction: data.companyJurisdiction,
            contactName: data.contactName,
            contactRole: data.contactRole,
            telegram: data.telegram,
            phone: data.phone,
          },
        },
      },
      include: { company: true },
    });
    companyId = created.company!.id;
    userId = created.id;
  }

  const reference = await nextReference("request");
  const request = await db.liquidityRequest.create({
    data: {
      reference,
      companyId,
      direction: data.direction as Direction,
      dailyVolumeBand: data.dailyVolumeBand,
      monthlyVolumeBand: data.monthlyVolumeBand,
      banks: data.banks,
      methods: data.methods,
      requiredSpeed: data.requiredSpeed,
      jurisdiction: data.jurisdiction,
      kycReadiness: data.kycReadiness,
      kycNotes: data.kycNotes,
      notes: data.notes,
    },
  });

  await audit({
    action: "request.submitted",
    entityType: "LiquidityRequest",
    entityId: request.id,
    actorId: userId,
    actorLabel: actor,
    requestId: request.id,
    meta: { reference, direction: data.direction },
  });

  if (!loggedInCompany && userId) await createSession(userId);
  redirect(`/request/submitted?ref=${encodeURIComponent(reference)}`);
}

/** Liquidity partner applies to join the network. */
export async function submitPartnerApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (str(formData, "website_hp")) redirect("/apply/submitted?ref=received");

  const session = await getSession();
  if (session?.user.role === "PARTNER") redirect("/partner");

  const input = {
    displayName: str(formData, "displayName"),
    legalName: str(formData, "legalName"),
    contactName: str(formData, "contactName"),
    telegram: str(formData, "telegram"),
    phone: str(formData, "phone"),
    experienceBand: str(formData, "experienceBand"),
    directions: arr(formData, "directions"),
    banks: arr(formData, "banks"),
    methods: arr(formData, "methods"),
    dailyCapacityBand: str(formData, "dailyCapacityBand"),
    workingHours: str(formData, "workingHours"),
    reserveBand: str(formData, "reserveBand"),
    jurisdictions: str(formData, "jurisdictions"),
    complianceFlags: arr(formData, "complianceFlags"),
    complianceNotes: str(formData, "complianceNotes"),
  };

  const parsed = partnerApplicationSchema.safeParse(input);
  const account = accountSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
  });

  if (!parsed.success || !account.success) {
    const fieldErrors = {
      ...(parsed.success ? {} : flattenErrors(parsed.error)),
      ...(account.success ? {} : flattenErrors(account.error)),
    };
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const existing = await db.user.findUnique({ where: { email: account.data.email } });
  if (existing) {
    return {
      error: "An account already exists for this email. Log in to view your application status.",
    };
  }

  const data = parsed.data;
  const passwordHash = await hashPassword(account.data.password);
  const reference = await nextReference("partner");

  const created = await db.user.create({
    data: {
      email: account.data.email,
      passwordHash,
      name: data.contactName,
      role: "PARTNER",
      partner: {
        create: {
          reference,
          displayName: data.displayName,
          legalName: data.legalName,
          contactName: data.contactName,
          telegram: data.telegram,
          phone: data.phone,
          experienceBand: data.experienceBand,
          directions: data.directions as Direction[],
          banks: data.banks,
          methods: data.methods,
          dailyCapacityBand: data.dailyCapacityBand,
          workingHours: data.workingHours,
          reserveBand: data.reserveBand,
          jurisdictions: data.jurisdictions,
          complianceFlags: data.complianceFlags,
          complianceNotes: data.complianceNotes,
        },
      },
    },
    include: { partner: true },
  });

  await audit({
    action: "partner.applied",
    entityType: "PartnerProfile",
    entityId: created.partner!.id,
    actorId: created.id,
    actorLabel: data.displayName,
    partnerId: created.partner!.id,
    meta: { reference },
  });

  await createSession(created.id);
  redirect(`/apply/submitted?ref=${encodeURIComponent(reference)}`);
}
