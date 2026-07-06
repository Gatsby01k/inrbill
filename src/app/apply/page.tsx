import type { Metadata } from "next";
import { FormShell } from "@/components/site/form-shell";
import { ApplyForm } from "@/components/forms/apply-form";

export const metadata: Metadata = {
  title: "Apply as a liquidity partner",
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
