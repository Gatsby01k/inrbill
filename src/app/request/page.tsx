import type { Metadata } from "next";
import { FormShell } from "@/components/site/form-shell";
import { RequestForm } from "@/components/forms/request-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request an INR liquidity partner",
  description:
    "Submit your INR liquidity requirement — direction, daily and monthly volume, banks, rails, speed and jurisdiction. Reviewed manually within 24–48 hours. Introductions only, never custody.",
  alternates: { canonical: "/request" },
};

export default async function RequestPage() {
  const session = await getSession();
  const loggedInCompany =
    session?.user.role === "COMPANY" ? session.user.company?.companyName : undefined;

  return (
    <FormShell
      wide
      eyebrow="Company request"
      title="Request an INR liquidity partner."
      sub="Four short steps, about three minutes. A person reviews every request within 24–48 hours and, if the network has a verified partner that fits, introduces you directly."
    >
      <RequestForm loggedInCompany={loggedInCompany} />
    </FormShell>
  );
}
