import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms/password-reset-form";
import { AuthFrame } from "@/components/site/auth-frame";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <AuthFrame eyebrow="Account recovery" title="Reset password." sub="We send a short-lived, single-use link without revealing whether an account exists."><ForgotPasswordForm /></AuthFrame>;
}
