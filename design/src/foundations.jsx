// foundations.jsx — token swatches, type scale, component inventory.

function ABCover({ title, eyebrow, kicker }) {
  const { t } = useTheme();
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg0, color: t.text0,
      padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      fontFamily: window.FONT.sans,
      backgroundImage: `radial-gradient(circle at 100% 0%, ${t.accentDim} 0%, transparent 40%)`,
    }}>
      <div>
        <div style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>{eyebrow}</div>
        <h1 style={{ margin: 0, fontSize: 64, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 600, color: t.text0, textWrap: 'balance', maxWidth: 920 }}>{title}</h1>
        {kicker && <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.55, color: t.text2, maxWidth: 720 }}>{kicker}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text3 }}>
          THREAT HYPOTHESIS MANAGEMENT PLATFORM<br/>
          DESIGN SYSTEM · v0.1 · {new Date().toISOString().slice(0,10)}
        </div>
        <Logo />
      </div>
    </div>
  );
}

function ABColorTokens() {
  const { t } = useTheme();
  const groups = [
    { name: 'Surfaces', items: [
      ['bg-0', t.bg0, 'page'], ['bg-1', t.bg1, 'panel'], ['bg-2', t.bg2, 'card'],
      ['bg-3', t.bg3, 'raised / hover'], ['bg-4', t.bg4, 'selected'],
    ]},
    { name: 'Lines', items: [
      ['line-0', t.line0, 'subtle'], ['line-1', t.line1, 'default'], ['line-2', t.line2, 'strong'],
    ]},
    { name: 'Text', items: [
      ['text-0', t.text0, 'primary'], ['text-1', t.text1, 'body'],
      ['text-2', t.text2, 'secondary'], ['text-3', t.text3, 'tertiary'],
    ]},
    { name: 'Accent', items: [
      ['accent', t.accent, 'brand / focus'],
      ['accent-dim', t.accentDim, 'tint background'],
      ['accent-line', t.accentLine, 'tint border'],
    ]},
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, color: t.text1, padding: 32, fontFamily: window.FONT.sans, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: t.text0 }}>Color tokens</h2>
        <span style={{ fontSize: 12, color: t.text2 }}>Cool charcoal neutrals · single restrained accent · semantic severity scale</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {groups.map((g) => (
          <div key={g.name}>
            <SectionTitle>{g.name}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.items.map(([name, val, hint]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 5, background: val, border: `1px solid ${t.line1}`, flex: '0 0 28px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: window.FONT.mono, fontSize: 11.5, color: t.text0 }}>{name}</div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{hint}</div>
                  </div>
                  <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text2 }}>{typeof val === 'string' && val.startsWith('#') ? val : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <SectionTitle hint="badges should match these foregrounds 1:1">Severity</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {window.SEV.map((s) => <SevBadge key={s} sev={s} size="md" />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {[['critical', t.sevCritical], ['high', t.sevHigh], ['medium', t.sevMedium], ['low', t.sevLow], ['info', t.sevInfo]].map(([n, c]) => (
              <div key={n} style={{ background: t.bg1, border: `1px solid ${t.line0}`, borderRadius: 6, padding: 8 }}>
                <div style={{ height: 24, background: c, borderRadius: 3, marginBottom: 6 }} />
                <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text2 }}>sev-{n}</div>
                <div style={{ fontFamily: window.FONT.mono, fontSize: 9.5, color: t.text3 }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle hint="lifecycle states">Status</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {window.STATUS.map((s) => <StatusBadge key={s} status={s} size="md" />)}
          </div>
          <SectionTitle hint="ATT&CK coverage heatmap">Coverage scale</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
            {[t.cov0, t.cov1, t.cov2, t.cov3, t.cov4].map((c, i) => (
              <div key={i} style={{ flex: 1, height: 36, background: c, border: `1px solid ${t.line0}`, borderRadius: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 4 }}>
                <span style={{ fontFamily: window.FONT.mono, fontSize: 9.5, color: t.text2 }}>{i}</span>
              </div>
            ))}
            <div style={{ flex: 1, height: 36, background: t.gap, border: `1px dashed ${t.sevCritical}66`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: window.FONT.mono, fontSize: 9.5, color: t.sevCritical }}>gap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ABTypeScale() {
  const { t } = useTheme();
  const rows = [
    { name: 'display',  size: 32, weight: 600, sample: 'Threat hypotheses, in flight.' },
    { name: 'h1',       size: 22, weight: 600, sample: 'Hypothesis detail' },
    { name: 'h2',       size: 17, weight: 600, sample: 'Evidence panel' },
    { name: 'h3',       size: 14, weight: 600, sample: 'ATT&CK mappings' },
    { name: 'body-lg',  size: 14, weight: 400, sample: 'Spearphishing campaign delivering loader to finance staff' },
    { name: 'body',     size: 13, weight: 400, sample: 'Mandiant feed · updated 12m ago · owner kowalski' },
    { name: 'caption',  size: 11.5, weight: 400, sample: 'Last sync 00:42 UTC · 7 errors' },
    { name: 'mono',     size: 11.5, weight: 500, sample: 'T1059.001 · T1566.001', mono: true },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 32, fontFamily: window.FONT.sans, color: t.text0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Type scale</h2>
        <span style={{ fontSize: 12, color: t.text2 }}>Geist for UI · Geist Mono for IDs, technique refs, timestamps, code</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px', rowGap: 16, columnGap: 24, alignItems: 'center' }}>
        {rows.map((r) => (
          <React.Fragment key={r.name}>
            <div>
              <div style={{ fontFamily: window.FONT.mono, fontSize: 11, color: t.text0 }}>{r.name}</div>
              <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>{r.size}px · {r.weight}</div>
            </div>
            <div style={{ fontSize: r.size, fontWeight: r.weight, color: t.text0, fontFamily: r.mono ? window.FONT.mono : 'inherit', lineHeight: 1.25 }}>{r.sample}</div>
            <div style={{ fontFamily: window.FONT.mono, fontSize: 10.5, color: t.text3 }}>line {r.size <= 13 ? 1.5 : 1.25}</div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <SectionTitle>Numerals · tabular</SectionTitle>
          <div style={{ fontFamily: window.FONT.mono, fontSize: 20, color: t.text0, fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>
            00:42:18<br/>
            127.0.0.1<br/>
            +12.4% · 3,481
          </div>
        </div>
        <div>
          <SectionTitle>Spacing scale</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {[2, 4, 6, 8, 12, 16, 20, 24, 32, 48].map((s) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: s, height: 28, background: t.accentDim, border: `1px solid ${t.accentLine}` }} />
                <div style={{ fontFamily: window.FONT.mono, fontSize: 10, color: t.text2 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ABComponents() {
  const { t } = useTheme();
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg0, padding: 28, fontFamily: window.FONT.sans, color: t.text1, overflow: 'auto' }}>
      <h2 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 600, color: t.text0 }}>Components</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card>
          <SectionTitle>Buttons</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Btn variant="primary">Create hypothesis</Btn>
            <Btn>Save view</Btn>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="danger">Archive</Btn>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <Btn size="sm" variant="primary">Apply</Btn>
            <Btn size="sm">Filter</Btn>
            <Btn size="sm" variant="ghost">Reset</Btn>
          </div>
        </Card>
        <Card>
          <SectionTitle>Chips & filters</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Chip variant="active">Status: Active</Chip>
            <Chip>Severity: High</Chip>
            <Chip>Owner: kowalski</Chip>
            <Chip variant="ghost">+ Add filter</Chip>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <TacticTag id="T1059.001" name="PowerShell" />
            <TacticTag id="T1566.001" />
            <TacticTag id="T1078" />
          </div>
        </Card>

        <Card>
          <SectionTitle>Input · text field</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11.5, color: t.text2, marginBottom: 4 }}>Hypothesis title</div>
              <div style={{ padding: '8px 10px', background: t.bg1, border: `1px solid ${t.line1}`, borderRadius: 6, color: t.text0, fontSize: 13 }}>Spearphishing campaign…</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: t.text2, marginBottom: 4 }}>Focus</div>
              <div style={{ padding: '8px 10px', background: t.bg1, border: `1.5px solid ${t.accent}`, boxShadow: `0 0 0 3px ${t.accentDim}`, borderRadius: 6, color: t.text0, fontSize: 13 }}>Outbound C2 beaconing|</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: t.sevCritical, marginBottom: 4 }}>Error</div>
              <div style={{ padding: '8px 10px', background: t.bg1, border: `1px solid ${t.sevCritical}`, borderRadius: 6, color: t.text0, fontSize: 13 }}>Title is required</div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Toast · banners</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: `${t.sevLow}1A`, border: `1px solid ${t.sevLow}55`, fontSize: 12, color: t.text0 }}>
              <span style={{ width: 6, height: 6, background: t.sevLow, borderRadius: '50%' }} /> Auto-suggested 3 techniques from your description.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: `${t.sevHigh}1A`, border: `1px solid ${t.sevHigh}55`, fontSize: 12, color: t.text0 }}>
              <span style={{ width: 6, height: 6, background: t.sevHigh, borderRadius: '50%' }} /> Another user is editing this hypothesis (M. Reyes).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: `${t.sevCritical}1A`, border: `1px solid ${t.sevCritical}55`, fontSize: 12, color: t.text0 }}>
              <span style={{ width: 6, height: 6, background: t.sevCritical, borderRadius: '50%' }} /> Splunk connector offline · last sync failed.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ABCover, ABColorTokens, ABTypeScale, ABComponents });
