// hifi-attack.jsx — High-fidelity ATT&CK Navigator.

// Compact technique list per tactic. id, name, hyp count (or null for "no data").
const ATTACK_DATA = {
  'Reconnaissance': [
    ['T1595', 'Active Scanning', 0],
    ['T1592', 'Gather Victim Host Info', 0],
    ['T1589', 'Gather Victim Identity', 1],
    ['T1591', 'Gather Victim Org Info', 0],
    ['T1598', 'Phishing for Information', 2],
  ],
  'Resource Dev.': [
    ['T1583', 'Acquire Infrastructure', 1],
    ['T1587', 'Develop Capabilities', 0],
    ['T1585', 'Establish Accounts', 1],
    ['T1588', 'Obtain Capabilities', 0],
  ],
  'Initial Access': [
    ['T1566', 'Phishing', 5],
    ['T1566.001', 'Spearphish Attach.', 4],
    ['T1566.002', 'Spearphish Link', 3],
    ['T1190', 'Exploit Public App', 2],
    ['T1133', 'External Remote Svc', 1],
    ['T1078', 'Valid Accounts', 3],
  ],
  'Execution': [
    ['T1059', 'Cmd & Script', 4],
    ['T1059.001', 'PowerShell', 4],
    ['T1059.003', 'Windows Cmd', 1],
    ['T1204', 'User Execution', 2],
    ['T1053', 'Scheduled Task', 1],
    ['T1569.002', 'Service Execution', 0],
  ],
  'Persistence': [
    ['T1078', 'Valid Accounts', 3],
    ['T1078.004', 'Cloud Accounts', 2],
    ['T1543.003', 'Windows Service', 2],
    ['T1547.001', 'Run Keys', 1],
    ['T1136', 'Create Account', 0],
    ['T1098', 'Account Manip.', 0],
  ],
  'Priv. Esc.': [
    ['T1055', 'Process Injection', 2],
    ['T1068', 'Exploit for PE', 1],
    ['T1134', 'Token Manip.', 0],
    ['T1484', 'Domain Policy Mod', 0],
  ],
  'Defense Evasion': [
    ['T1027', 'Obfuscated Files', 3],
    ['T1070', 'Indicator Removal', 1],
    ['T1112', 'Modify Registry', 1],
    ['T1218', 'Signed Binary Proxy', 2],
    ['T1562', 'Impair Defenses', 1],
  ],
  'Credential Access': [
    ['T1003.001', 'LSASS Memory', 3],
    ['T1110', 'Brute Force', 1],
    ['T1110.003', 'Password Spraying', 2],
    ['T1555', 'Credentials Stores', 0],
    ['T1621', 'MFA Request Gen', 1],
  ],
  'Discovery': [
    ['T1087', 'Account Discovery', 1],
    ['T1018', 'Remote Sys Disc.', 1],
    ['T1082', 'System Info Disc.', 0],
    ['T1083', 'File & Dir Disc.', 0],
  ],
  'Lateral Movement': [
    ['T1021', 'Remote Services', 4],
    ['T1021.001', 'RDP', 3],
    ['T1021.002', 'SMB Admin Shares', 2],
    ['T1021.006', 'WinRM', 0],
    ['T1570', 'Lateral Tool Trans', 0],
  ],
  'Collection': [
    ['T1005', 'Local System', 1],
    ['T1213', 'Repository Data', 0],
    ['T1530', 'Cloud Storage', 1],
  ],
  'C2': [
    ['T1071', 'App Layer Proto', 3],
    ['T1071.001', 'Web Protocols', 2],
    ['T1071.004', 'DNS', 1],
    ['T1572', 'Protocol Tunneling', 1],
    ['T1090', 'Proxy', 2],
  ],
  'Exfiltration': [
    ['T1041', 'Exfil over C2', 2],
    ['T1567', 'Exfil to Web Svc', 1],
    ['T1567.002', 'Exfil to Cloud', 3],
  ],
  'Impact': [
    ['T1486', 'Ransomware', 1],
    ['T1490', 'Inhibit Recovery', 0],
    ['T1485', 'Data Destruction', 0],
  ],
};

function coverageFor(count, t) {
  if (count === 0)  return { bg: t.cov0, fg: t.text3 };
  if (count === 1)  return { bg: t.cov1, fg: t.text1 };
  if (count === 2)  return { bg: t.cov2, fg: t.text0 };
  if (count <= 3)   return { bg: t.cov3, fg: t.text0 };
  return { bg: t.cov4, fg: t.bg0 };
}

function HiAttackCell({ id, name, count, isGap, isSelected, isHovered }) {
  const { t } = useTheme();
  const cov = coverageFor(count, t);
  const showGap = isGap && count === 0;
  return (
    <div style={{
      padding: '6px 7px', minHeight: 42,
      background: showGap ? t.gap : cov.bg,
      border: isSelected
        ? `1.5px solid ${t.accent}`
        : isHovered
          ? `1px solid ${t.accentLine}`
          : `1px solid ${showGap ? `${t.sevCritical}55` : t.line0}`,
      borderStyle: showGap ? 'dashed' : 'solid',
      borderRadius: 4, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', gap: 4, cursor: 'default',
      boxShadow: isSelected ? `0 0 0 3px ${t.accentDim}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ fontFamily: window.FONT.mono, fontSize: 10, color: cov.fg, fontWeight: 500, letterSpacing: '-0.01em' }}>{id}</div>
        {count > 0 ? (
          <div style={{ fontFamily: window.FONT.mono, fontSize: 10, color: cov.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
        ) : showGap ? (
          <div style={{ fontFamily: window.FONT.mono, fontSize: 9, color: t.sevCritical, fontWeight: 600 }}>GAP</div>
        ) : null}
      </div>
      <div style={{ fontSize: 10, color: cov.fg, opacity: 0.85, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
    </div>
  );
}

function HiAttackMatrix({ showGaps, selectedId }) {
  const { t } = useTheme();
  const tactics = Object.keys(ATTACK_DATA);
  const maxRows = Math.max(...tactics.map((k) => ATTACK_DATA[k].length));
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${tactics.length}, minmax(0, 1fr))`,
      gap: 4, alignItems: 'start',
    }}>
      {tactics.map((tac) => {
        const total = ATTACK_DATA[tac].reduce((s, r) => s + r[2], 0);
        const gapCount = ATTACK_DATA[tac].filter((r) => r[2] === 0).length;
        return (
          <div key={tac} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              padding: '6px 7px', background: t.bg1, border: `1px solid ${t.line1}`,
              borderRadius: 4, fontSize: 10.5, color: t.text0, fontWeight: 600,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tac}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: window.FONT.mono, fontSize: 9.5, color: t.text2, fontWeight: 400 }}>
                <span>{ATTACK_DATA[tac].length} tech</span>
                <span style={{ color: t.text3 }}>·</span>
                <span style={{ color: t.accent }}>{total} hyp</span>
                {showGaps && gapCount > 0 && (<><span style={{ color: t.text3 }}>·</span><span style={{ color: t.sevCritical }}>{gapCount} gap</span></>)}
              </div>
            </div>
            {ATTACK_DATA[tac].map(([id, name, count], i) => (
              <HiAttackCell key={id + i} id={id} name={name} count={count}
                isGap={showGaps} isSelected={selectedId === id} />
            ))}
            {/* Pad column to align row heights */}
            {Array.from({ length: maxRows - ATTACK_DATA[tac].length }).map((_, i) => (
              <div key={`pad-${i}`} style={{ minHeight: 42 }} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function HiAttackDrawer() {
  const { t } = useTheme();
  const hyps = window.HYPOTHESES.filter((h) => ['H-2087', 'H-2085', 'H-2080'].includes(h.id));
  return (
    <aside style={{
      width: 360, flex: '0 0 360px', background: t.bg1, borderLeft: `1px solid ${t.line0}`,
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.line0}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: window.FONT.mono, fontSize: 12, color: t.accent, padding: '2px 6px', background: t.accentDim, borderRadius: 4 }}>T1566.001</span>
          <span style={{ fontSize: 14, color: t.text0, fontWeight: 600 }}>Spearphish Attach.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 11.5, color: t.text2 }}>
          <span><b style={{ color: t.text0 }}>4</b> hypotheses</span>
          <span style={{ color: t.text3 }}>·</span>
          <span>Tactic: <b style={{ color: t.text0 }}>Initial Access</b></span>
          <span style={{ marginLeft: 'auto', fontFamily: window.FONT.mono, fontSize: 11, color: t.text3 }}>×</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: t.text2, lineHeight: 1.5 }}>
          Adversaries may send phishing messages with malicious attachments to gain access.
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Btn size="sm" variant="primary">+ New hypothesis</Btn>
          <Btn size="sm">Open in MITRE</Btn>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '10px 16px', fontSize: 11, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          <span>Hypotheses</span><span style={{ fontFamily: window.FONT.mono, color: t.text3 }}>most recent</span>
        </div>
        {hyps.map((h) => (
          <div key={h.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${t.line0}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.accent }}>{h.id}</span>
              <SevBadge sev={h.sev} />
              <StatusBadge status={h.status} />
            </div>
            <div style={{ fontSize: 12, color: t.text0, lineHeight: 1.4 }}>{h.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.text2, fontFamily: window.FONT.mono }}>
              <Avatar initials={h.owner.slice(0,2).toUpperCase()} size={16} />
              <span>{h.owner}</span>
              <span style={{ color: t.text3 }}>·</span>
              <span>{h.evCount} evidence</span>
              <span style={{ marginLeft: 'auto', color: t.text3 }}>{h.updated}</span>
            </div>
          </div>
        ))}
        <div style={{ padding: '14px 16px' }}>
          <SectionTitle>Coverage trend · 90d</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
            {[1,2,1,3,2,4,3,3,5,4,3,4].map((v, i) => (
              <div key={i} style={{ flex: 1, height: `${v * 12}%`, background: t.accentLine, borderRadius: 2, minHeight: 4 }} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HiAttackNavigator() {
  const { t } = useTheme();
  return (
    <AppFrame active="ATT&CK">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Filter bar */}
        <div style={{
          padding: '10px 18px', borderBottom: `1px solid ${t.line0}`,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text0 }}>ATT&CK Navigator</h1>
            <span style={{ color: t.text3, fontFamily: window.FONT.mono, fontSize: 11 }}>· Enterprise · 14 tactics</span>
          </div>
          <div style={{ width: 1, height: 18, background: t.line1 }} />
          <Chip variant="active">Status: In Hunt, Validated</Chip>
          <Chip>Sev: High+</Chip>
          <Chip>Last 90 days</Chip>
          <Chip>Workspace: Falcon</Chip>
          <Chip variant="ghost">+ Filter</Chip>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'inline-flex', background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 6, padding: 2, gap: 2 }}>
              <span style={{ padding: '4px 10px', borderRadius: 4, background: t.bg3, color: t.text0, fontSize: 11.5, fontWeight: 500 }}>Heatmap</span>
              <span style={{ padding: '4px 10px', borderRadius: 4, color: t.text2, fontSize: 11.5 }}>Gaps</span>
              <span style={{ padding: '4px 10px', borderRadius: 4, color: t.text2, fontSize: 11.5 }}>Compare</span>
            </div>
            <Btn size="sm">Layers ⌄</Btn>
            <Btn size="sm">Export JSON</Btn>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Matrix */}
          <div style={{ flex: 1, overflow: 'auto', padding: 14, minWidth: 0 }}>
            <HiAttackMatrix showGaps={true} selectedId="T1566.001" />
          </div>
          {/* Cell drawer */}
          <HiAttackDrawer />
        </div>

        {/* Footer legend */}
        <div style={{
          flex: '0 0 auto', padding: '8px 18px', borderTop: `1px solid ${t.line0}`,
          background: t.bg0, display: 'flex', alignItems: 'center', gap: 18, fontSize: 11, color: t.text2,
        }}>
          <span style={{ fontFamily: window.FONT.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coverage</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: window.FONT.mono, fontSize: 10.5 }}>0</span>
            {[t.cov0, t.cov1, t.cov2, t.cov3, t.cov4].map((c, i) => (
              <span key={i} style={{ width: 26, height: 12, background: c, border: `1px solid ${t.line0}`, borderRadius: 2 }} />
            ))}
            <span style={{ fontFamily: window.FONT.mono, fontSize: 10.5 }}>≥4 hyps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 26, height: 12, background: t.gap, border: `1px dashed ${t.sevCritical}88`, borderRadius: 2 }} />
            <span>known gap (relevant tactic, 0 hyps)</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, fontFamily: window.FONT.mono, color: t.text3 }}>
            <span><span style={{ color: t.text0 }}>72</span> techniques covered</span>
            <span><span style={{ color: t.sevCritical }}>9</span> gaps</span>
            <span><span style={{ color: t.text0 }}>47</span> hyps active</span>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

Object.assign(window, { HiAttackNavigator, ATTACK_DATA });
