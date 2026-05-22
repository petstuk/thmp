// ia.jsx — sitemap and role-based navigation matrix.

function ABSitemap() {
  const { t } = useTheme();
  const top = [
    { name: 'Dashboard',    children: [] },
    { name: 'Hypotheses',   children: ['List · saved views', 'Detail', 'Create / edit', 'Bulk actions'] },
    { name: 'Hunt Board',   children: ['Kanban by status', 'Transition w/ reason'] },
    { name: 'Evidence',     children: ['Library', 'Upload + IOC parse', 'Versions', 'SIEM query link'] },
    { name: 'ATT&CK',       children: ['Matrix heatmap', 'Filters / layers', 'JSON export'] },
    { name: 'Integrations', children: ['Connectors', 'Credentials', 'Ingestion queue', 'Health'] },
    { name: 'Reports',      children: ['Generate', 'Templates', 'Export history', 'API jobs'] },
    { name: 'Audit Log',    children: ['Filter', 'Diff view', 'CSV / JSON export'] },
    { name: 'Admin',        children: ['Users', 'Roles', 'Workspaces', 'SSO', 'Security / MFA'] },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 32, fontFamily: window.FONT.sans, color: t.text1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: t.text0 }}>Sitemap</h2>
        <span style={{ fontSize: 12, color: t.text2 }}>9 top-level destinations · global ⌘K palette spans all entities</span>
      </div>

      {/* Root node */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: t.bg2, border: `1px solid ${t.accentLine}`, borderRadius: 8, color: t.text0, fontWeight: 600, fontSize: 14 }}>
          <Logo /> THMP · Workspace
        </div>
      </div>

      {/* Connector lines */}
      <div style={{ position: 'relative', height: 28, marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 14, background: t.line2, transform: 'translateX(-0.5px)' }} />
        <div style={{ position: 'absolute', left: '5.5%', right: '5.5%', top: 14, height: 1, background: t.line2 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10 }}>
        {top.map((n) => (
          <div key={n.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: -14, width: 1, height: 14, background: t.line2 }} />
              <div style={{
                padding: '8px 10px', background: t.bg1, border: `1px solid ${t.line1}`, borderRadius: 6,
                fontSize: 12, fontWeight: 500, color: t.text0, textAlign: 'center', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{n.name}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {n.children.map((c, i) => (
                <div key={i} style={{ position: 'relative', paddingLeft: 14 }}>
                  <div style={{ position: 'absolute', left: 6, top: 0, bottom: '50%', width: 1, background: t.line1 }} />
                  <div style={{ position: 'absolute', left: 6, top: '50%', width: 6, height: 1, background: t.line1 }} />
                  <div style={{ padding: '5px 8px', background: t.bg0, border: `1px solid ${t.line0}`, borderRadius: 4, fontSize: 10.5, color: t.text2, fontFamily: window.FONT.mono }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle>Global surfaces</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 16, color: t.text1, fontSize: 12, lineHeight: 1.65 }}>
            <li>⌘K command palette · jumps to any entity</li>
            <li>Bell · queue alerts + sync errors</li>
            <li>Workspace switcher · scope all queries</li>
            <li>User menu · role, theme, sign-out</li>
          </ul>
        </Card>
        <Card>
          <SectionTitle>Entity URLs</SectionTitle>
          <div style={{ fontFamily: window.FONT.mono, fontSize: 11, lineHeight: 1.7, color: t.text2 }}>
            /hyp/<span style={{color:t.accent}}>H-2087</span><br/>
            /hyp/<span style={{color:t.accent}}>H-2087</span>/evidence/<span style={{color:t.accent}}>v3</span><br/>
            /attack?filter=in-hunt&sev=high<br/>
            /audit?actor=kowalski&from=…<br/>
            /reports/jobs/<span style={{color:t.accent}}>j-481</span>
          </div>
        </Card>
        <Card>
          <SectionTitle>Cross-links</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 16, color: t.text1, fontSize: 12, lineHeight: 1.65 }}>
            <li>Evidence pieces link back to source hypothesis</li>
            <li>ATT&CK cells link to all hyps tagged with technique</li>
            <li>Audit events deep-link to entity + version</li>
            <li>Report PDF anchors back to live hypothesis</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ABRoleMatrix() {
  const { t } = useTheme();
  const roleKeys = ['analyst', 'huntLead', 'ti', 'manager', 'admin', 'readonly'];
  const cell = (v) => {
    if (v === true)    return { ch: '●', fg: t.stValidated, label: 'full' };
    if (v === 'r')     return { ch: '◐', fg: t.text2, label: 'read' };
    if (v === false)   return { ch: '·', fg: t.text3, label: 'hidden' };
    return { ch: '?', fg: t.text3, label: '' };
  };
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 32, fontFamily: window.FONT.sans, color: t.text1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: t.text0 }}>Role-based navigation</h2>
        <span style={{ fontSize: 12, color: t.text2 }}>● full access · ◐ read-only · · hidden</span>
      </div>

      <div style={{ background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: t.bg2 }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: t.text2, fontWeight: 500, borderBottom: `1px solid ${t.line0}`, width: 200 }}>Destination</th>
              {roleKeys.map((rk) => (
                <th key={rk} style={{ padding: '10px 14px', color: t.text0, fontWeight: 600, borderBottom: `1px solid ${t.line0}`, borderLeft: `1px solid ${t.line0}`, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: window.ROLES[rk].color }} />
                    {window.ROLES[rk].label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(window.NAV_MATRIX).map((nav, i) => (
              <tr key={nav} style={{ background: i % 2 ? t.bg1 : t.bg0 }}>
                <td style={{ padding: '10px 14px', color: t.text0, fontWeight: 500, borderBottom: `1px solid ${t.line0}` }}>{nav}</td>
                {roleKeys.map((rk) => {
                  const c = cell(window.NAV_MATRIX[nav][rk]);
                  return (
                    <td key={rk} style={{ padding: '10px 14px', borderBottom: `1px solid ${t.line0}`, borderLeft: `1px solid ${t.line0}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: c.fg, fontSize: 14, lineHeight: 1, fontFamily: window.FONT.mono }}>{c.ch}</span>
                        <span style={{ color: t.text3, fontSize: 11, fontFamily: window.FONT.mono }}>{c.label}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SectionTitle>Bulk action gating</SectionTitle>
          <div style={{ fontSize: 12, lineHeight: 1.65, color: t.text1 }}>
            Transition to <b style={{color:t.stValidated}}>Validated</b> requires <b>Hunt Lead+</b>. Archive requires <b>Manager+</b>.
            Read-only roles see actions disabled with tooltip <span style={{ fontFamily: window.FONT.mono, color: t.text2 }}>"Requires Hunt Lead role"</span>.
          </div>
        </Card>
        <Card>
          <SectionTitle>Unauthorized states</SectionTitle>
          <div style={{ fontSize: 12, lineHeight: 1.65, color: t.text1 }}>
            Deep-link to a forbidden page → 403 surface with action-context: "Request access from your workspace owner" + a one-click request.
            Never silently redirect — show what was attempted.
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ABSitemap, ABRoleMatrix });
