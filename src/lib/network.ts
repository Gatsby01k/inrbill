import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCompanyOrganization(user: SessionUser) {
  if (!user.company) throw new Error("Company profile not found.");
  return db.organization.upsert({
    where: { companyProfileId: user.company.id },
    update: { name: user.company.companyName },
    create: { companyProfileId: user.company.id, name: user.company.companyName },
  });
}
