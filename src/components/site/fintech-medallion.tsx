export function FintechMedallion() {
  return (
    <div className="fin-medallion-scene" aria-label="INRP2P network medallion">
      <svg viewBox="0 0 720 720" fill="none" aria-hidden="true" className="fin-medallion-svg">
        <defs>
          <linearGradient id="metal" x1="150" y1="110" x2="570" y2="610" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fffdf7" />
            <stop offset=".28" stopColor="#dcd3c7" />
            <stop offset=".48" stopColor="#fffefb" />
            <stop offset=".72" stopColor="#c9bcae" />
            <stop offset="1" stopColor="#fff8ec" />
          </linearGradient>
          <linearGradient id="gold" x1="190" y1="140" x2="540" y2="590" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffd674" />
            <stop offset=".28" stopColor="#f5a112" />
            <stop offset=".62" stopColor="#c86602" />
            <stop offset="1" stopColor="#ffbc3f" />
          </linearGradient>
          <linearGradient id="goldEdge" x1="230" y1="170" x2="480" y2="560" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff1ba" />
            <stop offset=".42" stopColor="#ed8b08" />
            <stop offset="1" stopColor="#8f3c00" />
          </linearGradient>
          <radialGradient id="porcelain" cx="0" cy="0" r="1" gradientTransform="translate(313 270) rotate(55) scale(260)">
            <stop stopColor="#ffffff" />
            <stop offset=".72" stopColor="#f7eee2" />
            <stop offset="1" stopColor="#d9c9b9" />
          </radialGradient>
          <filter id="shadow" x="40" y="38" width="650" height="665" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="34" stdDeviation="25" floodColor="#6f3f08" floodOpacity=".28" />
          </filter>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g opacity=".34">
          <circle cx="360" cy="352" r="314" stroke="#d9911d" strokeWidth="1" />
          <circle cx="360" cy="352" r="275" stroke="#d9911d" strokeWidth="1" strokeDasharray="2 12" />
          <path d="M74 231c93-141 290-220 455-124 85 49 130 128 151 209" stroke="#d9911d" strokeWidth="1.5" />
          <circle cx="75" cy="231" r="5" fill="#f2a21d" filter="url(#glow)" />
          <circle cx="679" cy="316" r="5" fill="#f2a21d" filter="url(#glow)" />
        </g>

        <g filter="url(#shadow)" transform="rotate(-8 360 360)">
          <ellipse cx="360" cy="636" rx="215" ry="34" fill="#a05a0b" opacity=".13" />
          <circle cx="360" cy="360" r="238" fill="url(#metal)" stroke="url(#goldEdge)" strokeWidth="8" />
          <circle cx="360" cy="360" r="218" stroke="#fff" strokeOpacity=".9" strokeWidth="11" />
          <circle cx="360" cy="360" r="204" stroke="url(#gold)" strokeWidth="17" strokeDasharray="44 17 75 13" />
          <circle cx="360" cy="360" r="181" fill="#081731" stroke="#142846" strokeWidth="8" />
          <circle cx="360" cy="360" r="163" fill="url(#porcelain)" stroke="url(#gold)" strokeWidth="9" />
          <circle cx="360" cy="360" r="128" fill="#fffaf1" stroke="#e5d6c4" strokeWidth="2" />

          <g stroke="url(#gold)" strokeWidth="22" strokeLinecap="round">
            <path d="M360 232v44" />
            <path d="m249 424 39-22" />
            <path d="m471 424-39-22" />
          </g>
          <g fill="url(#metal)" stroke="url(#goldEdge)" strokeWidth="7">
            <circle cx="360" cy="211" r="30" />
            <circle cx="224" cy="438" r="30" />
            <circle cx="496" cy="438" r="30" />
          </g>
          <g fill="#fff" stroke="#d4c8b9" strokeWidth="3">
            <circle cx="360" cy="211" r="15" />
            <circle cx="224" cy="438" r="15" />
            <circle cx="496" cy="438" r="15" />
          </g>

          <g stroke="url(#gold)" strokeWidth="13" strokeLinecap="round">
            <path d="M360 286v35" />
            <path d="m296 397 31-18" />
            <path d="m424 397-31-18" />
            <path d="M300 327a70 70 0 0 1 120 0" />
            <path d="M301 397a70 70 0 0 0 118 0" />
          </g>
          <circle cx="360" cy="360" r="45" fill="url(#gold)" />
          <text x="360" y="378" textAnchor="middle" fill="#fffaf1" fontFamily="Georgia, serif" fontWeight="700" fontSize="50">₹</text>
          <circle cx="360" cy="288" r="11" fill="#ef9411" />
          <circle cx="297" cy="402" r="11" fill="#ef9411" />
          <circle cx="423" cy="402" r="11" fill="#ef9411" />

          <path d="M218 270a174 174 0 0 1 125-80" stroke="#fff" strokeOpacity=".75" strokeWidth="7" strokeLinecap="round" />
          <path d="M478 494a174 174 0 0 1-88 37" stroke="#7c3e00" strokeOpacity=".24" strokeWidth="8" strokeLinecap="round" />
        </g>
      </svg>

      <div className="fin-hud fin-hud-one"><span className="fin-hud-check">✓</span><div><small>Trust status</small><strong>Human reviewed</strong></div></div>
      <div className="fin-hud fin-hud-two"><span className="fin-hud-live" /><div><small>Capacity pulse</small><strong>Live · 06h 42m</strong></div></div>
    </div>
  );
}
