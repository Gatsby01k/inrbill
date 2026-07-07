import type { Metadata } from "next";
import { FormShell } from "@/components/site/form-shell";
import { ApplyForm } from "@/components/forms/apply-form";

export const metadata: Metadata = {
  title: "Apply as an INR liquidity partner",
  description:
    "Join a private network that routes screened corporate demand to reviewed INR liquidity partners. Declare your corridors, capacity, banks and reserve — verification is manual and identity stays private until introduction.",
  alternates: { canonical: "/apply" },
};

export default function ApplyPage() {
  return (
    <FormShell
      eyebrow="Partner application"
      title="Apply to join the network."
      sub="INRP2P routes qualified corporate demand to reviewed liquidity partners. Declare your real coverage and capacity — verification is manual, and only verified partners receive introductions."
    >
      <ApplyForm />
    </FormShell>
  );
}
