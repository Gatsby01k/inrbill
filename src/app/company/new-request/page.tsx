import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/forms/request-form";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "New request" };

export default async function CompanyNewRequestPage() {
  const user = await requireRole("COMPANY");
  if (!user.company) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Submit a new liquidity request"
        sub={`Submitting on behalf of ${user.company.companyName}. Your company profile is attached automatically.`}
      />
      <RequestForm loggedInCompany={user.company.companyName} />
    </div>
  );
}
