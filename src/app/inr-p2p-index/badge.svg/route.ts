import type { NextRequest } from "next/server";
import { getLiquidityIndexSnapshot } from "@/lib/liquidity-index";

// Dynamic, embeddable status badge — shields.io-style. Pure SVG, system fonts
// only (no @font-face dependency, since it renders on whatever site embeds
// it), served with cache headers instead of ISR since it's a plain GET route
// reading a query param, not a page segment.

const NAVY = "#050A1F";
const GOLD = "#DD8114";
const LEAF = "#178A38";
const NEUTRAL = "#8A8A8A";

function textWidth(s: string) {
  // Rough average glyph width for Verdana/DejaVu Sans at 11px — good enough
  // for a decorative badge, not a typesetting-precision requirement.
  return Math.round(s.length * 6.6) + 10;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  const stat = req.nextUrl.searchParams.get("stat") ?? "corridors";
  const snap = await getLiquidityIndexSnapshot();

  const label = "INR P2P Index";
  let value: string;
  let valueColor: string;

  if (stat === "banks") {
    value = `${snap.banksCovered}/${snap.banksTotal} banks`;
    valueColor = snap.banksCovered === 0 ? NEUTRAL : snap.banksCovered === snap.banksTotal ? LEAF : GOLD;
  } else if (stat === "partners") {
    value = `${snap.total} verified`;
    valueColor = snap.total === 0 ? NEUTRAL : GOLD;
  } else {
    value = `${snap.corridorsCovered}/${snap.corridorsTotal} corridors`;
    valueColor =
      snap.corridorsCovered === 0 ? NEUTRAL : snap.corridorsCovered === snap.corridorsTotal ? LEAF : GOLD;
  }

  const labelW = textWidth(label);
  const valueW = textWidth(value);
  const totalW = labelW + valueW;
  const ariaText = `${label}: ${value}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${escapeXml(ariaText)}">
<title>${escapeXml(ariaText)}</title>
<linearGradient id="s" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${labelW}" height="20" fill="${NAVY}"/>
<rect x="${labelW}" width="${valueW}" height="20" fill="${valueColor}"/>
<rect width="${totalW}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${labelW / 2}" y="14">${escapeXml(label)}</text>
<text x="${labelW + valueW / 2}" y="14">${escapeXml(value)}</text>
</g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
