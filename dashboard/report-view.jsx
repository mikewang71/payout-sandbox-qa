// View A — "Report" direction (bilingual)
// Reads text from CONTENT[lang]. Layout identical for en / zh.

function ReportView({ tw, lang = 'en' }) {
  const t = THEMES[tw.theme] || THEMES.dark;
  const isRD = tw.detail === 'rd';
  const L = CONTENT[lang];

  const fontStack = lang === 'zh'
    ? '"Inter", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    : 'Inter, system-ui, sans-serif';
  const serifStack = lang === 'zh'
    ? '"Noto Serif TC", "Songti TC", "PingFang TC", serif'
    : '"Instrument Serif", serif';

  const page = {
    width: 1440, background: t.bg, color: t.text,
    fontFamily: fontStack,
    padding: '56px 72px 80px', letterSpacing: 0.1,
  };

  return (
    <div style={page} lang={lang === 'zh' ? 'zh-Hant' : 'en'}>
      <ReportHeader t={t} L={L} serifStack={serifStack} />
      <ReportSummary t={t} L={L} isRD={isRD} serifStack={serifStack} />
      <ReportCoverage t={t} L={L} isRD={isRD} serifStack={serifStack} />
      <ReportBugs t={t} L={L} isRD={isRD} serifStack={serifStack} />
      <ReportRisk t={t} L={L} serifStack={serifStack} />
      <ReportSeed t={t} L={L} isRD={isRD} serifStack={serifStack} />
      <ReportStuck t={t} L={L} isRD={isRD} serifStack={serifStack} />
      <ReportFooter t={t} L={L} />
    </div>
  );
}

function ReportHeader({ t, L, serifStack }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      paddingBottom: 28, borderBottom: `1px solid ${t.border}`, marginBottom: 40,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <CapitalLayerMark t={t} />
          <span style={{ fontFamily: serifStack, fontSize: 28, letterSpacing: 0.3 }}>
            {META.brand}
          </span>
          <span style={{
            marginLeft: 4, padding: '3px 8px', fontSize: 10,
            background: t.panelHi, color: t.textMid, border: `1px solid ${t.border}`,
            borderRadius: 4, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
          }}>{L.internal}</span>
        </div>
        <h1 style={{
          margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: -0.5,
          fontFamily: serifStack,
        }}>{L.subtitle}</h1>
        <div style={{ color: t.textMid, marginTop: 6, fontSize: 14 }}>{L.scope}</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, color: t.textDim, lineHeight: 1.7 }}>
        <Mono style={{ color: t.textMid }}>{META.date}</Mono>
        <div>build · <Mono>{META.build}</Mono></div>
        <div>env · <Mono>{META.env}</Mono></div>
        <div>author · {META.author}</div>
      </div>
    </header>
  );
}

function CapitalLayerMark({ t }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ display: 'block' }}>
      <rect x="2"  y="16" width="24" height="4" rx="1" fill={t.pass} opacity="0.9" />
      <rect x="2"  y="10" width="24" height="4" rx="1" fill={t.accent} opacity="0.75" />
      <rect x="2"  y="4"  width="24" height="4" rx="1" fill={t.warn} opacity="0.65" />
    </svg>
  );
}

function SectionTitle({ num, title, subtitle, t, serifStack }) {
  return (
    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <Mono style={{ color: t.textDim, fontSize: 12 }}>{num}</Mono>
      <div>
        <h2 style={{
          margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.2,
          fontFamily: serifStack || '"Instrument Serif", serif',
        }}>{title}</h2>
        {subtitle && <div style={{ color: t.textMid, fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function ReportSummary({ t, L, isRD, serifStack }) {
  const verdictTone = SUMMARY.failed > 0 ? 'warn' : 'pass';
  const verdictColor = verdictTone === 'warn' ? t.warn : t.pass;
  const verdictLabel = SUMMARY.failed > 0 ? L.shipBlocked : L.readyToShip;

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="01" title={L.s1Title} subtitle={L.s1Sub} t={t} serifStack={serifStack} />

      <div style={{
        border: `1px solid ${verdictColor}55`,
        background: verdictTone === 'warn' ? t.warnDim : t.passDim,
        borderRadius: 8, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: 999, background: verdictColor,
          boxShadow: `0 0 12px ${verdictColor}`,
        }} />
        <div style={{ fontWeight: 600, fontSize: 14, color: verdictColor }}>{verdictLabel}</div>
        <div style={{ color: t.textMid, fontSize: 13 }}>{L.verdictMsg}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI t={t} label={L.totalCases} value={SUMMARY.total} />
        <KPI t={t} label={L.passed}     value={SUMMARY.passed} tone={t.pass} />
        <KPI t={t} label={L.failed}     value={SUMMARY.failed} tone={t.fail} />
        <KPI t={t} label={L.passRate}   value={`${SUMMARY.passRate}%`} tone={t.pass} />
        <KPI t={t} label={L.duration}   value={SUMMARY.duration} mono />
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: t.textMid, textTransform: 'uppercase', letterSpacing: 1 }}>
            {L.overallDist}
          </span>
          <Mono style={{ fontSize: 12, color: t.textDim }}>
            {SUMMARY.passed} {L.pass} · {SUMMARY.failed} {L.fail} · {SUMMARY.suites} {L.suites}
          </Mono>
        </div>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', border: `1px solid ${t.border}` }}>
          <div style={{ width: `${(SUMMARY.passed / SUMMARY.total) * 100}%`, background: t.pass, boxShadow: `inset 0 0 12px ${t.pass}66` }} />
          <div style={{ width: `${(SUMMARY.failed / SUMMARY.total) * 100}%`, background: t.fail, boxShadow: `inset 0 0 12px ${t.fail}66` }} />
        </div>
        {isRD && (
          <div style={{ color: t.textDim, fontSize: 11, marginTop: 10, fontFamily: '"JetBrains Mono", monospace' }}>
            runner: pytest 8.1 · parallel=4 · seed=20260423 · flaky=0
          </div>
        )}
      </div>
    </section>
  );
}

function KPI({ t, label, value, tone, mono }) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 10.5, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontSize: 32, fontWeight: 600, marginTop: 4, letterSpacing: -0.5,
        color: tone || t.text,
        fontFamily: mono ? '"JetBrains Mono", monospace' : 'inherit',
      }}>{value}</div>
    </div>
  );
}

function ReportCoverage({ t, L, isRD, serifStack }) {
  const [hover, setHover] = React.useState(null);
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="02" title={L.s2Title} subtitle={L.s2Sub} t={t} serifStack={serifStack} />
      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: '22px 26px' }}>
        {L.coverage.map((c) => {
          const pct = (c.pass / c.total) * 100;
          const isFull = c.pass === c.total;
          const barTone = isFull ? 'pass' : 'warn';
          return (
            <div key={c.id}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                display: 'grid', gridTemplateColumns: '200px 1fr 90px 220px',
                alignItems: 'center', gap: 18, padding: '12px 0',
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
              <div style={{ position: 'relative' }}>
                <ProgressBar value={c.pass} max={c.total} t={t} tone={barTone} height={10} />
                {hover === c.id && (
                  <div style={{
                    position: 'absolute', top: -30, left: `${pct}%`, transform: 'translateX(-50%)',
                    background: t.bgElev, color: t.text,
                    border: `1px solid ${t.borderHi}`, borderRadius: 4,
                    padding: '3px 8px', fontSize: 11, whiteSpace: 'nowrap',
                    fontFamily: '"JetBrains Mono", monospace',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}>
                    {c.pass}/{c.total} · {Math.round(pct)}%
                  </div>
                )}
              </div>
              <Mono style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: isFull ? t.pass : t.warn }}>
                {c.pass}/{c.total}
              </Mono>
              <div style={{ fontSize: 12, color: t.textMid }}>{isRD ? c.note : ''}</div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: t.textDim, marginTop: 14 }}>{L.coverageHover}</div>
      </div>
    </section>
  );
}

function ReportBugs({ t, L, isRD, serifStack }) {
  const [open, setOpen] = React.useState({ 'BUG-1': true });
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="03" title={L.s3Title} subtitle={L.s3Sub} t={t} serifStack={serifStack} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {L.bugs.map((b) => (
          <BugCard key={b.id} bug={b} L={L} t={t} isRD={isRD} expanded={!!open[b.id]} onToggle={() => toggle(b.id)} />
        ))}
      </div>
    </section>
  );
}

function BugCard({ bug, L, t, isRD, expanded, onToggle }) {
  const tone = SEV_TONE[bug.severity] || SEV_TONE.Low;
  return (
    <div
      onClick={onToggle}
      style={{
        background: t.panel,
        border: `1px solid ${expanded ? tone.fg + '55' : t.border}`,
        borderLeft: `3px solid ${tone.fg}`,
        borderRadius: 8, padding: '16px 20px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mono style={{
          fontSize: 12, fontWeight: 600, color: t.textMid,
          background: t.panelHi, padding: '3px 7px', borderRadius: 4,
          border: `1px solid ${t.border}`,
        }}>{bug.id}</Mono>
        <SeverityPill sev={bug.severity} t={t} />
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{bug.title}</div>
        <div style={{ fontSize: 11, color: t.textDim }}>{bug.area}</div>
        <div style={{
          fontSize: 11, color: t.textMid,
          padding: '3px 8px', background: t.panelHi, borderRadius: 4,
          border: `1px solid ${t.border}`,
        }}>{bug.status} · {bug.owner}</div>
        <span style={{
          color: t.textDim, fontSize: 14, marginLeft: 4,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>›</span>
      </div>

      <div style={{ color: t.textMid, fontSize: 13, marginTop: 10, lineHeight: 1.55 }}>{bug.summary}</div>

      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${t.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: isRD ? '1fr 1fr' : '1fr', gap: 20 }}>
            <div>
              <CardLabel t={t}>{L.impact}</CardLabel>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: t.text }}>{bug.impact}</div>
              {isRD && (
                <>
                  <CardLabel t={t} style={{ marginTop: 16 }}>{L.expected}</CardLabel>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, color: t.pass }}><Mono>{bug.expected}</Mono></div>
                  <CardLabel t={t} style={{ marginTop: 12 }}>{L.actual}</CardLabel>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, color: t.fail }}><Mono>{bug.actual}</Mono></div>
                </>
              )}
            </div>
            {isRD && (
              <div>
                <CardLabel t={t}>{L.reproduction}</CardLabel>
                <pre style={{
                  margin: 0, padding: 12,
                  background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6,
                  color: t.textMid, fontSize: 11.5, lineHeight: 1.7,
                  fontFamily: '"JetBrains Mono", monospace',
                  whiteSpace: 'pre-wrap', overflowX: 'auto',
                }}>{bug.repro.join('\n')}</pre>
                <CardLabel t={t} style={{ marginTop: 14 }}>{L.evidence}</CardLabel>
                <Mono style={{ fontSize: 11.5, color: t.textDim }}>{bug.evidence}</Mono>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CardLabel({ children, t, style }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
      color: t.textDim, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

function ReportRisk({ t, L, serifStack }) {
  const [hover, setHover] = React.useState(null);
  const cell = 110;
  const zoneColor = (x, y) => {
    const s = x + y;
    if (s >= 5) return t.fail;
    if (s >= 4) return t.warn;
    if (s >= 3) return t.accent;
    return t.pass;
  };

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="04" title={L.s4Title} subtitle={L.s4Sub} t={t} serifStack={serifStack} />
      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: 28, display: 'flex', gap: 36, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', left: -72, top: (cell * 3) / 2, transform: 'rotate(-90deg)',
            transformOrigin: 'center', fontSize: 11, color: t.textDim,
            letterSpacing: 1.5, fontWeight: 600, whiteSpace: 'nowrap',
          }}>{L.impactAxis}</div>

          <div style={{
            display: 'grid', gridTemplateColumns: '30px repeat(3, ' + cell + 'px)',
            gridTemplateRows: `repeat(3, ${cell}px) 30px`, gap: 0,
          }}>
            {[3, 2, 1].map((y) => (
              <React.Fragment key={y}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: t.textMid, fontWeight: 500,
                }}>{L.levelsShort[y - 1]}</div>
                {[1, 2, 3].map((x) => {
                  const bug = RISK.find((r) => r.x === x && r.y === y);
                  const color = zoneColor(x, y);
                  return (
                    <div key={`${x}-${y}`}
                      onMouseEnter={() => bug && setHover(bug)}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        width: cell, height: cell,
                        background: `${color}14`,
                        border: `1px solid ${t.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', cursor: bug ? 'pointer' : 'default',
                      }}
                    >
                      {bug && (
                        <div style={{
                          padding: '6px 10px', background: color, color: '#0d1117',
                          borderRadius: 6, fontSize: 11, fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace',
                          boxShadow: `0 0 16px ${color}88, 0 2px 6px rgba(0,0,0,0.3)`,
                          transform: hover === bug ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.15s',
                        }}>{bug.bug}</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
            <div />
            {L.levelsShort.map((l, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: t.textMid, fontWeight: 500,
              }}>{l}</div>
            ))}
          </div>

          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: t.textDim, letterSpacing: 1.5, fontWeight: 600 }}>
            {L.likelihood}
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 340,
          background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
          padding: 22, display: 'flex', flexDirection: 'column',
        }}>
          {hover ? (() => {
            const fullBug = L.bugs.find((b) => b.id === hover.bug);
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Mono style={{ fontSize: 12, color: t.textMid }}>{hover.bug}</Mono>
                  <SeverityPill sev={hover.sev} t={t} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{fullBug.title}</div>
                <div style={{ fontSize: 12.5, color: t.textMid, lineHeight: 1.6 }}>{fullBug.summary}</div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${t.border}`, fontSize: 11, color: t.textDim, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{L.likelihoodLabel}: <span style={{ color: t.text }}>{L.levels[hover.x]}</span></span>
                  <span>{L.impactLabel}: <span style={{ color: t.text }}>{L.levels[hover.y]}</span></span>
                  <span>{L.ownerLabel}: <span style={{ color: t.text }}>{fullBug.owner}</span></span>
                </div>
              </>
            );
          })() : (
            <div style={{ color: t.textDim, fontSize: 13, margin: 'auto', textAlign: 'center', lineHeight: 1.7 }}>
              {L.hoverCellHint}<br/>
              <span style={{ fontSize: 11 }}>{L.upperRight}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportSeed({ t, L, isRD, serifStack }) {
  const statusColor = (s) => s === 'COMPLETED' ? t.pass : s === 'FAILED' ? t.textMid : t.warn;
  const reconColor = (r) => r === 'match' ? t.pass : t.fail;
  const reconLabel = (r) => r === 'match' ? L.match : L.mismatch;
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="05" title={L.s5Title} subtitle={L.s5Sub} t={t} serifStack={serifStack} />
      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13 }}>
          <thead>
            <tr style={{ background: t.panelHi }}>
              {L.seedHeaders.map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '14px 20px',
                  fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2,
                  color: t.textDim, textTransform: 'uppercase',
                  borderBottom: `1px solid ${t.border}`,
                  fontFamily: 'inherit',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED.map((r, i) => (
              <tr key={r.id} style={{
                background: r.status === 'STUCK' ? t.warnDim : 'transparent',
                borderBottom: i < SEED.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                <td style={cellStyle(t)}>
                  <div>{r.id}</div>
                  <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>{r.label}</div>
                </td>
                <td style={cellStyle(t)}>{r.amount} <span style={{ color: t.textDim }}>{r.asset}</span></td>
                <td style={cellStyle(t)}>
                  <span style={{ color: statusColor(r.status), fontWeight: 600 }}>{r.status}</span>
                </td>
                <td style={{ ...cellStyle(t), color: t.textMid }}>{r.provider}</td>
                <td style={cellStyle(t)}>
                  <span style={{ color: r.ledger === '0.00' && r.status === 'STUCK' ? t.fail : r.recon === 'mismatch' ? t.warn : t.text }}>
                    {r.ledger} <span style={{ color: t.textDim }}>{r.asset}</span>
                  </span>
                  {r.delta && <div style={{ fontSize: 11, color: t.fail, marginTop: 2 }}>Δ {r.delta}</div>}
                </td>
                <td style={cellStyle(t)}>
                  <span style={{ color: reconColor(r.recon), fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: reconColor(r.recon) }} />
                    {reconLabel(r.recon)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isRD && (
        <div style={{ fontSize: 11, color: t.textDim, marginTop: 10 }}>{L.seedFixtureNote}</div>
      )}
    </section>
  );
}

function cellStyle(t) {
  return { padding: '14px 20px', color: t.text, verticalAlign: 'middle' };
}

function ReportStuck({ t, L, isRD, serifStack }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle num="06" title={L.s6Title} subtitle={L.stuckAmount} t={t} serifStack={serifStack} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: '22px 24px' }}>
          <CardLabel t={t}>{L.findingsTitle}</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {L.findings.map((f, i) => {
              const tone = f.tone === 'bad' ? t.fail : t.warn;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '200px 1fr 14px',
                  gap: 14, alignItems: 'flex-start', paddingBottom: 12,
                  borderBottom: i < L.findings.length - 1 ? `1px dashed ${t.border}` : 'none',
                }}>
                  <div style={{ fontSize: 12, color: t.textMid, fontWeight: 500, paddingTop: 1 }}>{f.k}</div>
                  <div style={{ fontSize: 13, color: t.text, lineHeight: 1.55 }}>{f.v}</div>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: tone, marginTop: 6 }} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: '22px 24px' }}>
          <CardLabel t={t}>{L.recsTitle}</CardLabel>
          <ol style={{ margin: '10px 0 0', padding: '0 0 0 20px', color: t.text, fontSize: 13, lineHeight: 1.7 }}>
            {L.recs.map((r, i) => <li key={i} style={{ marginBottom: 8 }}>{r}</li>)}
          </ol>
          {isRD && (
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: `1px dashed ${t.border}`,
              fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: t.textDim, lineHeight: 1.7,
            }}>
              {L.affected}<br/>
              {L.tracking}: <span style={{ color: t.accent }}>CAPL-4412</span> · <span style={{ color: t.accent }}>CAPL-4413</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportFooter({ t, L }) {
  return (
    <footer style={{
      marginTop: 40, paddingTop: 20, borderTop: `1px solid ${t.border}`,
      display: 'flex', justifyContent: 'space-between',
      color: t.textDim, fontSize: 11,
    }}>
      <span>{META.brand} · {L.footerInternal}</span>
      <Mono>{META.date} · {META.build}</Mono>
    </footer>
  );
}

Object.assign(window, { ReportView });
