// app.jsx — top-level: wires DesignCanvas + theme/role tweaks together.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": true,
  "role": "analyst"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const mode = t.dark ? 'dark' : 'light';
  const theme = window.THEME[mode];
  const role  = t.role;

  // Match the canvas background to the active theme — looks intentional and
  // keeps cards readable in light mode too.
  React.useEffect(() => {
    document.documentElement.style.background = t.dark ? '#0a0c10' : '#eceff3';
    document.body.style.background = t.dark ? '#0a0c10' : '#eceff3';
  }, [t.dark]);

  return (
    <ThemeCtx.Provider value={{ t: theme, mode, role }}>
      <DesignCanvas bg={t.dark ? '#0a0c10' : '#eceff3'} grid={t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}>
        {/* ─── Cover + Foundations ─── */}
        <DCSection id="cover" title="THMP · Design System" subtitle="Threat Hypothesis Management Platform — dark-first enterprise SOC workspace. Lo-fi for breadth, hi-fi where it counts.">
          <DCArtboard id="cover"    label="Cover"          width={1280} height={760}><ABCover eyebrow="THMP" title="Hunt the hypothesis, not the alert." kicker="A workspace for SOC analysts to track threat hypotheses from intake through hunt, evidence, ATT&CK mapping, and reporting. Dark-first. Keyboard-first. Audit-grade." /></DCArtboard>
          <DCArtboard id="tokens"   label="Color tokens"   width={1280} height={760}><ABColorTokens /></DCArtboard>
          <DCArtboard id="type"     label="Type & spacing" width={1280} height={760}><ABTypeScale /></DCArtboard>
          <DCArtboard id="comps"    label="Components"     width={1280} height={760}><ABComponents /></DCArtboard>
        </DCSection>

        {/* ─── Information Architecture ─── */}
        <DCSection id="ia" title="Information Architecture" subtitle="9 top-level destinations. Role-based visibility. Global ⌘K command palette spans every entity.">
          <DCArtboard id="sitemap"  label="Sitemap"             width={1480} height={760}><ABSitemap /></DCArtboard>
          <DCArtboard id="roles"    label="Role-based nav"      width={1280} height={760}><ABRoleMatrix /></DCArtboard>
        </DCSection>

        {/* ─── Journeys ─── */}
        <DCSection id="journeys" title="Key user journeys" subtitle="Three end-to-end flows the design needs to make fast and obvious.">
          <DCArtboard id="j1" label="01 · Intel → hypothesis"        width={1480} height={620}><ABJourney1 /></DCArtboard>
          <DCArtboard id="j2" label="02 · Hunt → validated"          width={1480} height={620}><ABJourney2 /></DCArtboard>
          <DCArtboard id="j3" label="03 · Coverage review → report"  width={1480} height={620}><ABJourney3 /></DCArtboard>
        </DCSection>

        {/* ─── Lo-fi wireframes (all 10 core screens) ─── */}
        <DCSection id="wireframes" title="Wireframes · core screens" subtitle="Lo-fi layouts for every screen named in the spec. Structure & data shape are committed; visual treatment is hi-fi'd elsewhere.">
          <DCArtboard id="wf-dash"     label="01 · Dashboard"               width={1440} height={900}><WFDashboard /></DCArtboard>
          <DCArtboard id="wf-list"     label="02 · Hypothesis list"         width={1440} height={900}><WFHypothesisList /></DCArtboard>
          <DCArtboard id="wf-detail"   label="03 · Hypothesis detail"       width={1440} height={900}><WFHypothesisDetail /></DCArtboard>
          <DCArtboard id="wf-create"   label="04 · Hypothesis create"       width={1440} height={900}><WFHypothesisCreate /></DCArtboard>
          <DCArtboard id="wf-hunt"     label="05 · Hunt board (lo-fi)"      width={1440} height={900}><WFHuntBoard /></DCArtboard>
          <DCArtboard id="wf-evidence" label="06 · Evidence"                width={1440} height={900}><WFEvidence /></DCArtboard>
          <DCArtboard id="wf-attack"   label="07 · ATT&CK navigator (lo-fi)" width={1440} height={900}><WFAttack /></DCArtboard>
          <DCArtboard id="wf-integ"    label="08 · Integrations console"    width={1440} height={900}><WFIntegrations /></DCArtboard>
          <DCArtboard id="wf-reports"  label="09 · Reports"                 width={1440} height={900}><WFReports /></DCArtboard>
          <DCArtboard id="wf-audit"    label="10 · Audit log"               width={1440} height={900}><WFAudit /></DCArtboard>
          <DCArtboard id="wf-auth"     label="11 · Auth + security flows"   width={1440} height={760}><WFAuth /></DCArtboard>
        </DCSection>

        {/* ─── High-fidelity heroes ─── */}
        <DCSection id="hifi" title="High-fidelity · hero screens" subtitle="Hunt Board and ATT&CK Navigator — the two most distinctive surfaces. Production-grade chrome, real ATT&CK refs.">
          <DCArtboard id="hi-hunt"   label="Hunt Board · hi-fi"        width={1600} height={1000}><HiHuntBoard /></DCArtboard>
          <DCArtboard id="hi-attack" label="ATT&CK Navigator · hi-fi"  width={1600} height={1000}><HiAttackNavigator /></DCArtboard>
        </DCSection>

        {/* ─── Interaction specs ─── */}
        <DCSection id="specs" title="Interaction specifications" subtitle="State transitions, concurrent-edit conflict, immutable evidence versioning, and every fallback state.">
          <DCArtboard id="sp-state"    label="State machine · transitions"     width={1280} height={760}><ABStateMachine /></DCArtboard>
          <DCArtboard id="sp-conflict" label="Concurrent edit · diff"          width={1280} height={680}><ABConflict /></DCArtboard>
          <DCArtboard id="sp-states"   label="Loading · empty · error · 403"   width={1480} height={780}><ABStates /></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="THMP">
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.dark ? 'dark' : 'light'}
          options={['dark', 'light']}
          onChange={(v) => setTweak('dark', v === 'dark')} />
        <TweakSection label="Role view" />
        <TweakSelect label="Acting as" value={t.role}
          options={Object.keys(window.ROLES).map(k => ({ value: k, label: window.ROLES[k].label }))}
          onChange={(v) => setTweak('role', v)} />
        <div style={{ fontSize: 11, color: 'rgba(41,38,27,.55)', lineHeight: 1.5, padding: '4px 2px 0' }}>
          Changes propagate to nav visibility, badges and primary-action gating in all artboards.
        </div>
      </TweaksPanel>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
