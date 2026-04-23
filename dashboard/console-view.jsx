// View B — "Console" direction (bilingual)
// Reads text from CONTENT[lang].

function ConsoleView({ tw, lang = 'en' }) {
  const t = THEMES[tw.theme] || THEMES.dark;
  const isRD = tw.detail === 'rd';
  const L = CONTENT[lang];

  const monoStack = lang === 'zh'
    ? '"JetBrains Mono", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", ui-monospace, Menlo, monospace'
    : '"JetBrains Mono", ui-monospace, Menlo, monospace';
  const sansStack = lang === 'zh'
    ? 'Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    : 'Inter, system-ui, sans-serif';

  const page = {
    width: 1440, background: t.bg, color: t.text,
    fontFamily: monoStack,
    padding: '24px 28px 40px', letterSpacing: 0.1,
  };

  return (
    <div style={page} lang={lang === 'zh' ? 'zh-Hant' : 'en'} data-sans={sansStack}>
      <ConsoleTopBar t={t} L={L} sansStack={sansStack} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
        <ConsoleSummaryPanel t={t} L={L} isRD={isRD} sansStack={sansStack} />
        <ConsoleCoveragePanel t={t} L={L} isRD={isRD} sansStack={sansStack} />
      </div>
      <div style={{ marginTop: 14 }}>
        <ConsoleBugsPanel t={t} L={L} isRD={isRD} sansStack={sansStack} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginTop: 14 }}>
        <ConsoleSeedPanel t={t} L={L} isRD={isRD} sansStack={sansStack} />
        <ConsoleRiskPanel t={t} L={L} sansStack={sansStack} />
      </div>
      <div style={{ marginTop: 14 }}>
        <ConsoleStuckPanel t={t} L={L} isRD={isRD} sansStack={sansStack} />
      </div>
    </div>
  );
}

function Panel({ t, title, aside, children, style, sansStack }) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 6, overflow: 'hidden', ...style }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: t.panelHi, borderBottom: `1px solid ${t.border}`,
        fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
        fontFamily: sansStack || 'Inter, sans-serif', fontWeight: 600, color: t.textMid,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: t.accent }} />
          {title}
        </span>
        {aside && <span style={{ color: t.textDim, fontSize: 10, letterSpacing: 0.5, textTransform: 'none', fontWeight: 500 }}>{aside}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ConsoleTopBar({ t, L, sansStack }) {
  const healthBad = SUMMARY.failed > 0;
  return (
    <header style={{
      background: t.panel, border: `1px solid ${t.border}`, borderRadius: 6,
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 28 28">
          <rect x="2" y="16" width="24" height="4" rx="1" fill={t.pass} />
          <rect x="2" y="10" width="24" height="4" rx="1" fill={t.accent} opacity="0.8" />
          <rect x="2" y="4"  width="24" height="4" rx="1" fill={t.warn} opacity="0.7" />
        </svg>
        <span style={{ fontFamily: sansStack, fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{META.brand}</span>
        <span style={{ color: t.textDim, fontSize: 11 }}>/</span>
        <span style={{ color: t.textMid, fontSize: 12, fontFamily: sansStack, fontWeight: 500 }}>qa-console</span>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 22, justifyContent: 'center' }}>
        <TopStat t={t} label="run"   value={META.date} sansStack={sansStack} />
        <TopStat t={t} label="env"   value={META.env} sansStack={sansStack} />
        <TopStat t={t} label="build" value={META.build.replace('payout-svc ', '')} sansStack={sansStack} />
        <TopStat t={t} label="scope" value={L.scope} sansStack={sansStack} />
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 4,
        background: healthBad ? t.warnDim : t.passDim,
        border: `1px solid ${healthBad ? t.warn : t.pass}44`,
        color: healthBad ? t.warn : t.pass,
        fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        fontFamily: sansStack,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999,
          background: healthBad ? t.warn : t.pass,
          boxShadow: `0 0 10px ${healthBad ? t.warn : t.pass}`,
          animation: 'consolePulse 1.6s ease-in-out infinite',
        }} />
        {healthBad ? L.runBlocked : L.runHealthy}
      </div>
      <style>{`@keyframes consolePulse { 0%,100%{opacity:1}50%{opacity:.45} }`}</style>
    </header>
  );
}

function TopStat({ t, label, value, sansStack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12 }}>
      <span style={{ color: t.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, fontFamily: sansStack }}>{label}</span>
      <span style={{ color: t.text }}>{value}</span>
    </div>
  );
}

function ConsoleSummaryPanel({ t, L, isRD, sansStack }) {
  const ticks = new Array(40).fill('p');
  [7, 19, 28, 35].forEach((i) => (ticks[i] = 'f'));
  return (
    <Panel t={t} title={L.runPanelTitle} aside={`${SUMMARY.duration} · ${SUMMARY.suites} ${L.suites}`} sansStack={sansStack}>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div>
            <MetricLabel t={t} sansStack={sansStack}>{L.passRate}</MetricLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 38, fontWeight: 600, color: t.pass, letterSpacing: -1 }}>{SUMMARY.passRate}</span>
              <span style={{ fontSize: 18, color: t.pass }}>%</span>
            </div>
          </div>
          <MetricBlock t={t} label={L.totalCases} value={SUMMARY.total} sansStack={sansStack} />
          <MetricBlock t={t} label={L.passed}     value={SUMMARY.passed} color={t.pass} sansStack={sansStack} />
          <MetricBlock t={t} label={L.failed}     value={SUMMARY.failed} color={t.fail} sansStack={sansStack} />
        </div>
        <div>
          <MetricLabel t={t} sansStack={sansStack}>{L.caseSequence}</MetricLabel>
          <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'stretch' }}>
            {ticks.map((v, i) => (
              <div key={i} style={{
                flex: 1,
                background: v === 'p' ? t.pass : t.fail,
                opacity: v === 'p' ? 0.75 : 1, borderRadius: 1,
                boxShadow: v === 'f' ? `0 0 6px ${t.fail}cc` : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: t.textDim, fontSize: 10, marginTop: 6 }}>
            <span>{L.case01}</span>
            <span>{L.caseN(SUMMARY.total)}</span>
          </div>
        </div>
        {isRD && (
          <div style={{ marginTop: 14, color: t.textDim, fontSize: 11, lineHeight: 1.7 }}>
            runner=pytest·8.1 parallel=4 seed=20260423 flaky=0 retries=0
          </div>
        )}
      </div>
    </Panel>
  );
}

function MetricLabel({ children, t, sansStack }) {
  return (
    <div style={{
      fontSize: 10, color: t.textDim, textTransform: 'uppercase',
      letterSpacing: 1.5, fontWeight: 600, marginBottom: 4,
      fontFamily: sansStack || 'Inter, sans-serif',
    }}>{children}</div>
  );
}

function MetricBlock({ t, label, value, color, sansStack }) {
  return (
    <div>
      <MetricLabel t={t} sansStack={sansStack}>{label}</MetricLabel>
      <div style={{ fontSize: 26, fontWeight: 600, color: color || t.text, letterSpacing: -0.5 }}>{value}</div>
    </div>
  );
}

function ConsoleCoveragePanel({ t, L, isRD, sansStack }) {
  const [hover, setHover] = React.useState(null);
  const maxTotal = Math.max(...L.coverage.map((c) => c.total));
  return (
    <Panel t={t} title={L.coveragePanelTitle} aside={L.coveragePanelAside} sansStack={sansStack}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 220 }}>
          {L.coverage.map((c) => {
            const passH = (c.pass / maxTotal) * 170;
            const totalH = (c.total / maxTotal) * 170;
            const full = c.pass === c.total;
            const top = full ? t.pass : t.warn;
            return (
              <div key={c.id}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ height: 24, fontSize: 10, color: hover === c.id ? t.text : t.textDim, fontWeight: 600 }}>
                  {hover === c.id ? `${c.pass}/${c.total} · ${Math.round((c.pass / c.total) * 100)}%` : ''}
                </div>
                <div style={{ position: 'relative', width: '100%', maxWidth: 72, height: 172, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: totalH, background: t.panelHi, border: `1px dashed ${t.border}`, borderRadius: 3 }} />
                  <div style={{
                    position: 'absolute', bottom: 0, width: '100%', height: passH,
                    background: `linear-gradient(180deg, ${top} 0%, ${top}cc 100%)`,
                    borderRadius: 3,
                    boxShadow: hover === c.id ? `0 0 16px ${top}aa` : `0 0 8px ${top}44`,
                  }} />
                  {!full && (
                    <div style={{
                      position: 'absolute', bottom: passH, width: '100%', height: totalH - passH,
                      background: `${t.fail}33`, borderTop: `2px solid ${t.fail}`, borderRadius: '0 0 3px 3px',
                    }} />
                  )}
                </div>
                <div style={{
                  marginTop: 10, fontSize: 10.5, color: t.textMid,
                  textAlign: 'center', lineHeight: 1.4, height: 32,
                  fontFamily: sansStack, fontWeight: 500,
                }}>{c.label}</div>
              </div>
            );
          })}
        </div>
        {isRD && (
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 14, borderTop: `1px dashed ${t.border}`, paddingTop: 10 }}>
            {L.coverage.filter((c) => c.pass < c.total).map((c) => (
              <div key={c.id}><span style={{ color: t.warn }}>▲ {c.label}</span> — {c.note}</div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ConsoleBugsPanel({ t, L, isRD, sansStack }) {
  const [open, setOpen] = React.useState({ 'BUG-1': true });
  return (
    <Panel t={t} title={L.bugsPanelTitle(L.bugs.length)} aside={L.bugsPanelAside} sansStack={sansStack}>
      <div>
        {L.bugs.map((b, i) => (
          <ConsoleBugRow key={b.id} bug={b} L={L} t={t} isRD={isRD} sansStack={sansStack}
            expanded={!!open[b.id]}
            onToggle={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}
            last={i === L.bugs.length - 1}
          />
        ))}
      </div>
    </Panel>
  );
}

function ConsoleBugRow({ bug, L, t, isRD, expanded, onToggle, last, sansStack }) {
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <div onClick={onToggle} style={{
        display: 'grid', gridTemplateColumns: '90px 110px 1fr 160px 140px 18px',
        alignItems: 'center', gap: 14, padding: '12px 18px',
        cursor: 'pointer', background: expanded ? t.panelHi : 'transparent',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.textMid }}>{bug.id}</span>
        <SeverityPill sev={bug.severity} t={t} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: sansStack }}>{bug.title}</div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 3, fontFamily: sansStack, lineHeight: 1.5 }}>
            {bug.summary}
          </div>
        </div>
        <span style={{ fontSize: 11, color: t.textDim }}>{bug.area}</span>
        <span style={{ fontSize: 11, color: t.textMid, fontFamily: sansStack }}>
          <span style={{ color: t.fail }}>●</span> {bug.status} · {bug.owner}
        </span>
        <span style={{ color: t.textDim, fontSize: 14, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </div>

      {expanded && (
        <div style={{
          padding: '4px 18px 18px 108px',
          background: t.panelHi,
          borderTop: `1px dashed ${t.border}`,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: isRD ? '1fr 1.1fr' : '1fr', gap: 24, paddingTop: 14 }}>
            <div>
              <KV t={t} k={L.impact}   v={bug.impact}   vFont="sans" sansStack={sansStack} />
              {isRD && (
                <>
                  <KV t={t} k={L.expected} v={bug.expected} valueColor={t.pass} />
                  <KV t={t} k={L.actual}   v={bug.actual}   valueColor={t.fail} />
                  <KV t={t} k={L.evidence} v={bug.evidence} valueColor={t.textDim} />
                </>
              )}
            </div>
            {isRD && (
              <div>
                <div style={{
                  fontSize: 10, color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase',
                  fontWeight: 600, fontFamily: sansStack, marginBottom: 6,
                }}>$ {L.reproduction}</div>
                <pre style={{
                  margin: 0, padding: 12,
                  background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4,
                  fontSize: 11.5, lineHeight: 1.65, color: t.textMid,
                  whiteSpace: 'pre-wrap', overflowX: 'auto',
                }}>{bug.repro.map((line, i) => (
                  <span key={i}>
                    <span style={{ color: t.pass }}>{i === 0 ? '$ ' : '  '}</span>
                    {line}{'\n'}
                  </span>
                ))}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ t, k, v, valueColor, vFont, sansStack }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: t.textDim, paddingTop: 2 }}>{k}</span>
      <span style={{
        fontSize: 12.5, color: valueColor || t.text, lineHeight: 1.6,
        fontFamily: vFont === 'sans' ? (sansStack || 'Inter, sans-serif') : '"JetBrains Mono", monospace',
      }}>{v}</span>
    </div>
  );
}

function ConsoleSeedPanel({ t, L, isRD, sansStack }) {
  const statusColor = (s) => s === 'COMPLETED' ? t.pass : s === 'FAILED' ? t.textMid : t.warn;
  const reconColor = (r) => r === 'match' ? t.pass : t.fail;
  const reconLabel = (r) => r === 'match' ? L.match : L.mismatch;
  return (
    <Panel t={t} title={L.seedPanelTitle} aside={L.seedPanelAside} sansStack={sansStack}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            {L.seedHeaders.map((h) => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 14px',
                fontSize: 10, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1.2,
                fontWeight: 600, fontFamily: sansStack,
                borderBottom: `1px solid ${t.border}`, background: t.panelHi,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEED.map((r, i) => (
            <tr key={r.id} style={{
              background: r.status === 'STUCK' ? `${t.warn}11` : 'transparent',
              borderBottom: i < SEED.length - 1 ? `1px solid ${t.border}` : 'none',
            }}>
              <td style={{ padding: '12px 14px' }}>
                <div>{r.id}</div>
                <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 2 }}>{r.label}</div>
              </td>
              <td style={{ padding: '12px 14px' }}>{r.amount} <span style={{ color: t.textDim }}>{r.asset}</span></td>
              <td style={{ padding: '12px 14px', color: statusColor(r.status), fontWeight: 600 }}>{r.status}</td>
              <td style={{ padding: '12px 14px', color: t.textMid }}>{r.provider}</td>
              <td style={{ padding: '12px 14px', color: r.ledger === '0.00' && r.status === 'STUCK' ? t.fail : r.recon === 'mismatch' ? t.warn : t.text }}>
                <div>{r.ledger} <span style={{ color: t.textDim }}>{r.asset}</span></div>
                {r.delta && <div style={{ fontSize: 10.5, color: t.fail, marginTop: 2 }}>Δ {r.delta}</div>}
              </td>
              <td style={{ padding: '12px 14px', color: reconColor(r.recon), fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: reconColor(r.recon) }} />
                  {reconLabel(r.recon)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isRD && (
        <div style={{ padding: '10px 14px', fontSize: 11, color: t.textDim, borderTop: `1px dashed ${t.border}` }}>
          {L.seedFixtureNote}
        </div>
      )}
    </Panel>
  );
}

function ConsoleRiskPanel({ t, L, sansStack }) {
  const [hover, setHover] = React.useState(null);
  const zoneColor = (x, y) => {
    const s = x + y;
    if (s >= 5) return t.fail;
    if (s >= 4) return t.warn;
    if (s >= 3) return t.accent;
    return t.pass;
  };
  const cell = 70;
  return (
    <Panel t={t} title={L.riskPanelTitle} aside={L.riskPanelAside} sansStack={sansStack}>
      <div style={{ padding: 18, display: 'flex', gap: 18 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `26px repeat(3, ${cell}px)`, gridTemplateRows: `repeat(3, ${cell}px) 22px` }}>
            {[3, 2, 1].map((y) => (
              <React.Fragment key={y}>
                <div style={{
                  fontSize: 9, color: t.textDim, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 6, letterSpacing: 1, fontFamily: sansStack, fontWeight: 600,
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
                        background: `${color}18`,
                        border: `1px solid ${t.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: bug ? 'pointer' : 'default',
                      }}
                    >
                      {bug && (
                        <div style={{
                          padding: '3px 7px', fontSize: 10, fontWeight: 700,
                          background: color, color: '#0d1117', borderRadius: 3,
                          boxShadow: `0 0 10px ${color}88`,
                          transform: hover === bug ? 'scale(1.1)' : 'scale(1)',
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
                fontSize: 9, color: t.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
                letterSpacing: 1, fontFamily: sansStack, fontWeight: 600,
              }}>{l}</div>
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontSize: 9, color: t.textDim, padding: '0 8px',
            letterSpacing: 1, fontFamily: sansStack, fontWeight: 600,
          }}>
            <span>← {L.impactLabel}</span>
            <span>{L.likelihoodLabel} →</span>
          </div>
        </div>

        <div style={{
          flex: 1, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4,
          padding: 14, fontSize: 11.5, lineHeight: 1.6, color: t.textMid,
          minHeight: 220, display: 'flex', flexDirection: 'column',
        }}>
          {hover ? (() => {
            const b = L.bugs.find((x) => x.id === hover.bug);
            return (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: t.textMid, fontSize: 11 }}>{hover.bug}</span>
                  <SeverityPill sev={hover.sev} t={t} />
                </div>
                <div style={{ fontFamily: sansStack, fontWeight: 600, fontSize: 13, color: t.text, marginBottom: 6 }}>
                  {b.title}
                </div>
                <div style={{ fontFamily: sansStack }}>{b.summary}</div>
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px dashed ${t.border}`, fontSize: 10, color: t.textDim }}>
                  {L.likelihoodLabel}=<span style={{ color: t.text }}>{L.levels[hover.x]}</span>
                  {' · '}
                  {L.impactLabel}=<span style={{ color: t.text }}>{L.levels[hover.y]}</span>
                </div>
              </>
            );
          })() : (
            <div style={{ color: t.textDim, margin: 'auto', textAlign: 'center', fontSize: 11 }}>
              {L.hoverNone}<br/>
              <span style={{ fontSize: 10 }}>{L.hoverHint}</span>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ConsoleStuckPanel({ t, L, isRD, sansStack }) {
  return (
    <Panel t={t} title={L.stuckPanelTitle} aside={L.stuckAmount} sansStack={sansStack}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
        <div style={{ padding: '16px 18px', borderRight: `1px solid ${t.border}` }}>
          <MetricLabel t={t} sansStack={sansStack}>{L.findingsLower}</MetricLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {L.findings.map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: t.textMid, fontFamily: sansStack, fontWeight: 500 }}>
                  <span style={{ color: f.tone === 'bad' ? t.fail : t.warn, marginRight: 6 }}>●</span>
                  {f.k}
                </div>
                <div style={{ fontSize: 12, color: t.text, marginTop: 2, paddingLeft: 13, fontFamily: sansStack, lineHeight: 1.5 }}>
                  {f.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 18px', borderRight: `1px solid ${t.border}` }}>
          <MetricLabel t={t} sansStack={sansStack}>{L.timelineLower}</MetricLabel>
          <div style={{ marginTop: 10, position: 'relative', paddingLeft: 14 }}>
            <div style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: 1, background: t.border }} />
            {L.stuckEvents.map((e, i) => {
              const dotColor = e.tone === 'ok' ? t.pass : e.tone === 'warn' ? t.warn : t.fail;
              return (
                <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: -14, top: 4,
                    width: 9, height: 9, borderRadius: 999, background: dotColor,
                    boxShadow: `0 0 8px ${dotColor}88`,
                    border: `2px solid ${t.panel}`,
                  }} />
                  <div style={{ fontSize: 11, color: t.textDim }}>{e.t}</div>
                  <div style={{ fontSize: 12, color: t.text, fontWeight: 600, fontFamily: sansStack, marginTop: 1 }}>{e.label}</div>
                  <div style={{ fontSize: 11, color: t.textMid, marginTop: 1 }}>{e.detail}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '16px 18px' }}>
          <MetricLabel t={t} sansStack={sansStack}>{L.recsLower}</MetricLabel>
          <ol style={{ margin: '8px 0 0', padding: '0 0 0 18px', fontSize: 12, color: t.text, lineHeight: 1.6, fontFamily: sansStack }}>
            {L.recs.map((r, i) => <li key={i} style={{ marginBottom: 8 }}>{r}</li>)}
          </ol>
          {isRD && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${t.border}`, fontSize: 11, color: t.textDim, lineHeight: 1.7 }}>
              {L.affected}<br/>
              {L.tracking}: <span style={{ color: t.accent }}>CAPL-4412</span>, <span style={{ color: t.accent }}>CAPL-4413</span>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { ConsoleView });
