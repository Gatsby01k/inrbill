import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/forms/password-reset-form";
import { AuthFrame } from "@/components/site/auth-frame";

export const metadata: Metadata = { title: "Choose new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthFrame eyebrow="Secure credentials" title="Choose a new password." sub="The link is single-use. A successful reset signs out every active device."><ResetPasswordForm token={token} /></AuthFrame>;
}
