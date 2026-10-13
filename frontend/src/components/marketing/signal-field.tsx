/** Original vector signal paths; decorative, resolution independent, no downloads. */
export function SignalField() {
  return (
    <div className="signal-field" aria-hidden="true">
      <div className="signal-wash" />
      <div className="signal-grid" />
      <svg
        className="signal-ribbons"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient
            id="signal-spectrum"
            x1="250"
            y1="800"
            x2="1200"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#7164ff" />
            <stop offset=".4" stopColor="#f684dc" />
            <stop offset=".72" stopColor="#ff9787" />
            <stop offset="1" stopColor="#ffd38a" />
          </linearGradient>
        </defs>
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={`M ${410 + i * 19} 1000 C ${250 + i * 17} 650, ${1230 + i * 12} 730, ${1010 + i * 20} 360 S ${1080 + i * 12} -40, 1600 ${-170 + i * 23}`}
            stroke="url(#signal-spectrum)"
            strokeWidth={i % 4 === 0 ? 2 : 1}
            opacity={0.2 + (i % 4) * 0.12}
          />
        ))}
      </svg>
      <div className="signal-coordinate coordinate-top">SIGNAL / 001</div>
      <div className="signal-coordinate coordinate-bottom">
        INTELLIGENCE, WITH DIRECTION.
      </div>
    </div>
  );
}
