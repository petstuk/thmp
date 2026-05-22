// hifi-hunt.jsx — High-fidelity Hunt Board (Kanban).

function HiHuntCard({ h, dragging = false, highlight = false }) {
  const { t } = useTheme();
  const techs = window.TECHNIQUES.slice(h.id.charCodeAt(2) % 5, h.id.charCodeAt(2) % 5 + Math.min(3, h.techCount));
  return (
    <div style={{
      padding: 12, background: t.bg2,
      border: `1px solid ${dragging ? t.accent : highlight ? t.accentLine : t.line1}`,
      boxShadow: dragging
        ? `0 16px 36px rgba(0,0,0,0.45), 0 0 0 2px ${t.accentDim}`
        : `0 1px 0 ${t.line0}`,
      borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10,
      transform: dragging ? 'rotate(-1.2deg) translateY(-2px) scale(1.02)' : 'none',
      cursor: dragging ? 'grabbing' : 'grab', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: window.FONT.mono, color: t.accent, fontSize: 11,
          padding: '1px 5px', background: t.accentDim, borderRadius: 3,
        }}>{h.id}</span>
        <SevBadge sev={h.sev} />
        <div style={{ marginLeft: 'auto', color: t.text3, fontFamily: window.FONT.mono, fontSize: 10.5 }}>{h.updated}</div>
      </div>
      <div style={{ fontSize: 12.5, color: t.text0, lineHeight: 1.4, fontWeight: 500, textWrap: 'pretty' }}>{h.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {techs.map((tt) => (
          <span key={tt.id} style={{
            fontFamily: window.FONT.mono, fontSize: 10, color: t.text2,
            padding: '2px 5px', background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 3,
          }}>{tt.id}</span>
        ))}
        {h.techCount > techs.length && (
          <span style={{ fontFamily: window.FONT.mono, fontSize: 10, color: t.text3, padding: '2px 5px' }}>+{h.techCount - techs.length}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: `1px solid ${t.line0}` }}>
        {h.owner === '—' ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1px dashed ${t.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text3, fontSize: 11 }}>?</div>
        ) : (
          <Avatar initials={h.owner.slice(0,2).toUpperCase()} size={22} color={window.ROLES.analyst.color + '33'} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: t.text2, fontSize: 11, fontFamily: window.FONT.mono }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="3" height="3" stroke="currentColor" strokeWidth="1.2" /><rect x="7.5" y="1.5" width="3" height="3" stroke="currentColor" strokeWidth="1.2" /><rect x="1.5" y="7.5" width="3" height="3" stroke="currentColor" strokeWidth="1.2" /><rect x="7.5" y="7.5" width="3" height="3" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.4"/></svg>
          {h.techCount}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: t.text2, fontSize: 11, fontFamily: window.FONT.mono }}>
          <svg width="10" height="11" viewBox="0 0 10 12" fill="none"><path d="M1 1.5 H6 L9 4.5 V10.5 H1 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6 1.5 V4.5 H9" stroke="currentColor" strokeWidth="1.2" /></svg>
          {h.evCount}
        </div>
        {h.evCount > 8 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontFamily: window.FONT.mono, color: t.stValidated }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.stValidated }} /> supported
          </span>
        )}
      </div>
    </div>
  );
}

function HiHuntColumn({ name, color, items, dragHintIndex = null, isDropTarget = false, count }) {
  const { t } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 10px',
        background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 8,
        borderBottom: `2px solid ${color}`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text0 }}>{name}</span>
        <span style={{ marginLeft: 6, fontFamily: window.FONT.mono, fontSize: 11, color: t.text3, padding: '1px 6px', background: t.bg2, borderRadius: 999 }}>{count}</span>
        <span style={{ marginLeft: 'auto', color: t.text3, fontSize: 13, cursor: 'default' }}>+</span>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 6, borderRadius: 8, minHeight: 200,
        background: isDropTarget ? t.accentDim : 'transparent',
        border: `1px dashed ${isDropTarget ? t.accentLine : 'transparent'}`,
        transition: 'background .12s',
      }}>
        {items.map((node, i) => (
          <React.Fragment key={i}>
            {dragHintIndex === i && (
              <div style={{ height: 4, background: t.accent, borderRadius: 2, opacity: 0.6 }} />
            )}
            {node}
          </React.Fragment>
        ))}
        {dragHintIndex === items.length && (
          <div style={{ height: 4, background: t.accent, borderRadius: 2, opacity: 0.6 }} />
        )}
      </div>
    </div>
  );
}

function HiHuntBoard() {
  const { t } = useTheme();
  const H = window.HYPOTHESES;
  // Bucket the seeded hypotheses across columns
  const buckets = {
    Draft:     [H[7]],
    Active:    [H[1], H[5], H[6]],
    'In Hunt': [H[0], H[2], H[8], H[9]],
    Validated: [H[3]],
    Closed:    [],
  };
  const colors = {
    Draft: t.stDraft, Active: t.stActive, 'In Hunt': t.stInHunt,
    Validated: t.stValidated, Closed: t.stClosed,
  };

  return (
    <AppFrame active="Hunt Board">
      {/* Sub-toolbar */}
      <div style={{
        padding: '10px 18px', borderBottom: `1px solid ${t.line0}`,
        display: 'flex', alignItems: 'center', gap: 10, background: t.bg0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text0 }}>Hunt Board</h1>
          <span style={{ color: t.text3, fontFamily: window.FONT.mono, fontSize: 11 }}>· 9 cards</span>
        </div>
        <div style={{ width: 1, height: 18, background: t.line1, margin: '0 6px' }} />
        <Chip variant="active" icon={<span style={{ width: 5, height: 5, borderRadius: 1, background: t.accent }} />}>My board</Chip>
        <Chip>Severity ≥ Medium</Chip>
        <Chip>Tactic: any</Chip>
        <Chip variant="ghost">+ Filter</Chip>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Btn size="sm">Group: Status ⌄</Btn>
          <Btn size="sm">Swimlanes</Btn>
          <div style={{ width: 1, height: 18, background: t.line1, margin: '0 4px' }} />
          <Btn size="sm" variant="primary">+ New hypothesis</Btn>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10,
        padding: 14, height: 'calc(100% - 47px)', overflow: 'auto',
      }}>
        <HiHuntColumn name="Draft" color={colors.Draft} count={buckets.Draft.length}
          items={buckets.Draft.map((h) => <HiHuntCard key={h.id} h={h} />)} />

        <HiHuntColumn name="Active" color={colors.Active} count={buckets.Active.length}
          items={buckets.Active.map((h, i) => <HiHuntCard key={h.id} h={h} highlight={i===0} />)} />

        <HiHuntColumn name="In Hunt" color={colors['In Hunt']} count={buckets['In Hunt'].length}
          isDropTarget={true} dragHintIndex={2}
          items={[
            ...buckets['In Hunt'].slice(0, 2).map((h) => <HiHuntCard key={h.id} h={h} />),
            <HiHuntCard key="ghost" h={buckets.Active[0]} dragging />,
            ...buckets['In Hunt'].slice(2).map((h) => <HiHuntCard key={h.id} h={h} />),
          ]} />

        <HiHuntColumn name="Validated" color={colors.Validated} count={buckets.Validated.length}
          items={buckets.Validated.map((h) => <HiHuntCard key={h.id} h={h} />)} />

        <HiHuntColumn name="Closed" color={colors.Closed} count={buckets.Closed.length}
          items={[
            <div key="empty" style={{
              padding: '32px 14px', textAlign: 'center', borderRadius: 6,
              border: `1px dashed ${t.line1}`, color: t.text3, fontSize: 11.5, lineHeight: 1.5,
            }}>
              No closed hypotheses<br/><span style={{ color: t.text3, fontFamily: window.FONT.mono, fontSize: 10.5 }}>drag here to close</span>
            </div>
          ]} />
      </div>

      {/* Transition modal (anchored, looks open) */}
      <HiTransitionModal />
    </AppFrame>
  );
}

function HiTransitionModal() {
  const { t } = useTheme();
  return (
    <div style={{
      position: 'absolute', right: 30, top: 80, width: 360,
      background: t.bg1, border: `1px solid ${t.line2}`, borderRadius: 10,
      boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px ${t.line0}`,
      padding: 16, fontFamily: window.FONT.sans, fontSize: 13, color: t.text1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: window.FONT.mono, color: t.accent, fontSize: 11 }}>H-2086</span>
        <span style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text3 }}>·</span>
        <span style={{ fontSize: 12, color: t.text0, fontWeight: 600 }}>Transition required</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 14px' }}>
        <StatusBadge status="active" />
        <svg width="14" height="10" viewBox="0 0 14 10"><path d="M1 5 H11 M8 2 L11 5 L8 8" stroke={t.text2} strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
        <StatusBadge status="in-hunt" />
      </div>
      <div style={{ fontSize: 11.5, color: t.text2, marginBottom: 6 }}>
        Why are you transitioning this hypothesis? <span style={{ color: t.sevCritical }}>*</span>
      </div>
      <div style={{
        padding: 10, background: t.bg0, border: `1.5px solid ${t.accent}`,
        boxShadow: `0 0 0 3px ${t.accentDim}`, borderRadius: 6, fontSize: 12.5, color: t.text0, minHeight: 78,
      }}>
        Beaconing pattern matches DragonGate IoCs — pulling LSASS + RDP telemetry across finance OU for last 7d.<span style={{ background: t.accent, width: 1, display: 'inline-block', height: '1em', verticalAlign: '-2px', marginLeft: 1 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11, color: t.text3, fontFamily: window.FONT.mono }}>140 / 500</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="ghost">Cancel</Btn>
          <Btn size="sm" variant="primary">Transition →</Btn>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: 8, borderRadius: 6, background: t.bg2, border: `1px solid ${t.line0}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.sevHigh }} />
        <span style={{ fontSize: 11, color: t.text2 }}>This action is recorded to audit log.</span>
      </div>
    </div>
  );
}

Object.assign(window, { HiHuntBoard });
