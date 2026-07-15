import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactorForm } from "@/components/forms/two-factor-form";
import { AuthFrame } from "@/components/site/auth-frame";
import { getSession, getTwoFactorChallenge, roleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Verify",
  robots: { index: false, follow: false },
};

export default async function TwoFactorVerifyPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.user.role));

  const challenge = await getTwoFactorChallenge();
  if (!challenge) redirect("/login");

  return (
    <AuthFrame eyebrow="Second factor" title="Verify it’s you." sub="Enter the 6-digit code from your authenticator app."><TwoFactorForm /></AuthFrame>
  );
}
