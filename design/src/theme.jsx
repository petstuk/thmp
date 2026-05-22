// theme.jsx — design tokens + a single source of truth for color/type
// across both dark (primary) and light themes.

const THEME = {
  dark: {
    name: 'Dark',
    // Surfaces — cool charcoal, no saturation drift
    bg0: '#0A0C10',       // page
    bg1: '#10131A',       // panel / sidebar
    bg2: '#161A23',       // card
    bg3: '#1D2230',       // raised / hover
    bg4: '#262C3B',       // selected / focus
    // Lines
    line0: '#1B2030',
    line1: '#262C3B',
    line2: '#384055',
    // Text
    text0: '#F2F4F8',     // primary
    text1: '#C5CAD3',     // body
    text2: '#8A93A3',     // secondary
    text3: '#5C6577',     // tertiary / disabled
    // Accent — restrained desaturated cyan-blue
    accent: '#7AB7FF',
    accentDim: 'rgba(122,183,255,0.12)',
    accentLine: 'rgba(122,183,255,0.32)',
    // Semantic (severity)
    sevCritical: '#FF5C6A',
    sevHigh:     '#FF9D4A',
    sevMedium:   '#F2C94C',
    sevLow:      '#6FB7FF',
    sevInfo:     '#8E96A6',
    sevCriticalBg: 'rgba(255,92,106,0.10)',
    sevHighBg:     'rgba(255,157,74,0.10)',
    sevMediumBg:   'rgba(242,201,76,0.10)',
    sevLowBg:      'rgba(111,183,255,0.10)',
    sevInfoBg:     'rgba(142,150,166,0.10)',
    // Status
    stDraft:     '#8E96A6',
    stActive:    '#6FB7FF',
    stInHunt:    '#B68CFF',
    stValidated: '#5EC79A',
    stClosed:    '#6B7280',
    stArchived:  '#4A5160',
    // Coverage (heatmap)
    cov0: '#161A23',
    cov1: 'rgba(122,183,255,0.18)',
    cov2: 'rgba(122,183,255,0.35)',
    cov3: 'rgba(122,183,255,0.55)',
    cov4: 'rgba(122,183,255,0.78)',
    gap:  'rgba(255,92,106,0.16)',
  },
  light: {
    name: 'Light',
    bg0: '#FAFAFB',
    bg1: '#FFFFFF',
    bg2: '#F4F5F8',
    bg3: '#ECEEF2',
    bg4: '#E3E7EE',
    line0: '#EEF0F4',
    line1: '#E1E4EA',
    line2: '#C8CDD6',
    text0: '#0E1117',
    text1: '#2A2F39',
    text2: '#5C6577',
    text3: '#8A93A3',
    accent: '#2768D8',
    accentDim: 'rgba(39,104,216,0.08)',
    accentLine: 'rgba(39,104,216,0.32)',
    sevCritical: '#D6243A',
    sevHigh:     '#C9601A',
    sevMedium:   '#A77A0A',
    sevLow:      '#2768D8',
    sevInfo:     '#5C6577',
    sevCriticalBg: 'rgba(214,36,58,0.10)',
    sevHighBg:     'rgba(201,96,26,0.10)',
    sevMediumBg:   'rgba(167,122,10,0.12)',
    sevLowBg:     'rgba(39,104,216,0.10)',
    sevInfoBg:    'rgba(92,101,119,0.10)',
    stDraft:     '#5C6577',
    stActive:    '#2768D8',
    stInHunt:    '#7140C9',
    stValidated: '#1E8C5C',
    stClosed:    '#6B7280',
    stArchived:  '#9AA2B0',
    cov0: '#F4F5F8',
    cov1: 'rgba(39,104,216,0.10)',
    cov2: 'rgba(39,104,216,0.22)',
    cov3: 'rgba(39,104,216,0.40)',
    cov4: 'rgba(39,104,216,0.70)',
    gap:  'rgba(214,36,58,0.12)',
  },
};

const FONT = {
  sans: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace',
};

const SEV = ['critical', 'high', 'medium', 'low', 'info'];
const STATUS = ['draft', 'active', 'in-hunt', 'validated', 'closed', 'archived'];

// Roles
const ROLES = {
  analyst:   { label: 'SOC Analyst',         short: 'Analyst',  color: '#7AB7FF' },
  huntLead:  { label: 'Hunt Lead',           short: 'Hunt Lead', color: '#B68CFF' },
  ti:        { label: 'Threat Intel Analyst', short: 'TI',       color: '#5EC79A' },
  manager:   { label: 'Manager',             short: 'Manager',  color: '#F2C94C' },
  admin:     { label: 'Admin',               short: 'Admin',    color: '#FF9D4A' },
  readonly:  { label: 'Read-only',           short: 'Read',     color: '#8E96A6' },
};

// Role × Nav visibility matrix. true=full, 'r'=read-only, false=hidden
const NAV_MATRIX = {
  Dashboard:        { analyst: true, huntLead: true, ti: true,  manager: true,  admin: true,  readonly: 'r' },
  Hypotheses:       { analyst: true, huntLead: true, ti: true,  manager: true,  admin: true,  readonly: 'r' },
  'Hunt Board':     { analyst: true, huntLead: true, ti: 'r',   manager: 'r',   admin: true,  readonly: 'r' },
  Evidence:         { analyst: true, huntLead: true, ti: true,  manager: 'r',   admin: true,  readonly: 'r' },
  'ATT&CK':         { analyst: true, huntLead: true, ti: true,  manager: true,  admin: true,  readonly: 'r' },
  Integrations:     { analyst: 'r',  huntLead: 'r',  ti: true,  manager: 'r',   admin: true,  readonly: false },
  Reports:          { analyst: 'r',  huntLead: true, ti: true,  manager: true,  admin: true,  readonly: 'r' },
  'Audit Log':      { analyst: false, huntLead: 'r', ti: false, manager: true,  admin: true,  readonly: false },
  Admin:            { analyst: false, huntLead: false, ti: false, manager: false, admin: true, readonly: false },
};

// Sample data — realistic ATT&CK refs with invented campaign names
const TECHNIQUES = [
  { id: 'T1059.001', name: 'PowerShell',                 tactic: 'Execution' },
  { id: 'T1566.001', name: 'Spearphishing Attachment',   tactic: 'Initial Access' },
  { id: 'T1566.002', name: 'Spearphishing Link',         tactic: 'Initial Access' },
  { id: 'T1078',     name: 'Valid Accounts',             tactic: 'Persistence' },
  { id: 'T1078.004', name: 'Cloud Accounts',             tactic: 'Persistence' },
  { id: 'T1110.003', name: 'Password Spraying',          tactic: 'Credential Access' },
  { id: 'T1486',     name: 'Data Encrypted for Impact',  tactic: 'Impact' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol',    tactic: 'Lateral Movement' },
  { id: 'T1021.002', name: 'SMB/Windows Admin Shares',   tactic: 'Lateral Movement' },
  { id: 'T1041',     name: 'Exfiltration Over C2',       tactic: 'Exfiltration' },
  { id: 'T1567.002', name: 'Exfil to Cloud Storage',     tactic: 'Exfiltration' },
  { id: 'T1003.001', name: 'LSASS Memory',               tactic: 'Credential Access' },
  { id: 'T1543.003', name: 'Windows Service',            tactic: 'Persistence' },
  { id: 'T1055',     name: 'Process Injection',          tactic: 'Defense Evasion' },
  { id: 'T1027',     name: 'Obfuscated Files',           tactic: 'Defense Evasion' },
];

const HYPOTHESES = [
  { id: 'H-2087', title: 'Spearphishing campaign delivering DragonGate loader to finance staff', sev: 'critical', status: 'in-hunt', owner: 'kowalski',  techCount: 5, evCount: 12, source: 'Mandiant feed',  updated: '12m ago', tactic: 'Initial Access' },
  { id: 'H-2086', title: 'Password spraying against legacy VPN gateway from rotating ASN',        sev: 'high',     status: 'active',  owner: 'reyes',     techCount: 3, evCount: 7,  source: 'Manual',         updated: '34m ago', tactic: 'Credential Access' },
  { id: 'H-2085', title: 'Anomalous RDP from VDI subnet to domain controllers off-hours',         sev: 'high',     status: 'in-hunt', owner: 'kowalski',  techCount: 4, evCount: 9,  source: 'Splunk alert',   updated: '1h ago',  tactic: 'Lateral Movement' },
  { id: 'H-2084', title: 'Suspected exfil via residential proxy to consumer cloud storage',       sev: 'medium',   status: 'validated', owner: 'tanaka',  techCount: 6, evCount: 14, source: 'CrowdStrike',    updated: '2h ago',  tactic: 'Exfiltration' },
  { id: 'H-2083', title: 'PowerShell child of WINWORD with base64 payload, single host',          sev: 'medium',   status: 'active',  owner: 'reyes',     techCount: 2, evCount: 4,  source: 'EDR',            updated: '3h ago',  tactic: 'Execution' },
  { id: 'H-2082', title: 'Cloud admin token reuse from new geography for SaaS tenant',            sev: 'high',     status: 'active',  owner: 'lin',       techCount: 3, evCount: 5,  source: 'Okta logs',      updated: '4h ago',  tactic: 'Persistence' },
  { id: 'H-2081', title: 'Service binary replaced on hardened jumphost — possible persistence',   sev: 'critical', status: 'active',  owner: '—',         techCount: 4, evCount: 3,  source: 'EDR',            updated: '5h ago',  tactic: 'Persistence' },
  { id: 'H-2080', title: 'Mass MFA push fatigue against engineering OU',                          sev: 'low',      status: 'draft',   owner: 'tanaka',    techCount: 1, evCount: 1,  source: 'Manual',         updated: '6h ago',  tactic: 'Credential Access' },
  { id: 'H-2079', title: 'Possible LSASS dumping via comsvcs.dll on finance workstation',         sev: 'high',     status: 'in-hunt', owner: 'lin',       techCount: 3, evCount: 8,  source: 'EDR',            updated: '8h ago',  tactic: 'Credential Access' },
  { id: 'H-2078', title: 'Outbound C2 beaconing on uncommon port to known TI indicator',          sev: 'critical', status: 'in-hunt', owner: 'kowalski',  techCount: 5, evCount: 11, source: 'Suricata',       updated: '1d ago',  tactic: 'Command & Control' },
];

Object.assign(window, { THEME, FONT, SEV, STATUS, ROLES, NAV_MATRIX, TECHNIQUES, HYPOTHESES });
