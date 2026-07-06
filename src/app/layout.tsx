import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "INRP2P — Private INR Liquidity Network",
    template: "%s · INRP2P",
  },
  description:
    "INRP2P helps qualified companies find reviewed INR liquidity partners through manual review, matching and qualified introductions. No custody. No execution. Coordination only.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
