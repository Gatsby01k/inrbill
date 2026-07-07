import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * INRP2P brand mark — the network rupee.
 * Central ₹ node, three spokes, segmented outer ring.
 * Faithful vector of the brand logo; gradient is the brand amber.
 */
export function BrandMark({
  size = 28,
  className,
  title = "INRP2P",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="inr-brand-g" x1="20" y1="2" x2="44" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6B03D" />
          <stop offset="1" stopColor="#E8790F" />
        </linearGradient>
      </defs>
      {/* segmented outer ring */}
      <g stroke="url(#inr-brand-g)" strokeWidth="3.6" strokeLinecap="round">
        <path d="M 50.69 50.07 A 26 26 0 0 1 13.31 50.07" />
        <path d="M 7.01 39.18 A 26 26 0 0 1 25.71 6.78" />
        <path d="M 38.29 6.78 A 26 26 0 0 1 56.99 39.18" />
      </g>
      {/* spokes */}
      <g stroke="url(#inr-brand-g)" strokeWidth="3.6" strokeLinecap="round">
        <path d="M 32 19.5 L 32 11" />
        <path d="M 21.4 38.1 L 13.9 42.5" />
        <path d="M 42.6 38.1 L 50.1 42.5" />
      </g>
      {/* outer nodes */}
      <g fill="url(#inr-brand-g)">
        <circle cx="32" cy="6.5" r="4.6" />
        <circle cx="9.6" cy="45" r="4.6" />
        <circle cx="54.4" cy="45" r="4.6" />
      </g>
      {/* central node */}
      <circle cx="32" cy="32" r="12.8" fill="url(#inr-brand-g)" />
      {/* rupee cutout */}
      <text
        x="32"
        y="38.6"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="18"
        fill="#070C16"
      >
        ₹
      </text>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[15px] font-semibold tracking-[-0.01em] text-slate-100",
        className,
      )}
    >
      INR<span className="text-gold-400">P2P</span>
    </span>
  );
}

export function BrandLockup({
  href = "/",
  markSize = 27,
  compact = false,
}: {
  href?: string;
  markSize?: number;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <BrandMark size={markSize} />
      {!compact && <Wordmark />}
    </Link>
  );
}
