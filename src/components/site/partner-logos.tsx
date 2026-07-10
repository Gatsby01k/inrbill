/**
 * "Powered by" infrastructure strip — hand-built wordmark lockups, not a
 * scrolling marquee. With two partners today, looping them forever reads as
 * padding, not partnership; a quiet, static row reads as the real thing.
 * Grayscale at rest, brand color on hover — the standard understated
 * "as-integrated-with" treatment.
 *
 * This is INRP2P's own service-fee invoicing infrastructure (see
 * src/lib/razorpay.ts, src/lib/nowpayments.ts) — never the liquidity deal
 * itself, which always settles directly between company and partner.
 *
 * Add a new integration by appending to LOGO_PARTNERS below.
 *
 * These marks are original, hand-drawn lockups in each brand's public
 * color — not extracted copies of the official vector logo files. This
 * sandbox has no way to download binary brand assets. If you export the
 * real SVGs from razorpay.com/newsroom/brand-assets and NOWPayments' press
 * kit, drop them at public/logos/razorpay.svg and public/logos/nowpayments.svg
 * and swap the relevant `icon` below for an <img src="/logos/…svg" /> —
 * the grid, hover treatment and caption all stay the same.
 */

type LogoPartner = {
  name: string;
  href: string;
  color: string;
  icon: React.ReactNode;
};

const LOGO_PARTNERS: LogoPartner[] = [
  {
    name: "Razorpay",
    href: "https://razorpay.com",
    color: "#0C2451",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 1 L23 7 V17 L12 23 L1 17 V7 Z" fill="#3395FF" opacity="0.14" />
        <path d="M7.5 17 L13 6 H16.6 L11.1 17 Z" fill="#0C2451" />
        <path d="M12.7 11.4 L15.8 11.4 L12.5 17 H9.4 Z" fill="#3395FF" />
      </svg>
    ),
  },
  {
    name: "NOWPayments",
    href: "https://nowpayments.io",
    color: "#00966A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="#00C58A" opacity="0.16" />
        <path
          d="M6.5 14.5 L9.3 8 L12 13.2 L14.7 8 L17.5 14.5"
          stroke="#00966A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
];

export function PartnerLogos() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col items-center justify-center gap-4 border-y border-black/[0.06] py-6 sm:flex-row sm:gap-10">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Service fees invoiced via
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {LOGO_PARTNERS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 grayscale opacity-80 transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              {p.icon}
              <span className="text-[15px] font-semibold tracking-tight" style={{ color: p.color }}>
                {p.name}
              </span>
            </a>
          ))}
        </div>
        <p className="max-w-[15rem] text-center text-[10.5px] leading-relaxed text-slate-400 sm:text-left">
          Never the deal itself — that settles directly, partner to partner.
        </p>
      </div>
    </div>
  );
}
