import type { Metadata } from "next";
import { FormShell } from "@/components/site/form-shell";
import { RequestForm } from "@/components/forms/request-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request a liquidity partner",
};

export default async function RequestPage() {
  const session = await getSession();
  const loggedInCompany =
    session?.user.role === "COMPANY" ? session.user.company?.companyName : undefined;

  return (
    <FormShell
      eyebrow="Company request"
      title="Request an INR liquidity partner."
      sub="Tell us exactly what you need. Every request is reviewed manually within 24–48 hours; if the network has a reviewed partner that fits, we shortlist and introduce. INRP2P never touches funds — introductions only."
    >
      <RequestForm loggedInCompany={loggedInCompany} />
    </FormShell>
  );
}
