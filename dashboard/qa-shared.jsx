// Shared theme, severity helpers, and tweak plumbing.

// Dark & light palettes. Dark is the primary spec (#0d1117).
const THEMES = {
  dark: {
    bg:         '#0d1117',
    bgElev:     '#0f151c',
    panel:      '#111820',
    panelHi:    '#161d27',
    border:     '#1f2730',
    borderHi:   '#2b343f',
    text:       '#e6edf3',
    textMid:    '#adb7c2',
    textDim:    '#6e7681',
    pass:       '#3fb950',
    passDim:    'rgba(63,185,80,0.18)',
    fail:       '#f85149',
    failDim:    'rgba(248,81,73,0.18)',
    warn:       '#d29922',
    warnDim:    'rgba(210,153,34,0.18)',
    accent:     '#58a6ff',
    grid:       'rgba(255,255,255,0.04)',
  },
  light: {
    bg:         '#f6f8fa',
    bgElev:     '#ffffff',
    panel:      '#ffffff',
    panelHi:    '#f6f8fa',
    border:     '#d0d7de',
    borderHi:   '#afb8c1',
    text:       '#1f2328',
    textMid:    '#4b5259',
    textDim:    '#6e7781',
    pass:       '#1a7f37',
    passDim:    'rgba(26,127,55,0.14)',
    fail:       '#cf222e',
    failDim:    'rgba(207,34,46,0.12)',
    warn:       '#9a6700',
    warnDim:    'rgba(154,103,0,0.14)',
    accent:     '#0969da',
    grid:       'rgba(0,0,0,0.05)',
  },
};

const SEV_TONE = {
  Critical: { bg: 'rgba(248,81,73,0.14)',  fg: '#f85149', dot: '#f85149' },
  High:     { bg: 'rgba(248,81,73,0.10)',  fg: '#ff7b72', dot: '#ff7b72' },
  Medium:   { bg: 'rgba(210,153,34,0.14)', fg: '#d29922', dot: '#d29922' },
  Low:      { bg: 'rgba(88,166,255,0.12)', fg: '#58a6ff', dot: '#58a6ff' },
};

// ── Tweaks plumbing ──────────────────────────────────────────
function useTweaks() {
  const initial = (typeof TWEAKS === 'object' && TWEAKS) || { theme: 'dark', detail: 'rd' };
  const [tw, setTw] = React.useState(initial);
  const [editOn, setEditOn] = React.useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || !e.data.type) return;
      if (e.data.type === '__activate_edit_mode')   setEditOn(true);
      if (e.data.type === '__deactivate_edit_mode') setEditOn(false);
    };
    window.addEventListener('message', handler);
    // announce after listener registered
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (_) {}
    return () => window.removeEventListener('message', handler);
  }, []);

  const update = React.useCallback((patch) => {
    setTw((prev) => ({ ...prev, ...patch }));
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
    } catch (_) {}
  }, []);

  return { tw, editOn, update };
}

function TweaksPanel({ tw, editOn, update }) {
  if (!editOn) return null;
  const t = THEMES[tw.theme] || THEMES.dark;
  const wrap = {
    position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
    background: t.panel, border: `1px solid ${t.borderHi}`, borderRadius: 10,
    padding: '12px 14px', minWidth: 220, color: t.text,
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
  };
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 };
  const label = { color: t.textMid, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 };
  const seg = (active) => ({
    padding: '4px 9px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
    background: active ? t.panelHi : 'transparent',
    color: active ? t.text : t.textDim,
    border: `1px solid ${active ? t.borderHi : t.border}`,
    fontWeight: active ? 600 : 500,
  });
  return (
    <div style={wrap}>
      <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.3 }}>Tweaks</div>
      <div style={row}>
        <span style={label}>Theme</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={seg(tw.theme === 'dark')}  onClick={() => update({ theme: 'dark' })}>Dark</span>
          <span style={seg(tw.theme === 'light')} onClick={() => update({ theme: 'light' })}>Light</span>
        </div>
      </div>
      <div style={row}>
        <span style={label}>Detail</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={seg(tw.detail === 'pm')} onClick={() => update({ detail: 'pm' })}>PM</span>
          <span style={seg(tw.detail === 'rd')} onClick={() => update({ detail: 'rd' })}>RD</span>
        </div>
      </div>
    </div>
  );
}

// ── Small shared atoms ───────────────────────────────────────
function SeverityPill({ sev, t }) {
  const tone = SEV_TONE[sev] || SEV_TONE.Low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: tone.bg, color: tone.fg,
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.dot }} />
      {sev}
    </span>
  );
}

function Mono({ children, style }) {
  return <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace', ...style }}>{children}</span>;
}

function ProgressBar({ value, max, t, tone = 'pass', height = 8 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === 'pass' ? t.pass : tone === 'fail' ? t.fail : t.warn;
  return (
    <div style={{
      position: 'relative', width: '100%', height,
      background: t.panelHi, borderRadius: height / 2, overflow: 'hidden',
      border: `1px solid ${t.border}`,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%',
        background: color, borderRadius: height / 2,
        boxShadow: `0 0 12px ${color}55`,
      }} />
    </div>
  );
}

Object.assign(window, { THEMES, SEV_TONE, useTweaks, TweaksPanel, SeverityPill, Mono, ProgressBar });
