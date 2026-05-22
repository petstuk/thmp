// wireframes.jsx — 10 lo-fi wireframes for all core screens.
// Lo-fi = AppFrame chrome + WBlock placeholders + minimal real content
// (labels, button names, column headers) so structure is unambiguous.

// ─── Dashboard ────────────────────────────────────────────────────────
function WFDashboard() {
  const { t } = useTheme();
  return (
    <AppFrame active="Dashboard">
      <div style={{ padding: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', overflow: 'auto', height: '100%' }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 20, color: t.text0, fontWeight: 600 }}>Good morning, Karen</div>
            <div style={{ fontSize: 12, color: t.text2 }}>Falcon Workspace · 47 active hypotheses · 3 require attention</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}><Btn size="sm">Last 7 days</Btn><Btn size="sm" variant="primary" icon="+">New hypothesis</Btn></div>
        </div>
        {[['Active', '47'], ['In Hunt', '12'], ['Critical', '3'], ['Validated · 7d', '21']].map(([l, v]) => (
          <Card key={l}>
            <div style={{ fontSize: 11, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
            <div style={{ fontSize: 28, color: t.text0, fontWeight: 600, fontFamily: window.FONT.mono, lineHeight: 1.1, marginTop: 4 }}>{v}</div>
            <WBlock h={36} style={{ marginTop: 8 }} label="sparkline" />
          </Card>
        ))}
        <Card style={{ gridColumn: '1 / 3' }}>
          <SectionTitle hint="by tactic">Status distribution</SectionTitle>
          <WBlock h={180} label="stacked bar by tactic × status" />
        </Card>
        <Card style={{ gridColumn: '3 / 5' }}>
          <SectionTitle hint="last 14 days">Severity trend</SectionTitle>
          <WBlock h={180} label="multi-line · severity over time" />
        </Card>
        <Card style={{ gridColumn: '1 / 3' }}>
          <SectionTitle>Recent activity</SectionTitle>
          {[1,2,3,4,5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i>1?`1px solid ${t.line0}`:'none' }}>
              <Avatar initials="MR" />
              <div style={{ flex: 1, fontSize: 12, color: t.text1 }}>M. Reyes transitioned <span style={{ color: t.text0 }}>H-208{6-i}</span> → Active</div>
              <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>{i*7}m ago</div>
            </div>
          ))}
        </Card>
        <Card style={{ gridColumn: '3 / 5' }}>
          <SectionTitle hint="needs triage">Queue alerts</SectionTitle>
          {['Splunk connector offline · last sync failed', 'Mandiant feed · 14 unreviewed reports', 'CrowdStrike · ingestion lag 12m'].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: t.bg2, border: `1px solid ${t.line0}`, borderRadius: 6, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: i===0?t.sevCritical:t.sevHigh }} />
              <span style={{ fontSize: 12, color: t.text1, flex: 1 }}>{m}</span>
              <Btn size="sm" variant="ghost">Open</Btn>
            </div>
          ))}
        </Card>
      </div>
    </AppFrame>
  );
}

// ─── Hypothesis List ──────────────────────────────────────────────────
function WFHypothesisList() {
  const { t } = useTheme();
  const cols = ['', 'ID', 'Title', 'Severity', 'Status', 'Owner', 'ATT&CK', 'Evidence', 'Source', 'Updated'];
  return (
    <AppFrame active="Hypotheses">
      <div style={{ display: 'flex', height: '100%' }}>
        <aside style={{ width: 200, borderRight: `1px solid ${t.line0}`, padding: 12, background: t.bg1 }}>
          <SectionTitle>Saved views</SectionTitle>
          {['All hypotheses', 'My open hunts', 'Critical · unowned', 'Validated · 30d', 'Drafts'].map((v, i) => (
            <div key={v} style={{ padding: '6px 8px', borderRadius: 5, background: i===1?t.bg3:'transparent', fontSize: 12, color: i===1?t.text0:t.text1, marginBottom: 1 }}>{v}</div>
          ))}
          <div style={{ height: 1, background: t.line0, margin: '12px 0' }} />
          <SectionTitle>Filters</SectionTitle>
          {['Status', 'Severity', 'Owner', 'Tactic', 'Source', 'Date range'].map((f) => (
            <div key={f} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, color: t.text1 }}><span>{f}</span><span style={{ color: t.text3 }}>+</span></div>
          ))}
        </aside>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.line0}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Chip variant="active">My open hunts</Chip>
            <Chip>Severity: High+</Chip>
            <Chip>Status: Active, In-Hunt</Chip>
            <Chip variant="ghost">+ Add filter</Chip>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <Btn size="sm">Bulk actions ⌄</Btn>
              <Btn size="sm" variant="primary">New hypothesis</Btn>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: t.bg1 }}>{cols.map((c) => <th key={c} style={{ textAlign: 'left', padding: '8px 12px', color: t.text2, fontWeight: 500, borderBottom: `1px solid ${t.line0}`, position: 'sticky', top: 0, background: t.bg1, fontSize: 11 }}>{c}</th>)}</tr></thead>
              <tbody>
                {window.HYPOTHESES.map((h) => (
                  <tr key={h.id} style={{ borderBottom: `1px solid ${t.line0}` }}>
                    <td style={{ padding: '10px 12px' }}><div style={{ width: 12, height: 12, border: `1px solid ${t.line2}`, borderRadius: 3 }} /></td>
                    <td style={{ padding: '10px 12px', fontFamily: window.FONT.mono, color: t.accent }}>{h.id}</td>
                    <td style={{ padding: '10px 12px', color: t.text0, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</td>
                    <td style={{ padding: '10px 12px' }}><SevBadge sev={h.sev} /></td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge status={h.status} /></td>
                    <td style={{ padding: '10px 12px', color: t.text1 }}>{h.owner}</td>
                    <td style={{ padding: '10px 12px', fontFamily: window.FONT.mono, color: t.text1 }}>{h.techCount}</td>
                    <td style={{ padding: '10px 12px', fontFamily: window.FONT.mono, color: t.text1 }}>{h.evCount}</td>
                    <td style={{ padding: '10px 12px', color: t.text2 }}>{h.source}</td>
                    <td style={{ padding: '10px 12px', color: t.text3, fontFamily: window.FONT.mono, fontSize: 11 }}>{h.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// ─── Hypothesis Detail (lo-fi) ────────────────────────────────────────
function WFHypothesisDetail() {
  const { t } = useTheme();
  return (
    <AppFrame active="Hypotheses" breadcrumbs={<div style={{ fontSize: 12, color: t.text2, display: 'flex', gap: 6, alignItems: 'center' }}><span>Hypotheses</span><span style={{ color: t.text3 }}>/</span><span style={{ color: t.text0, fontFamily: window.FONT.mono }}>H-2087</span></div>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
        <div style={{ padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: window.FONT.mono, color: t.accent, fontSize: 12 }}>H-2087</span>
                <SevBadge sev="critical" /><StatusBadge status="in-hunt" />
              </div>
              <h1 style={{ margin: 0, fontSize: 20, color: t.text0, fontWeight: 600, lineHeight: 1.25 }}>Spearphishing campaign delivering DragonGate loader to finance staff</h1>
            </div>
            <Btn size="sm">Transition ⌄</Btn>
            <Btn size="sm" variant="ghost">⋯</Btn>
          </div>
          <WBlock h={70} label="status timeline · Draft → Active → In Hunt (with reasons)" />
          <Card>
            <SectionTitle>Description</SectionTitle>
            <WBlock h={84} dashed label="rich text · markdown" />
          </Card>
          <Card>
            <SectionTitle hint="5 techniques · 3 tactics">ATT&CK mappings</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {window.TECHNIQUES.slice(0,5).map((tt) => <TacticTag key={tt.id} id={tt.id} name={tt.name} />)}
              <Chip variant="ghost">+ Add technique</Chip>
            </div>
          </Card>
          <Card>
            <SectionTitle hint="12 items · 3 support · 1 refute">Evidence</SectionTitle>
            <WBlock h={150} label="list · type, source, weight, support/refute, version" />
          </Card>
          <Card>
            <SectionTitle>Activity & comments</SectionTitle>
            <WBlock h={140} label="threaded · @mentions · transition reasons" />
          </Card>
        </div>
        <aside style={{ borderLeft: `1px solid ${t.line0}`, padding: 16, background: t.bg1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad={12}>
            <SectionTitle>Scoring</SectionTitle>
            <WBlock h={100} label="confidence dial · evidence weight rollup" />
          </Card>
          <Card pad={12}>
            <SectionTitle>Metadata</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 6, columnGap: 8, fontSize: 12 }}>
              {[['Owner','kowalski'],['Reporter','TI feed'],['Source','Mandiant'],['Workspace','Falcon'],['Created','3d ago'],['SLA','12h']].map(([k,v]) => (
                <React.Fragment key={k}><span style={{ color: t.text3 }}>{k}</span><span style={{ color: t.text1, fontFamily: window.FONT.mono }}>{v}</span></React.Fragment>
              ))}
            </div>
          </Card>
          <Card pad={12}>
            <SectionTitle>Linked</SectionTitle>
            <WBlock h={80} label="related hyps · campaigns" />
          </Card>
        </aside>
      </div>
    </AppFrame>
  );
}

// ─── Hypothesis Create ────────────────────────────────────────────────
function WFHypothesisCreate() {
  const { t } = useTheme();
  return (
    <AppFrame active="Hypotheses" breadcrumbs={<div style={{ fontSize: 12, color: t.text2 }}>Hypotheses / <span style={{ color: t.text0 }}>New hypothesis</span></div>}>
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, height: '100%', overflow: 'auto' }}>
        <div style={{ gridColumn: '1 / 9', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <Chip variant="active">Manual</Chip>
              <Chip>From intel report</Chip>
              <Chip>Duplicate of…</Chip>
            </div>
            <SectionTitle>Title</SectionTitle>
            <WBlock h={36} label="single-line input" />
            <SectionTitle>Description</SectionTitle>
            <WBlock h={140} dashed label="markdown · paste-IOC-aware" />
          </Card>
          <Card>
            <SectionTitle hint="typeahead · grouped by tactic">ATT&CK technique picker</SectionTitle>
            <WBlock h={44} label="search techniques…" />
            <div style={{ marginTop: 8, padding: 10, background: t.accentDim, border: `1px dashed ${t.accentLine}`, borderRadius: 6, fontSize: 12, color: t.text1 }}>
              <div style={{ fontWeight: 600, color: t.accent, marginBottom: 6 }}>5 auto-suggested techniques from description</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {window.TECHNIQUES.slice(0,5).map((tt) => (
                  <span key={tt.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 8px', background: t.bg1, border: `1px solid ${t.line1}`, borderRadius: 4, fontFamily: window.FONT.mono, fontSize: 11 }}>
                    <span style={{ color: t.accent }}>{tt.id}</span>
                    <span style={{ color: t.text2 }}>· {tt.name}</span>
                    <span style={{ color: t.stValidated, marginLeft: 4, cursor: 'default' }}>✓</span>
                    <span style={{ color: t.sevCritical, cursor: 'default' }}>×</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <SectionTitle>Initial evidence (optional)</SectionTitle>
            <WBlock h={90} dashed label="drag files · paste log / IOCs / URL" />
          </Card>
        </div>
        <div style={{ gridColumn: '9 / 13', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <SectionTitle>Lifecycle</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['Severity', <SevBadge sev="high" />], ['Status', <StatusBadge status="draft" />], ['Owner', 'kowalski'], ['Workspace', 'Falcon'], ['Source', 'Mandiant feed']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}><span style={{ color: t.text2 }}>{k}</span><span style={{ color: t.text0 }}>{v}</span></div>
              ))}
            </div>
          </Card>
          <Card><SectionTitle>Visibility & RBAC</SectionTitle><WBlock h={60} label="workspace · team · private" /></Card>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Btn variant="ghost">Save as draft</Btn>
            <Btn variant="primary">Create & assign</Btn>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

// ─── Hunt Board (lo-fi) ────────────────────────────────────────────────
function WFHuntBoard() {
  const { t } = useTheme();
  const cols = ['Draft', 'Active', 'In Hunt', 'Validated', 'Closed'];
  const buckets = { Draft: [9], Active: [1,5,6], 'In Hunt': [0,2,8], Validated: [3], Closed: [] };
  return (
    <AppFrame active="Hunt Board">
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.line0}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Chip variant="active">My board</Chip>
        <Chip>Workspace: Falcon</Chip>
        <Chip>Severity: All</Chip>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}><Btn size="sm">Swimlanes ⌄</Btn><Btn size="sm">Group by tactic</Btn></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, padding: 14, height: 'calc(100% - 45px)', overflow: 'auto' }}>
        {cols.map((c) => (
          <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 4px 8px', borderBottom: `2px solid ${t.line1}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: t.text0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c==='In Hunt'?t.stInHunt:c==='Validated'?t.stValidated:c==='Active'?t.stActive:t.text3 }} />
                {c}
                <span style={{ color: t.text3, fontFamily: window.FONT.mono, fontSize: 11 }}>{buckets[c].length}</span>
              </div>
              <span style={{ color: t.text3 }}>+</span>
            </div>
            {buckets[c].map((i) => {
              const h = window.HYPOTHESES[i];
              return (
                <div key={i} style={{ padding: 10, background: t.bg1, border: `1px solid ${t.line1}`, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: window.FONT.mono, color: t.accent, fontSize: 11 }}>{h.id}</span>
                    <SevBadge sev={h.sev} />
                  </div>
                  <div style={{ color: t.text0, lineHeight: 1.35 }}>{h.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.text2, fontSize: 11, fontFamily: window.FONT.mono }}>
                    <Avatar initials={h.owner.slice(0,2).toUpperCase()} size={18} />
                    <span>T·{h.techCount}</span>
                    <span>E·{h.evCount}</span>
                    <span style={{ marginLeft: 'auto', color: t.text3 }}>{h.updated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

// ─── Evidence Management ──────────────────────────────────────────────
function WFEvidence() {
  const { t } = useTheme();
  return (
    <AppFrame active="Evidence">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: '100%' }}>
        <div style={{ padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Chip variant="active">All</Chip>
            <Chip>File</Chip>
            <Chip>Log snippet</Chip>
            <Chip>SIEM query</Chip>
            <Chip>IOC</Chip>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <Btn size="sm">Paste IOCs</Btn>
              <Btn size="sm" variant="primary">Upload</Btn>
            </div>
          </div>
          <WBlock h={70} dashed label="DRAG FILES HERE · or click to upload · auto-IOC extraction on paste" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: t.bg1 }}>{['','Type','Name','Hyp','S/R','Weight','Version','By','When'].map((c)=> <th key={c} style={{ textAlign: 'left', padding: '8px 10px', color: t.text2, fontWeight: 500, borderBottom: `1px solid ${t.line0}` }}>{c}</th>)}</tr></thead>
            <tbody>
              {[
                ['log','outbound-c2.snippet','H-2087','S','0.8','v3','kowalski','12m ago'],
                ['file','dragonloader.dll','H-2087','S','0.9','v1','reyes','34m ago'],
                ['ioc','hashes.txt (47 IOCs)','H-2087','S','0.6','v2','reyes','1h ago'],
                ['siem','sourcetype=wineventlog…','H-2086','S','0.5','v1','reyes','2h ago'],
                ['log','dns-tunneling.snippet','H-2079','R','0.3','v1','lin','3h ago'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.line0}` }}>
                  <td style={{ padding: '8px 10px' }}><div style={{ width: 12, height: 12, border: `1px solid ${t.line2}`, borderRadius: 3 }} /></td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.text2 }}>{row[0]}</td>
                  <td style={{ padding: '8px 10px', color: t.text0, fontFamily: window.FONT.mono }}>{row[1]}</td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.accent }}>{row[2]}</td>
                  <td style={{ padding: '8px 10px' }}><span style={{ display: 'inline-block', width: 18, height: 18, lineHeight: '18px', textAlign: 'center', fontFamily: window.FONT.mono, fontSize: 10, fontWeight: 700, borderRadius: 4, color: row[3]==='S'?t.stValidated:t.sevCritical, background: row[3]==='S'?`${t.stValidated}1A`:t.sevCriticalBg }}>{row[3]}</span></td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.text1 }}>{row[4]}</td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.text2 }}>{row[5]}</td>
                  <td style={{ padding: '8px 10px', color: t.text1 }}>{row[6]}</td>
                  <td style={{ padding: '8px 10px', color: t.text3, fontFamily: window.FONT.mono }}>{row[7]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside style={{ borderLeft: `1px solid ${t.line0}`, padding: 16, background: t.bg1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 13, color: t.text0, fontWeight: 600 }}>outbound-c2.snippet</div>
          <WBlock h={140} label="preview · syntax-highlight log" />
          <Card pad={10}>
            <SectionTitle>Versions (immutable)</SectionTitle>
            {['v3 · now', 'v2 · 1h ago', 'v1 · 3h ago'].map((v, i) => (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: i>0?`1px solid ${t.line0}`:'none', fontSize: 12, color: i===0?t.text0:t.text2, fontFamily: window.FONT.mono }}>
                <span>{v}</span><span style={{ color: t.text3 }}>diff →</span>
              </div>
            ))}
          </Card>
          <Card pad={10}>
            <SectionTitle>Support / refute</SectionTitle>
            <WBlock h={50} label="toggle · weight slider" />
          </Card>
        </aside>
      </div>
    </AppFrame>
  );
}

// ─── ATT&CK Navigator (lo-fi) ─────────────────────────────────────────
function WFAttack() {
  const { t } = useTheme();
  const tactics = ['Recon', 'Initial Access', 'Execution', 'Persistence', 'Priv Esc', 'Defense Evasion', 'Cred Access', 'Discovery', 'Lat Movement', 'Collection', 'C2', 'Exfil', 'Impact'];
  return (
    <AppFrame active="ATT&CK">
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.line0}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Chip variant="active">Status: In Hunt + Validated</Chip>
        <Chip>Severity: All</Chip>
        <Chip>Last 30 days</Chip>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn size="sm">Show gaps</Btn>
          <Btn size="sm">Export layer (JSON)</Btn>
        </div>
      </div>
      <div style={{ padding: 14, height: 'calc(100% - 45px)', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tactics.length}, 1fr)`, gap: 4 }}>
          {tactics.map((tac) => (
            <div key={tac} style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text2, padding: '6px 4px', borderBottom: `1px solid ${t.line1}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tac}</div>
          ))}
          {Array.from({ length: 10 }).map((_, row) =>
            tactics.map((tac, col) => {
              const v = (row * 7 + col * 3) % 6;
              const bg = v === 5 ? t.gap : [t.cov0, t.cov1, t.cov2, t.cov3, t.cov4][v];
              return (
                <div key={`${row}-${col}`} style={{ height: 28, background: bg, border: `1px solid ${t.line0}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: window.FONT.mono, fontSize: 9.5, color: v>2?t.text0:t.text2 }}>
                  {v === 5 ? '·' : v > 0 ? v : ''}
                </div>
              );
            })
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.text2 }}>
          <span>0</span>
          {[t.cov0, t.cov1, t.cov2, t.cov3, t.cov4].map((c, i) => <span key={i} style={{ width: 18, height: 10, background: c, border: `1px solid ${t.line0}` }} />)}
          <span>≥5 hyps</span>
          <span style={{ width: 18, height: 10, background: t.gap, border: `1px dashed ${t.sevCritical}` }} />
          <span>gap</span>
          <span style={{ marginLeft: 'auto', color: t.text3 }}>click any cell → drawer with hypotheses for that technique</span>
        </div>
      </div>
    </AppFrame>
  );
}

// ─── Integrations Console ─────────────────────────────────────────────
function WFIntegrations() {
  const { t } = useTheme();
  const conns = [
    ['Splunk Cloud',   'siem',    'healthy', '02:18 ago', '0 errs'],
    ['Mandiant',       'feed',    'healthy', '04:02 ago', '0 errs'],
    ['CrowdStrike',    'edr',     'lag',     '12:01 ago', '0 errs'],
    ['MISP',           'feed',    'healthy', '01:55 ago', '0 errs'],
    ['Okta',           'idp',     'healthy', '00:42 ago', '0 errs'],
    ['Sentinel',       'siem',    'offline', '2h ago',    '14 errs'],
  ];
  const dot = (s) => s==='healthy'?t.stValidated:s==='lag'?t.sevHigh:t.sevCritical;
  return (
    <AppFrame active="Integrations">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%' }}>
        <div style={{ padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SectionTitle hint="Falcon Workspace · 6 of 8 connectors enabled">Connectors</SectionTitle>
            <div style={{ marginLeft: 'auto' }}><Btn size="sm" variant="primary">+ Add connector</Btn></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: t.bg1 }}>{['Status','Connector','Type','Last sync','Errors',''].map((c)=> <th key={c} style={{ textAlign: 'left', padding: '8px 10px', color: t.text2, fontWeight: 500, borderBottom: `1px solid ${t.line0}` }}>{c}</th>)}</tr></thead>
            <tbody>
              {conns.map(([name, type, status, sync, errs]) => (
                <tr key={name} style={{ borderBottom: `1px solid ${t.line0}` }}>
                  <td style={{ padding: '10px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: dot(status), fontFamily: window.FONT.mono }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: dot(status) }} />{status}</span></td>
                  <td style={{ padding: '10px', color: t.text0, fontWeight: 500 }}>{name}</td>
                  <td style={{ padding: '10px', color: t.text2, fontFamily: window.FONT.mono }}>{type}</td>
                  <td style={{ padding: '10px', color: t.text1, fontFamily: window.FONT.mono }}>{sync}</td>
                  <td style={{ padding: '10px', color: errs.startsWith('0')?t.text2:t.sevCritical, fontFamily: window.FONT.mono }}>{errs}</td>
                  <td style={{ padding: '10px' }}><Btn size="sm" variant="ghost">Test</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
          <SectionTitle hint="14 unreviewed · 3 errored">Ingestion queue</SectionTitle>
          <WBlock h={140} label="incoming intel reports / alerts · promote → hypothesis" />
        </div>
        <aside style={{ borderLeft: `1px solid ${t.line0}`, padding: 16, background: t.bg1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 14, color: t.text0, fontWeight: 600 }}>Sentinel · setup</div>
          <Card pad={12}><SectionTitle>Credentials</SectionTitle><WBlock h={80} label="tenant · client id · secret · test connection" /></Card>
          <Card pad={12}><SectionTitle>Sync schedule</SectionTitle><WBlock h={50} label="every 5m · backfill 30d" /></Card>
          <Card pad={12}><SectionTitle>Field mapping</SectionTitle><WBlock h={110} label="source → THMP entity mapping" /></Card>
        </aside>
      </div>
    </AppFrame>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────
function WFReports() {
  const { t } = useTheme();
  return (
    <AppFrame active="Reports">
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
        <aside style={{ borderRight: `1px solid ${t.line0}`, padding: 14, background: t.bg1 }}>
          <SectionTitle>Generate</SectionTitle>
          {[['Hypothesis', 'single hyp summary'], ['Hunt', 'evidence + outcomes'], ['Coverage', 'ATT&CK matrix'], ['Summary', 'period rollup']].map(([n, d]) => (
            <div key={n} style={{ padding: 10, background: n==='Coverage'?t.bg3:'transparent', border: `1px solid ${t.line0}`, borderRadius: 6, marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: t.text0, fontWeight: 500 }}>{n}</div>
              <div style={{ fontSize: 11, color: t.text2 }}>{d}</div>
            </div>
          ))}
          <div style={{ height: 1, background: t.line0, margin: '12px 0' }} />
          <SectionTitle>Templates</SectionTitle>
          {['Default · branded', 'Exec brief', 'Technical deep'].map((n) => <div key={n} style={{ padding: '6px 8px', fontSize: 12, color: t.text1 }}>{n}</div>)}
        </aside>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: t.text0, fontWeight: 600 }}>Coverage report · Q2</h2>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>Last 90 days · Falcon Workspace</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}><Btn size="sm">PDF</Btn><Btn size="sm">STIX</Btn><Btn size="sm" variant="primary">Run report</Btn></div>
          </div>
          <Card><SectionTitle>Configure</SectionTitle><WBlock h={70} label="date range · workspaces · branding · cover · sections" /></Card>
          <Card><SectionTitle>Preview</SectionTitle><WBlock h={220} dashed label="paginated preview · letter · with exec summary, matrix, top hypotheses" /></Card>
          <Card><SectionTitle>Export history</SectionTitle><WBlock h={100} label="last 20 jobs · status · download · API key" /></Card>
        </div>
      </div>
    </AppFrame>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────
function WFAudit() {
  const { t } = useTheme();
  const events = [
    ['09:42:18', 'kowalski',  'H-2087',   'transition',   'In Hunt → Validated'],
    ['09:31:02', 'reyes',     'H-2087',   'evidence.add', 'log snippet v3'],
    ['09:28:55', 'tanaka',    'connector.sentinel', 'config', 'rotated secret'],
    ['09:24:00', 'admin',     'user.lin', 'role.change',  'Analyst → Hunt Lead'],
    ['09:12:33', 'kowalski',  'H-2086',   'comment',      '@reyes please check'],
    ['09:04:12', 'system',    'report.j-481', 'export.pdf', '2.4 MB'],
    ['08:58:01', 'lin',       'H-2079',   'attack.add',   'T1003.001'],
    ['08:45:09', 'manager',   'workspace.falcon', 'sso.config', 'IdP metadata updated'],
  ];
  return (
    <AppFrame active="Audit Log">
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.line0}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Chip>Actor: all</Chip>
        <Chip>Entity: H-*</Chip>
        <Chip>Action: all</Chip>
        <Chip variant="active">Last 24h</Chip>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn size="sm">Export CSV</Btn>
          <Btn size="sm">Export JSON</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: 'calc(100% - 45px)' }}>
        <div style={{ overflow: 'auto', padding: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: t.bg1 }}>{['Time','Actor','Entity','Action','Detail'].map((c)=> <th key={c} style={{ textAlign: 'left', padding: '8px 10px', color: t.text2, fontWeight: 500, borderBottom: `1px solid ${t.line0}`, fontFamily: window.FONT.mono, fontSize: 11 }}>{c}</th>)}</tr></thead>
            <tbody>
              {events.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.line0}`, background: i===0?t.bg2:'transparent' }}>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.text2 }}>{row[0]}</td>
                  <td style={{ padding: '8px 10px', color: t.text0 }}>{row[1]}</td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.accent }}>{row[2]}</td>
                  <td style={{ padding: '8px 10px', fontFamily: window.FONT.mono, color: t.text1 }}>{row[3]}</td>
                  <td style={{ padding: '8px 10px', color: t.text1 }}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside style={{ borderLeft: `1px solid ${t.line0}`, padding: 16, background: t.bg1, overflow: 'auto' }}>
          <div style={{ fontSize: 12, color: t.text2 }}>Selected event</div>
          <div style={{ fontSize: 14, color: t.text0, fontWeight: 600, margin: '4px 0 10px' }}>H-2087 · transition</div>
          <Card pad={10}><SectionTitle>Diff</SectionTitle><WBlock h={140} dashed label="before → after · field-level diff" /></Card>
          <Card pad={10} style={{ marginTop: 10 }}><SectionTitle>Context</SectionTitle><WBlock h={80} label="ip · ua · session · request id" /></Card>
        </aside>
      </div>
    </AppFrame>
  );
}

// ─── Auth + Security ─────────────────────────────────────────────────
function WFAuth() {
  const { t } = useTheme();
  const Box = ({ title, children, w = 280 }) => (
    <div style={{ width: w, padding: 18, background: t.bg1, border: `1px solid ${t.line1}`, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo /><span style={{ fontWeight: 600, color: t.text0 }}>THMP</span></div>
      <div style={{ fontSize: 16, fontWeight: 600, color: t.text0 }}>{title}</div>
      {children}
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, fontFamily: window.FONT.sans, alignItems: 'start', overflow: 'auto' }}>
      <Box title="Sign in">
        <WBlock h={36} label="email" />
        <WBlock h={36} label="password" />
        <Btn variant="primary">Continue</Btn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.text3 }}><div style={{ flex: 1, height: 1, background: t.line1 }} />or<div style={{ flex: 1, height: 1, background: t.line1 }} /></div>
        <Btn>Continue with SSO →</Btn>
      </Box>
      <Box title="SSO redirect">
        <WBlock h={36} label="workspace · falcon" />
        <Btn variant="primary">Continue with Okta</Btn>
        <div style={{ fontSize: 11, color: t.text3 }}>You'll be redirected to your identity provider.</div>
      </Box>
      <Box title="MFA challenge">
        <div style={{ fontSize: 12, color: t.text2 }}>Enter the 6-digit code from your authenticator.</div>
        <div style={{ display: 'flex', gap: 6 }}>{Array.from({length:6}).map((_,i)=> <div key={i} style={{ flex: 1, height: 40, background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 6 }} />)}</div>
        <Btn variant="primary">Verify</Btn>
        <div style={{ fontSize: 11, color: t.text3 }}>Lost device? Use a recovery key.</div>
      </Box>
      <Box title="Session refresh">
        <WBlock h={50} label="we'll keep you signed in for 12h · session token rotated" />
        <Btn>Continue</Btn>
        <Btn variant="ghost">Sign out</Btn>
      </Box>
      <Box title="MFA setup">
        <div style={{ fontSize: 12, color: t.text2 }}>Scan with your authenticator app.</div>
        <WBlock h={120} label="QR code" />
        <WBlock h={36} label="enter code" />
        <Btn variant="primary">Confirm & save recovery codes</Btn>
      </Box>
      <Box title="Forbidden · 403">
        <div style={{ fontSize: 12, color: t.text1 }}>This page needs <b style={{color:t.text0}}>Hunt Lead</b>. You're signed in as Analyst.</div>
        <Btn>Request access</Btn>
        <Btn variant="ghost">Go to dashboard</Btn>
      </Box>
      <Box title="Session expired">
        <div style={{ fontSize: 12, color: t.text1 }}>For your security we signed you out after 12h of inactivity.</div>
        <Btn variant="primary">Sign in again</Btn>
      </Box>
      <Box title="Account locked">
        <div style={{ fontSize: 12, color: t.text1 }}>Too many failed attempts. Locked for 15 min.</div>
        <Btn variant="ghost">Contact admin</Btn>
      </Box>
    </div>
  );
}

Object.assign(window, {
  WFDashboard, WFHypothesisList, WFHypothesisDetail, WFHypothesisCreate, WFHuntBoard,
  WFEvidence, WFAttack, WFIntegrations, WFReports, WFAudit, WFAuth,
});
