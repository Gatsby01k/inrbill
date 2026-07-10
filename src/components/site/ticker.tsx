/**
 * Infinite horizontal marquee — pure CSS (the .marquee-track/.marquee-viewport
 * classes + animate-marquee keyframe in globals.css/tailwind.config.ts), no
 * client JS needed at all. The track renders `items` twice back to back and
 * animates translateX(-50%) on a loop, so as the first copy scrolls fully
 * off-screen the second is in exactly the position the first started —
 * a seamless loop as long as both copies are identical width, which they
 * are by construction. Hover pauses via a plain CSS :hover rule.
 */
export function Ticker({ items }: { items: string[] }) {
  return (
    <div
      className="marquee-viewport overflow-hidden border-y border-black/[0.06] bg-white/60 py-3 backdrop-blur-sm"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div className="marquee-track animate-marquee flex w-max items-center gap-8">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[12px] font-medium text-slate-500"
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-gold-500/70" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
