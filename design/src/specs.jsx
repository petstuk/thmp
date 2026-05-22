// specs.jsx — interaction specifications:
// state transitions, conflict handling, evidence versioning, loading/empty/error.

function ABStateMachine() {
  const { t } = useTheme();
  const Node = ({ label, color, x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-50" y="-18" width="100" height="36" rx="6" fill={t.bg1} stroke={color} strokeWidth="1.5" />
      <text x="0" y="5" textAnchor="middle" fontFamily={window.FONT.sans} fontSize="12" fill={t.text0} fontWeight="500">{label}</text>
      <circle cx="-38" cy="0" r="3" fill={color} />
    </g>
  );
  const Arrow = ({ from, to, label, role, mid, dashed = false }) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const fromAdj = { x: from.x + ux * 52, y: from.y + uy * 22 };
    const toAdj = { x: to.x - ux * 52, y: to.y - uy * 22 };
    const labelPos = mid || { x: (from.x + to.x)/2, y: (from.y + to.y)/2 };
    return (
      <g>
        <line x1={fromAdj.x} y1={fromAdj.y} x2={toAdj.x} y2={toAdj.y}
          stroke={t.line2} strokeWidth="1.3" strokeDasharray={dashed ? '4 3' : ''}
          markerEnd="url(#arrow)" />
        <rect x={labelPos.x - 50} y={labelPos.y - 18} width="100" height="32" rx="4" fill={t.bg0} stroke={t.line1} />
        <text x={labelPos.x} y={labelPos.y - 4} textAnchor="middle" fontSize="10.5" fontFamily={window.FONT.mono} fill={t.text1}>{label}</text>
        <text x={labelPos.x} y={labelPos.y + 8} textAnchor="middle" fontSize="9.5" fontFamily={window.FONT.mono} fill={t.text3}>{role}</text>
      </g>
    );
  };
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, fontFamily: window.FONT.sans, color: t.text1 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: t.text0, fontWeight: 600 }}>Status transitions</h2>
      <p style={{ margin: '0 0 18px', fontSize: 12.5, color: t.text2, maxWidth: 780, lineHeight: 1.5 }}>
        Every transition <b>requires a typed rationale</b> (min 20 char) and is RBAC-gated. Reasons are stored as immutable events and surface in the status timeline + audit log.
      </p>
      <div style={{ background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 8, padding: 14 }}>
        <svg viewBox="0 0 1100 360" style={{ width: '100%', height: 360 }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={t.line2} />
            </marker>
          </defs>
          <Node label="Draft"     color={t.stDraft}     x={90}  y={180} />
          <Node label="Active"    color={t.stActive}    x={300} y={180} />
          <Node label="In Hunt"   color={t.stInHunt}    x={520} y={180} />
          <Node label="Validated" color={t.stValidated} x={740} y={120} />
          <Node label="Closed"    color={t.stClosed}    x={740} y={240} />
          <Node label="Archived"  color={t.stArchived}  x={960} y={180} />

          <Arrow from={{x:90,y:180}}  to={{x:300,y:180}} label="submit"     role="Analyst+" />
          <Arrow from={{x:300,y:180}} to={{x:520,y:180}} label="start hunt" role="Analyst+" />
          <Arrow from={{x:520,y:180}} to={{x:740,y:120}} label="validate"   role="Hunt Lead+" />
          <Arrow from={{x:520,y:180}} to={{x:740,y:240}} label="close"      role="Analyst+" />
          <Arrow from={{x:740,y:120}} to={{x:960,y:180}} label="archive"    role="Manager+" />
          <Arrow from={{x:740,y:240}} to={{x:960,y:180}} label="archive"    role="Manager+" />
          <Arrow from={{x:300,y:180}} to={{x:90,y:180}}  label="re-draft"   role="Analyst+" mid={{x:195,y:218}} dashed />
          <Arrow from={{x:520,y:180}} to={{x:300,y:180}} label="pause hunt" role="Analyst+" mid={{x:410,y:218}} dashed />
        </svg>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle>Mandatory rationale</SectionTitle>
          <p style={{ margin: 0, fontSize: 12, color: t.text1, lineHeight: 1.55 }}>
            Modal pinned to triggering action. Min 20 chars. Required for every transition (including reverse).
            Stored as <span style={{ fontFamily: window.FONT.mono, color: t.accent }}>StatusEvent</span> on the hypothesis timeline.
          </p>
        </Card>
        <Card>
          <SectionTitle>RBAC enforcement</SectionTitle>
          <p style={{ margin: 0, fontSize: 12, color: t.text1, lineHeight: 1.55 }}>
            Action surfaces (button, drag target, kebab item) check role pre-render. If insufficient: disabled state with tooltip <span style={{ fontFamily: window.FONT.mono, color: t.text2 }}>"Requires Hunt Lead+"</span> and a "Request" link.
          </p>
        </Card>
        <Card>
          <SectionTitle>Reverse transitions</SectionTitle>
          <p style={{ margin: 0, fontSize: 12, color: t.text1, lineHeight: 1.55 }}>
            <b style={{ color: t.text0 }}>Active → Draft</b> and <b style={{ color: t.text0 }}>In Hunt → Active</b> are allowed.
            <b style={{ color: t.text0 }}> Validated → *</b> is <span style={{ color: t.sevCritical }}>locked</span>; reopening creates a child hypothesis with backref.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ABConflict() {
  const { t } = useTheme();
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, fontFamily: window.FONT.sans, color: t.text1 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: t.text0, fontWeight: 600 }}>Concurrent edit · conflict UX</h2>
      <p style={{ margin: '0 0 18px', fontSize: 12.5, color: t.text2, maxWidth: 780, lineHeight: 1.5 }}>
        Two users on the same hypothesis. Live presence + field-level lock. On save conflict, diff modal lets the user accept, reject or merge.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
        {/* Presence banner */}
        <Card>
          <SectionTitle>Live presence banner</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: `${t.sevHigh}15`, border: `1px solid ${t.sevHigh}55`, borderRadius: 6 }}>
            <Avatar initials="MR" size={22} color={window.ROLES.huntLead.color + '44'} />
            <div style={{ fontSize: 12, color: t.text0, flex: 1 }}>
              <b>M. Reyes</b> is also editing this hypothesis.
              <div style={{ color: t.text2, fontSize: 11 }}>Currently in <span style={{ fontFamily: window.FONT.mono }}>Description</span> · started 2m ago</div>
            </div>
            <Btn size="sm" variant="ghost">View live</Btn>
          </div>
          <SectionTitle hint="field-level cursor">Field lock</SectionTitle>
          <div style={{ padding: 10, background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 6, color: t.text2, fontSize: 12 }}>
            Description
            <div style={{ marginTop: 6, padding: 8, background: t.bg1, border: `1.5px dashed ${t.sevHigh}88`, borderRadius: 4, fontFamily: window.FONT.mono, fontSize: 11.5, color: t.text1, position: 'relative' }}>
              Spearphishing campaign…
              <span style={{ position: 'absolute', top: -8, right: 8, fontSize: 10, background: t.sevHigh, color: t.bg0, padding: '1px 6px', borderRadius: 999, fontWeight: 600, fontFamily: window.FONT.sans }}>MR is here</span>
            </div>
          </div>
        </Card>

        {/* Diff modal */}
        <Card>
          <SectionTitle hint="on save conflict">Diff modal</SectionTitle>
          <div style={{ background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.sevHigh }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text0 }}>Your change conflicts with another save</div>
              <div style={{ marginLeft: 'auto', fontFamily: window.FONT.mono, fontSize: 11, color: t.text3 }}>H-2087 · v12 → v13</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Avatar initials="MR" size={18} />
                  <span style={{ fontSize: 12, color: t.text0, fontWeight: 500 }}>M. Reyes</span>
                  <span style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>1m ago</span>
                </div>
                <div style={{ padding: 10, background: `${t.sevHigh}10`, border: `1px solid ${t.sevHigh}55`, borderRadius: 6, fontSize: 11.5, fontFamily: window.FONT.mono, color: t.text1, lineHeight: 1.6 }}>
                  Severity: <span style={{ background: `${t.sevHigh}33`, color: t.sevHigh, padding: '1px 3px' }}>High</span><br/>
                  Owner: <span style={{ background: `${t.sevHigh}33`, color: t.sevHigh, padding: '1px 3px' }}>reyes</span><br/>
                  Description: …loader to <span style={{ background: `${t.sevHigh}33`, color: t.sevHigh, padding: '1px 3px' }}>finance OU</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Avatar initials="KO" size={18} />
                  <span style={{ fontSize: 12, color: t.text0, fontWeight: 500 }}>You</span>
                  <span style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>now</span>
                </div>
                <div style={{ padding: 10, background: `${t.stValidated}10`, border: `1px solid ${t.stValidated}55`, borderRadius: 6, fontSize: 11.5, fontFamily: window.FONT.mono, color: t.text1, lineHeight: 1.6 }}>
                  Severity: <span style={{ background: `${t.stValidated}33`, color: t.stValidated, padding: '1px 3px' }}>Critical</span><br/>
                  Owner: <span style={{ background: `${t.stValidated}33`, color: t.stValidated, padding: '1px 3px' }}>kowalski</span><br/>
                  Description: …loader to <span style={{ background: `${t.stValidated}33`, color: t.stValidated, padding: '1px 3px' }}>finance staff</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: t.text2 }}>Pick a side per field, or:</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Btn size="sm" variant="ghost">Discard mine</Btn>
                <Btn size="sm">Keep both (fork)</Btn>
                <Btn size="sm" variant="primary">Merge selected</Btn>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ABStates() {
  const { t } = useTheme();
  const Sample = ({ title, children }) => (
    <Card pad={0}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.line0}`, fontSize: 11.5, color: t.text2, fontFamily: window.FONT.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      <div style={{ padding: 14, minHeight: 140 }}>{children}</div>
    </Card>
  );
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, fontFamily: window.FONT.sans, color: t.text1, overflow: 'auto' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: t.text0, fontWeight: 600 }}>Loading · empty · error</h2>
      <p style={{ margin: '0 0 18px', fontSize: 12.5, color: t.text2, maxWidth: 780, lineHeight: 1.5 }}>
        Every table, board, side panel, and detail pane ships with these four states. No fallback or mock data in production paths — design for real API responses.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Sample title="Loading · skeleton">
          {[60, 90, 40, 75, 55].map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 22, height: 14, background: `linear-gradient(90deg, ${t.bg2}, ${t.bg3}, ${t.bg2})`, backgroundSize: '200% 100%', borderRadius: 4 }} />
              <div style={{ width: `${w}%`, height: 14, background: `linear-gradient(90deg, ${t.bg2}, ${t.bg3}, ${t.bg2})`, backgroundSize: '200% 100%', borderRadius: 4 }} />
            </div>
          ))}
        </Sample>
        <Sample title="Empty · first-run">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: t.bg2, border: `1px dashed ${t.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text3 }}>∅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text0 }}>No hypotheses yet</div>
            <div style={{ fontSize: 11.5, color: t.text2, lineHeight: 1.5 }}>Promote an intel report from the queue, or start one from scratch.</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Btn size="sm" variant="primary">+ New hypothesis</Btn>
              <Btn size="sm">From intel report</Btn>
            </div>
          </div>
        </Sample>
        <Sample title="Empty · filtered">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text0 }}>No matches</div>
            <div style={{ fontSize: 11.5, color: t.text2 }}>Try widening severity or removing date range.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Chip>Sev: High+</Chip><Chip>Last 24h</Chip>
            </div>
            <Btn size="sm" variant="ghost">Clear filters</Btn>
          </div>
        </Sample>
        <Sample title="Error · retryable">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.sevCritical }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text0 }}>Couldn't load evidence</div>
            </div>
            <div style={{ fontSize: 11.5, color: t.text2 }}>Splunk connector returned 502 · last sync 4m ago</div>
            <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3, background: t.bg2, padding: '4px 6px', borderRadius: 4, border: `1px solid ${t.line0}` }}>req_id: 8a2e…</div>
            <div style={{ display: 'flex', gap: 6 }}><Btn size="sm">Retry</Btn><Btn size="sm" variant="ghost">Details</Btn></div>
          </div>
        </Sample>

        <Sample title="Evidence · immutable version">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['v3', 'kowalski', 'now', true],
              ['v2', 'kowalski', '1h ago'],
              ['v1', 'reyes',    '3h ago'],
            ].map(([v, who, when, cur]) => (
              <div key={v} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 8, padding: '6px 8px', background: cur?t.bg2:'transparent', borderRadius: 4, border: `1px solid ${cur?t.line1:t.line0}` }}>
                <span style={{ fontFamily: window.FONT.mono, color: cur?t.accent:t.text2, fontSize: 11.5, fontWeight: 600 }}>{v}</span>
                <div style={{ fontSize: 11.5, color: t.text1 }}>{who} <span style={{ color: t.text3, fontFamily: window.FONT.mono }}>· {when}</span></div>
                <span style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>diff →</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: t.text3, marginTop: 4, lineHeight: 1.4 }}>Edits create a <b style={{ color: t.text0 }}>new version</b>; previous ones remain visible & exportable.</div>
          </div>
        </Sample>

        <Sample title="403 · unauthorized">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text0 }}>Hunt Lead role required</div>
            <div style={{ fontSize: 11.5, color: t.text2, lineHeight: 1.5 }}>
              You're signed in as <b style={{ color: t.text0 }}>Analyst</b>. This action transitions a hypothesis to <b style={{ color: t.stValidated }}>Validated</b>.
            </div>
            <div style={{ display: 'flex', gap: 6 }}><Btn size="sm" variant="primary">Request access</Btn><Btn size="sm" variant="ghost">Go back</Btn></div>
          </div>
        </Sample>

        <Sample title="Network · offline">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: t.sevHigh }} /><div style={{ fontSize: 13, color: t.text0, fontWeight: 600 }}>Reconnecting…</div></div>
            <div style={{ fontSize: 11.5, color: t.text2 }}>Your edits are saved locally and will sync when connection returns.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.text3, fontFamily: window.FONT.mono }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, border: `1.5px solid ${t.accent}`, borderTopColor: 'transparent' }} />
              attempt 3 · backoff 4s
            </div>
          </div>
        </Sample>

        <Sample title="Bulk action · destructive">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: t.text0, fontWeight: 600 }}>Archive 14 hypotheses?</div>
            <div style={{ fontSize: 11.5, color: t.text2, lineHeight: 1.5 }}>They will be removed from active views but remain in the audit log and exports.</div>
            <div style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text1, padding: 6, background: t.bg2, borderRadius: 4 }}>type <b style={{ color: t.sevCritical }}>archive</b> to confirm</div>
            <div style={{ display: 'flex', gap: 6 }}><Btn size="sm" variant="danger">Archive 14</Btn><Btn size="sm" variant="ghost">Cancel</Btn></div>
          </div>
        </Sample>
      </div>
    </div>
  );
}

Object.assign(window, { ABStateMachine, ABConflict, ABStates });
