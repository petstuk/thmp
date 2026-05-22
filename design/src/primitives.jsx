// primitives.jsx — shared UI building blocks used across all artboards.
// Theme-aware via a React context that App provides.

const ThemeCtx = React.createContext({ t: window.THEME.dark, mode: 'dark', role: 'analyst' });
const useTheme = () => React.useContext(ThemeCtx);

// ─────────────────────────────────────────────────────────────────────
// AppFrame — the chrome around every "in-product" artboard.
// Renders: a thin global topbar, left nav with active state, and a body
// area for the screen contents. Used by all wireframes + hi-fi screens.
// ─────────────────────────────────────────────────────────────────────
function AppFrame({ active, children, density = 'regular', subnav = null, breadcrumbs = null, search = true, hideNav = false }) {
  const { t, role } = useTheme();
  const navItems = [
    { key: 'Dashboard',    icon: NavIcon.dash },
    { key: 'Hypotheses',   icon: NavIcon.hyp },
    { key: 'Hunt Board',   icon: NavIcon.kanban },
    { key: 'Evidence',     icon: NavIcon.evidence },
    { key: 'ATT&CK',       icon: NavIcon.attack },
    { key: 'Integrations', icon: NavIcon.plug },
    { key: 'Reports',      icon: NavIcon.report },
    { key: 'Audit Log',    icon: NavIcon.audit },
    { key: 'Admin',        icon: NavIcon.admin },
  ];
  const roleNav = (k) => window.NAV_MATRIX[k]?.[role];
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: t.bg0, color: t.text1, fontFamily: window.FONT.sans, fontSize: 13,
    }}>
      {!hideNav && (
        <aside style={{
          width: 200, flex: '0 0 200px', background: t.bg1, borderRight: `1px solid ${t.line0}`,
          display: 'flex', flexDirection: 'column', padding: '14px 8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 16px' }}>
            <Logo />
            <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em', color: t.text0 }}>THMP</div>
            <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: window.FONT.mono, color: t.text3, padding: '2px 6px', border: `1px solid ${t.line1}`, borderRadius: 4 }}>v2.4</div>
          </div>
          {/* Workspace switcher */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px',
            background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 6, color: t.text0,
            fontSize: 12, fontFamily: 'inherit', cursor: 'default', marginBottom: 14, textAlign: 'left',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: t.accent }} />
            <span style={{ flex: 1 }}>Falcon Workspace</span>
            <span style={{ color: t.text3 }}>⌄</span>
          </button>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {navItems.map((n) => {
              const vis = roleNav(n.key);
              if (vis === false) return null;
              const isActive = active === n.key;
              return (
                <div key={n.key} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 6,
                  fontSize: 12.5, fontWeight: isActive ? 500 : 400,
                  background: isActive ? t.bg3 : 'transparent',
                  color: isActive ? t.text0 : t.text1,
                  cursor: 'default',
                }}>
                  <span style={{ color: isActive ? t.accent : t.text2, display: 'flex' }}>{n.icon(14)}</span>
                  <span style={{ flex: 1 }}>{n.key}</span>
                  {vis === 'r' && (
                    <span title="read-only" style={{ fontSize: 9, fontFamily: window.FONT.mono, color: t.text3 }}>RO</span>
                  )}
                </div>
              );
            })}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 1, background: t.line0, margin: '6px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 12 }}>
              <Avatar initials="KO" />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: t.text0, lineHeight: 1.2 }}>K. Kowalski</div>
                <div style={{ color: t.text3, fontSize: 11, lineHeight: 1.2 }}>{window.ROLES[role].label}</div>
              </div>
            </div>
          </div>
        </aside>
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!hideNav && (
          <header style={{
            height: 44, flex: '0 0 44px', borderBottom: `1px solid ${t.line0}`, background: t.bg0,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          }}>
            {breadcrumbs}
            {!breadcrumbs && <div style={{ color: t.text2, fontSize: 12 }}>{active}</div>}
            {search && (
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
                background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 6,
                padding: '5px 10px', minWidth: 280, color: t.text3, fontSize: 12,
              }}>
                <SearchGlyph />
                <span>Search hypotheses, evidence, techniques…</span>
                <span style={{ marginLeft: 'auto', fontFamily: window.FONT.mono, fontSize: 10, color: t.text3, padding: '1px 5px', border: `1px solid ${t.line1}`, borderRadius: 3 }}>⌘K</span>
              </div>
            )}
            <IconBtn glyph="bell" />
            <IconBtn glyph="help" />
          </header>
        )}
        {subnav}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────
function Logo() {
  const { t } = useTheme();
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 18 L12 4 L20 18 Z" stroke={t.accent} strokeWidth="1.6" fill={t.accentDim} />
      <circle cx="12" cy="14" r="1.6" fill={t.accent} />
    </svg>
  );
}
function Avatar({ initials, size = 22, color }) {
  const { t } = useTheme();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || t.bg3, border: `1px solid ${t.line1}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: t.text0, fontSize: Math.max(9, size * 0.42), fontWeight: 600,
      fontFamily: window.FONT.mono, letterSpacing: '0.02em', flex: '0 0 auto',
    }}>{initials}</div>
  );
}
function IconBtn({ glyph }) {
  const { t } = useTheme();
  return (
    <button style={{
      width: 28, height: 28, borderRadius: 6, background: 'transparent',
      border: `1px solid transparent`, color: t.text2, display: 'flex',
      alignItems: 'center', justifyContent: 'center', cursor: 'default',
    }}>
      {glyph === 'bell' && <BellGlyph />}
      {glyph === 'help' && <span style={{ fontSize: 12, fontFamily: window.FONT.mono }}>?</span>}
    </button>
  );
}
function SearchGlyph() {
  const { t } = useTheme();
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke={t.text2} strokeWidth="1.4" />
      <path d="M10.5 10.5 L14 14" stroke={t.text2} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function BellGlyph() {
  const { t } = useTheme();
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 11.5 V7 a4.5 4.5 0 1 1 9 0 V11.5 L14 12.5 H2 Z" stroke={t.text2} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="11" cy="4" r="2" fill={t.sevHigh} stroke={t.bg0} strokeWidth="1" />
    </svg>
  );
}

// Nav icons — minimal line glyphs, no colorful drawings.
const NavIcon = {
  dash: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="10" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="8" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  hyp: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 6 H12 M4 8.5 H10 M4 11 H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  kanban: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.25" y="2" width="3.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="2" width="3.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  evidence: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 2 H10 L13 5 V14 H3 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M10 2 V5 H13" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 9 H10.5 M5.5 11 H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  attack: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="2" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11" y="2" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="6.5" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="6.5" width="3" height="3" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.3" />
      <rect x="11" y="6.5" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="11" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="11" width="3" height="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11" y="11" width="3" height="3" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.5" />
    </svg>
  ),
  plug: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M6 2 V5 M10 2 V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="4" y="5" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 9 V12 a2 2 0 0 0 2 2 H12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  report: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 6 H11 M5 8.5 H11 M5 11 H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  audit: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5 V8 L10.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  admin: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 14 c0-2.8 2.2-5 5-5 s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};

// ─── Badges ──────────────────────────────────────────────────────────
function SevBadge({ sev, size = 'sm' }) {
  const { t } = useTheme();
  const map = {
    critical: { fg: t.sevCritical, bg: t.sevCriticalBg, label: 'Critical' },
    high:     { fg: t.sevHigh,     bg: t.sevHighBg,     label: 'High' },
    medium:   { fg: t.sevMedium,   bg: t.sevMediumBg,   label: 'Medium' },
    low:      { fg: t.sevLow,      bg: t.sevLowBg,      label: 'Low' },
    info:     { fg: t.sevInfo,     bg: t.sevInfoBg,     label: 'Info' },
  }[sev] || { fg: t.text2, bg: t.bg2, label: sev };
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  const fz = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, fontSize: fz, fontWeight: 500,
      color: map.fg, background: map.bg,
      border: `1px solid ${map.fg}33`,
      borderRadius: 4, lineHeight: 1, letterSpacing: '0.01em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 1, background: map.fg }} />
      {map.label}
    </span>
  );
}

function StatusBadge({ status, size = 'sm' }) {
  const { t } = useTheme();
  const map = {
    'draft':     { fg: t.stDraft,     label: 'Draft' },
    'active':    { fg: t.stActive,    label: 'Active' },
    'in-hunt':   { fg: t.stInHunt,    label: 'In Hunt' },
    'validated': { fg: t.stValidated, label: 'Validated' },
    'closed':    { fg: t.stClosed,    label: 'Closed' },
    'archived':  { fg: t.stArchived,  label: 'Archived' },
  }[status] || { fg: t.text2, label: status };
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  const fz = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, fontSize: fz, fontWeight: 500,
      color: map.fg, background: `${map.fg}1A`,
      border: `1px solid ${map.fg}33`,
      borderRadius: 999, lineHeight: 1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: map.fg }} />
      {map.label}
    </span>
  );
}

function Chip({ children, variant = 'default', icon }) {
  const { t } = useTheme();
  const styles = {
    default: { bg: t.bg2,       fg: t.text1, bd: t.line1 },
    active:  { bg: t.accentDim, fg: t.accent, bd: t.accentLine },
    ghost:   { bg: 'transparent', fg: t.text2, bd: t.line1 },
  }[variant] || { bg: t.bg2, fg: t.text1, bd: t.line1 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', fontSize: 11.5, lineHeight: 1.2,
      color: styles.fg, background: styles.bg, border: `1px solid ${styles.bd}`,
      borderRadius: 4, cursor: 'default', fontFamily: 'inherit',
    }}>
      {icon}{children}
    </span>
  );
}

function TacticTag({ id, name }) {
  const { t } = useTheme();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 6px', fontSize: 10.5,
      color: t.text1, background: t.bg2, border: `1px solid ${t.line1}`,
      borderRadius: 3, fontFamily: window.FONT.mono,
    }}>
      <span style={{ color: t.accent }}>{id}</span>
      {name && <span style={{ color: t.text2 }}>· {name}</span>}
    </span>
  );
}

function Btn({ children, variant = 'default', icon, size = 'md' }) {
  const { t } = useTheme();
  const styles = {
    primary: { bg: t.accent, fg: t.bg0, bd: t.accent },
    default: { bg: t.bg2, fg: t.text0, bd: t.line1 },
    ghost:   { bg: 'transparent', fg: t.text1, bd: 'transparent' },
    danger:  { bg: 'transparent', fg: t.sevCritical, bd: `${t.sevCritical}55` },
  }[variant];
  const pad = size === 'sm' ? '4px 9px' : '6px 12px';
  const fz = size === 'sm' ? 11.5 : 12.5;
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad, fontSize: fz,
      color: styles.fg, background: styles.bg, border: `1px solid ${styles.bd}`,
      borderRadius: 6, fontWeight: variant === 'primary' ? 600 : 500,
      fontFamily: 'inherit', cursor: 'default', lineHeight: 1,
    }}>
      {icon}{children}
    </button>
  );
}

function Card({ children, pad = 14, ...rest }) {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 8,
      padding: pad, ...(rest.style || {}),
    }} {...rest}>{children}</div>
  );
}

function SectionTitle({ children, hint }) {
  const { t } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.text2 }}>{children}</h3>
      {hint && <span style={{ fontSize: 11, color: t.text3 }}>{hint}</span>}
    </div>
  );
}

// Bordered placeholder block — for the LO-FI wireframes. Establishes intent
// without committing to visuals. Optional label rendered in mono.
function WBlock({ children, h, w, label, fill = false, style = {}, dashed = false }) {
  const { t } = useTheme();
  return (
    <div style={{
      width: w || '100%', height: h, padding: 10,
      background: fill ? t.bg2 : 'transparent',
      border: `${dashed ? '1px dashed' : '1px solid'} ${t.line1}`,
      borderRadius: 6, color: t.text2, fontSize: 11, fontFamily: window.FONT.mono,
      display: 'flex', alignItems: children ? 'stretch' : 'center', justifyContent: children ? 'stretch' : 'center',
      flexDirection: 'column', gap: 6, ...style,
    }}>
      {label && <div style={{ color: t.text3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>}
      {children}
    </div>
  );
}

function GreyBar({ w = '100%', h = 6, dim = 1, style = {} }) {
  const { t } = useTheme();
  return <div style={{ width: w, height: h, background: t.bg3, opacity: dim, borderRadius: 2, ...style }} />;
}

function Annotation({ n, children, x, y, w = 220 }) {
  const { t } = useTheme();
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w,
      background: '#fff5d5', color: '#5a4a2a',
      border: '1px solid #e9d27d',
      borderRadius: 6, padding: '8px 10px', fontSize: 11, lineHeight: 1.4,
      boxShadow: '0 6px 18px rgba(60,40,10,0.18)',
      fontFamily: window.FONT.sans, zIndex: 5,
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 9, background: '#3a2a10', color: '#fff5d5', fontSize: 10, fontWeight: 700, fontFamily: window.FONT.mono, marginRight: 6, verticalAlign: '-3px' }}>{n}</div>
      {children}
    </div>
  );
}

Object.assign(window, {
  ThemeCtx, useTheme, AppFrame, Logo, Avatar, IconBtn, SearchGlyph, BellGlyph,
  NavIcon, SevBadge, StatusBadge, Chip, TacticTag, Btn, Card, SectionTitle,
  WBlock, GreyBar, Annotation,
});
