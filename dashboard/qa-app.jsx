// App shell — mounts both views (EN + ZH) inside a design canvas.

function QAApp() {
  const { tw, editOn, update } = useTweaks();

  return (
    <>
      <DesignCanvas>
        <DCSection id="english" title="QA Dashboard · English"
          subtitle="A · Report (document style)   ·   B · Console (ops panel style)">
          <DCArtboard id="report-en"  label="A · Report view · EN"  width={1440} height={2380}>
            <ReportView  tw={tw} lang="en" />
          </DCArtboard>
          <DCArtboard id="console-en" label="B · Console view · EN" width={1440} height={2280}>
            <ConsoleView tw={tw} lang="en" />
          </DCArtboard>
        </DCSection>
        <DCSection id="traditional-chinese" title="QA 測試報告 · 繁體中文"
          subtitle="A · 報告版面（文件感）   ·   B · 監控面板版面（操作台感）">
          <DCArtboard id="report-zh"  label="A · 報告版面 · 繁中"  width={1440} height={2500}>
            <ReportView  tw={tw} lang="zh" />
          </DCArtboard>
          <DCArtboard id="console-zh" label="B · 監控面板 · 繁中" width={1440} height={2380}>
            <ConsoleView tw={tw} lang="zh" />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
      <TweaksPanel tw={tw} editOn={editOn} update={update} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<QAApp />);
