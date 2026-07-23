"use client";

import Link from "next/link";

export function ReceiptActions() {
  return (
    <div className="move-receipt-actions">
      <button type="button" className="move-primary-button" onClick={() => window.print()}>
        Print / save PDF
      </button>
      <Link href="/" className="move-secondary-button">Move again</Link>
    </div>
  );
}
