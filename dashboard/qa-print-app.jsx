// Print-specific app shell — bypasses DesignCanvas; renders each view
// as a plain page sized to match its artboard.
// The source QA Dashboard.html uses these tweaks: theme=light, detail=rd.

function QAPrintApp() {
  // Use the same in-page TWEAKS block so the printed version reflects the
  // current in-app state.
  const tw = (typeof TWEAKS === 'object' && TWEAKS) || { theme: 'light', detail: 'rd' };

  const pages = [
    { id: 'report-en',  Comp: ReportView,  lang: 'en', height: 2380 },
    { id: 'console-en', Comp: ConsoleView, lang: 'en', height: 2280 },
    { id: 'report-zh',  Comp: ReportView,  lang: 'zh', height: 2500 },
    { id: 'console-zh', Comp: ConsoleView, lang: 'zh', height: 2380 },
  ];

  return (
    <div className="print-root">
      {pages.map((p) => (
        <section
          key={p.id}
          className="print-page"
          style={{ width: 1440, minHeight: p.height }}
        >
          <p.Comp tw={tw} lang={p.lang} />
        </section>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<QAPrintApp />);

// Auto-print once fonts + JSX are parsed.
(async () => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
  await new Promise((r) => setTimeout(r, 500));
  window.print();
})();
