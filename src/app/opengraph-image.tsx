import { ImageResponse } from "next/og";

export const alt = "INRP2P — Private INR Liquidity Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#070C16",
          backgroundImage:
            "radial-gradient(800px 400px at 85% -10%, rgba(238,161,47,0.22), transparent 65%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 64 64" fill="none">
            <g stroke="#E8880F" strokeWidth="3.6" strokeLinecap="round">
              <path d="M 50.69 50.07 A 26 26 0 0 1 13.31 50.07" />
              <path d="M 7.01 39.18 A 26 26 0 0 1 25.71 6.78" />
              <path d="M 38.29 6.78 A 26 26 0 0 1 56.99 39.18" />
              <path d="M 32 19.5 L 32 11" />
              <path d="M 21.4 38.1 L 13.9 42.5" />
              <path d="M 42.6 38.1 L 50.1 42.5" />
            </g>
            <g fill="#E8880F">
              <circle cx="32" cy="6.5" r="4.6" />
              <circle cx="9.6" cy="45" r="4.6" />
              <circle cx="54.4" cy="45" r="4.6" />
              <circle cx="32" cy="32" r="12.8" />
            </g>
            {/* inner ring detail instead of a text glyph — satori does not support <text> */}
            <circle cx="32" cy="32" r="6.5" fill="none" stroke="#070C16" strokeWidth="3" />
          </svg>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#F8FAFC" }}>
            INR
            <span style={{ color: "#DD8114" }}>P2P</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#F8FAFC",
            maxWidth: 900,
          }}
        >
          Reviewed INR liquidity partners. Qualified introductions.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#94A3B8", maxWidth: 860 }}>
          INR → USDT · USDT → INR · INR payouts. Manual review. No custody, ever.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            background: "linear-gradient(90deg, #F6B03D, #E8790F)",
          }}
        />
      </div>
    ),
    size,
  );
}
