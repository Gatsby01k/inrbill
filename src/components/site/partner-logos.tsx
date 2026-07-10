/**
 * "Powered by" infrastructure strip — a slow, continuous marquee of partner
 * logo lockups. Reuses the exact CSS-only marquee mechanics as the site's
 * text ticker (marquee-track / animate-marquee in globals.css +
 * tailwind.config.ts — the keyframe is already emitted because that
 * utility class is used literally elsewhere), just rendering logo lockups
 * instead of text. The list repeats a few times before the loop-doubling
 * so two partners still read as a full, moving strip instead of a sparse
 * two-item ping-pong.
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
 * the marquee mechanics stay the same.
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
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
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

// Repeated before the marquee's own loop-doubling so a 2-partner list still
// fills the strip edge to edge instead of looking like two lonely logos.
const MARQUEE_REPEATS = 4;
const SEQUENCE = Array.from({ length: MARQUEE_REPEATS }, () => LOGO_PARTNERS).flat();

export function PartnerLogoMarquee() {
  return (
    <div>
      <p className="mx-auto max-w-6xl px-4 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:px-6">
        Service fees invoiced via
      </p>
      <div
        className="marquee-viewport mt-3 overflow-hidden border-y border-black/[0.06] bg-white/60 py-6 backdrop-blur-sm"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="marquee-track animate-marquee flex w-max items-center gap-16">
          {[...SEQUENCE, ...SEQUENCE].map((p, i) => (
            <a
              key={`${p.name}-${i}`}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-2.5 grayscale opacity-75 transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              {p.icon}
              <span className="text-[17px] font-semibold tracking-tight" style={{ color: p.color }}>
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-6xl px-4 text-center text-[10.5px] leading-relaxed text-slate-400 sm:px-6">
        Never the deal itself — that settles directly, partner to partner.
      </p>
    </div>
  );
}
