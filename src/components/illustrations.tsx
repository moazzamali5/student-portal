// Hand-built inline SVGs (no external image requests) so the marketing-ish
// surfaces (auth pages, empty states) don't feel like a bare admin tool.
export function StudyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 320"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="180" cy="160" r="150" fill="url(#study-bg)" opacity="0.15" />
      <defs>
        <linearGradient id="study-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="study-book" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="study-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* desk */}
      <rect x="40" y="230" width="280" height="14" rx="7" fill="#e2e8f0" />

      {/* laptop */}
      <rect x="120" y="150" width="120" height="80" rx="8" fill="url(#study-screen)" />
      <rect x="132" y="162" width="96" height="56" rx="4" fill="#ffffff" fillOpacity="0.85" />
      <path d="M100 230h160l14 14H86l14-14Z" fill="#ddd6fe" />
      <rect x="150" y="178" width="60" height="8" rx="4" fill="#c4b5fd" />
      <rect x="150" y="194" width="40" height="8" rx="4" fill="#c4b5fd" />

      {/* book stack */}
      <rect x="40" y="196" width="80" height="16" rx="4" fill="url(#study-book)" />
      <rect x="48" y="180" width="64" height="16" rx="4" fill="#a5b4fc" />
      <rect x="40" y="164" width="80" height="16" rx="4" fill="url(#study-book)" />

      {/* graduation cap */}
      <g transform="translate(250,50)">
        <path d="M30 0 60 14 30 28 0 14 30 0Z" fill="#6366f1" />
        <path d="M12 20v14c0 5 8 9 18 9s18-4 18-9V20l-18 8-18-8Z" fill="#4f46e5" />
        <circle cx="58" cy="16" r="3" fill="#4f46e5" />
        <path d="M58 16v14" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* floating dots */}
      <circle cx="70" cy="70" r="6" fill="#a855f7" opacity="0.6" />
      <circle cx="300" cy="150" r="5" fill="#6366f1" opacity="0.5" />
      <circle cx="55" cy="130" r="4" fill="#818cf8" opacity="0.5" />
    </svg>
  );
}
