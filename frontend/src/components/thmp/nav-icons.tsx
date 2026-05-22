type IconProps = { className?: string }

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="10" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="8" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function BoardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6.25" y="2" width="3.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10.5" y="2" width="3.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function ReportIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6 H11 M5 8.5 H11 M5 11 H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
