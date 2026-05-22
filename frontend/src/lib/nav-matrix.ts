type MatrixValue = true | false | 'r'

const NAV_MATRIX = {
  Dashboard: { analyst: true, huntLead: true, ti: true, manager: true, admin: true, readonly: 'r' },
  Hypotheses: { analyst: true, huntLead: true, ti: true, manager: true, admin: true, readonly: 'r' },
  HuntBoard: { analyst: true, huntLead: true, ti: 'r', manager: 'r', admin: true, readonly: 'r' },
  Evidence: { analyst: true, huntLead: true, ti: true, manager: 'r', admin: true, readonly: 'r' },
  Attack: { analyst: true, huntLead: true, ti: true, manager: true, admin: true, readonly: 'r' },
  Integrations: { analyst: 'r', huntLead: 'r', ti: true, manager: 'r', admin: true, readonly: false },
  Reports: { analyst: 'r', huntLead: true, ti: true, manager: true, admin: true, readonly: 'r' },
  AuditLog: { analyst: false, huntLead: 'r', ti: false, manager: true, admin: true, readonly: false },
  Admin: { analyst: false, huntLead: false, ti: false, manager: false, admin: true, readonly: false },
} as const

type RoleKey = 'analyst' | 'huntLead' | 'ti' | 'manager' | 'admin' | 'readonly'
type NavKey = keyof typeof NAV_MATRIX

function roleToKey(role: string | null): RoleKey {
  if (!role) return 'readonly'
  switch (role) {
    case 'hunt_lead':
      return 'huntLead'
    case 'ti_analyst':
      return 'ti'
    case 'manager':
      return 'manager'
    case 'admin':
      return 'admin'
    case 'analyst':
      return 'analyst'
    default:
      return 'readonly'
  }
}

export function navVisibility(nav: NavKey, role: string | null): MatrixValue {
  const key = roleToKey(role)
  return NAV_MATRIX[nav][key]
}
