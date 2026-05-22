// journeys.jsx — three key user journeys as horizontal flow diagrams.

function JourneyFlow({ title, role, summary, steps, kpi }) {
  const { t } = useTheme();
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, fontFamily: window.FONT.sans, color: t.text1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 18, flex: '0 0 auto' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, letterSpacing: '0.12em', color: t.accent, textTransform: 'uppercase', marginBottom: 6 }}>{role}</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: t.text0, letterSpacing: '-0.01em' }}>{title}</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: t.text2, maxWidth: 720, lineHeight: 1.5 }}>{summary}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {kpi.map((k, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 10px', background: t.bg2, border: `1px solid ${t.line1}`, borderRadius: 4 }}>
              <span style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text2 }}>{k.label}</span>
              <span style={{ fontFamily: window.FONT.mono, fontSize: 13, color: t.text0, fontWeight: 600 }}>{k.value}</span>
            </div>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 0, position: 'relative' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                background: s.highlight ? t.accentDim : t.bg1,
                border: `1px solid ${s.highlight ? t.accentLine : t.line1}`,
                borderRadius: 8, padding: 14, flex: 1,
                display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: s.highlight ? t.accent : t.bg3, color: s.highlight ? t.bg0 : t.text0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: window.FONT.mono, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text0, flex: 1 }}>{s.name}</div>
                </div>
                <div style={{ fontSize: 11, color: t.text2, lineHeight: 1.5, flex: 1 }}>{s.what}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: `1px dashed ${t.line1}` }}>
                  <div style={{ fontFamily: window.FONT.mono, fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screen</div>
                  <div style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text1 }}>{s.screen}</div>
                </div>
                {s.signal && (
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: '2px 6px', background: t.bg0, border: `1px solid ${t.line1}`, borderRadius: 3, fontFamily: window.FONT.mono, fontSize: 10, color: t.text2 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.signalColor || t.accent }} />
                    {s.signal}
                  </div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 18px' }}>
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                  <path d="M1 7 H15 M11 3 L15 7 L11 11" stroke={t.line2} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ABJourney1() {
  return (
    <JourneyFlow
      title="New hypothesis from intel ingestion"
      role="Threat Intel Analyst → SOC Analyst"
      summary="A Mandiant feed delivers a campaign report. TI triages it into the ingestion queue, promotes it to a hypothesis with auto-suggested ATT&CK techniques, and assigns to a hunter."
      kpi={[{ label: 'Time to first hyp', value: '< 5 min' }, { label: 'Steps', value: '6' }]}
      steps={[
        { name: 'Feed delivers report', what: 'Connector pulls a STIX bundle. Bell badge surfaces a new ingestion item.', screen: 'Bell · Integrations queue', signal: 'auto' },
        { name: 'Triage in queue', what: 'TI opens the queue, reads the report, flags it as a candidate.', screen: 'Integrations · ingestion queue', signal: 'manual' },
        { name: 'Promote to hypothesis', what: 'One-click "Create from intel" prefills title, description, source.', screen: 'Hypothesis · create', highlight: true, signal: 'auto-prefill' },
        { name: 'Accept ATT&CK suggestions', what: 'Model proposes 5 techniques; analyst accepts 4, edits one, rejects one.', screen: 'ATT&CK picker', highlight: true, signal: 'AI-assist', signalColor: '#B68CFF' },
        { name: 'Assign owner + severity', what: 'Routes to on-shift hunter; severity = High; status → Active.', screen: 'Hypothesis detail', signal: 'manual' },
        { name: 'Notify hunter', what: 'Owner gets bell notification with deep link; appears on their Hunt Board.', screen: 'Hunt Board · Active', signal: 'event' },
      ]}
    />
  );
}

function ABJourney2() {
  return (
    <JourneyFlow
      title="Hunt execution to validated finding"
      role="SOC Analyst (Hunt Lead approves)"
      summary="Hunter picks up an Active hypothesis, runs queries, attaches evidence, decides support/refute, and transitions to Validated with a mandatory rationale."
      kpi={[{ label: 'Median hunt', value: '~3h' }, { label: 'Evidence per hyp', value: '4-12' }]}
      steps={[
        { name: 'Pick from board', what: 'Analyst drags card to "In Hunt" column. Mandatory transition reason captured.', screen: 'Hunt Board', signal: 'drag · reason' },
        { name: 'Run SIEM queries', what: 'Side panel composes Splunk/Sentinel query; results saved as a versioned evidence record.', screen: 'Evidence · query link', highlight: true, signal: 'SIEM' },
        { name: 'Extract IOCs', what: 'Paste raw text; system parses hashes, IPs, domains; weights & flags support/refute.', screen: 'Evidence · IOC parse', highlight: true, signal: 'auto-extract' },
        { name: 'Score confidence', what: 'Scoring panel rolls up evidence weights; analyst sees signal vs noise live.', screen: 'Hypothesis · scoring', signal: 'derived' },
        { name: 'Comment + tag', what: 'Threaded discussion with @ mentions. Hunt Lead pings second opinion.', screen: 'Hypothesis · activity', signal: 'collab' },
        { name: 'Transition → Validated', what: 'Hunt Lead approves transition with rationale. Hypothesis locks for edits; report-ready.', screen: 'Hunt Board · Validated', highlight: true, signal: 'gated · RBAC', signalColor: '#5EC79A' },
      ]}
    />
  );
}

function ABJourney3() {
  return (
    <JourneyFlow
      title="ATT&CK coverage review & quarterly report"
      role="Manager"
      summary="Quarterly governance loop: scan ATT&CK matrix for coverage gaps, identify under-hunted tactics, generate a Coverage report to brief leadership."
      kpi={[{ label: 'Cadence', value: 'Quarterly' }, { label: 'Output', value: 'PDF · STIX' }]}
      steps={[
        { name: 'Open Navigator', what: 'Filter to last quarter, exclude Draft, include all severities. Heatmap renders.', screen: 'ATT&CK Navigator', signal: 'filter' },
        { name: 'Spot gaps', what: 'Red-tinted cells = 0 hypotheses. Manager hovers Lateral Movement column, sees 3 gaps.', screen: 'Navigator · gap mode', highlight: true, signal: 'gaps' },
        { name: 'Open under-hunted tactic', what: 'Click cell → drawer lists all hypotheses + assignees for that technique.', screen: 'Navigator · cell drawer', signal: 'drill' },
        { name: 'Generate Coverage report', what: 'Reports → "Coverage by tactic" template. Branding from workspace theme.', screen: 'Reports · generate', highlight: true, signal: 'job' },
        { name: 'Review draft + export', what: 'Manager reviews PDF preview, edits exec summary inline, exports PDF + STIX.', screen: 'Reports · preview', signal: 'export' },
        { name: 'Share + archive', what: 'Job logged to history. Audit Log records who exported what + when.', screen: 'Reports · history', signal: 'audit' },
      ]}
    />
  );
}

Object.assign(window, { JourneyFlow, ABJourney1, ABJourney2, ABJourney3 });
