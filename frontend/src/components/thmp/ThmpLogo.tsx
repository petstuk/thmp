export function ThmpLogo({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18 L12 4 L20 18 Z"
        stroke="var(--primary)"
        strokeWidth="1.6"
        fill="color-mix(in oklab, var(--primary) 14%, transparent)"
      />
      <circle cx="12" cy="14" r="1.6" fill="var(--primary)" />
    </svg>
  )
}
