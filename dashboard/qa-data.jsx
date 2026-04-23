// Shared data for both views — now bilingual (en / zh).
// All content here. Views read via CONTENT[lang].

const META = {
  brand: 'Capital Layer',
  date: '2026-04-23',
  env: 'staging.capitallayer.internal',
  build: 'payout-svc 2026.04.22-rc3',
  author: 'QA · A. Ng',
};

const SUMMARY = {
  total: 40, passed: 36, failed: 4, passRate: 90,
  duration: '14m 22s', suites: 6,
};

// Risk matrix positions are language-agnostic.
const RISK = [
  { bug: 'BUG-1', x: 2, y: 3, sev: 'Critical' },
  { bug: 'BUG-2', x: 3, y: 2, sev: 'High' },
  { bug: 'BUG-3', x: 3, y: 1, sev: 'Medium' },
  { bug: 'BUG-4', x: 2, y: 2, sev: 'Medium' },
];

// ─── English content ──────────────────────────────────────────
const EN = {
  subtitle: 'QA Test Report',
  scope: 'Treasury Payout · USDC on Ethereum',
  internal: 'Internal',
  footerInternal: 'Internal · Do not distribute',

  // Section titles
  s1Title: 'Run summary',        s1Sub: 'What we ran, what came back.',
  s2Title: 'Coverage by suite',  s2Sub: 'Pass count vs. total per test category.',
  s3Title: 'Bugs found',         s3Sub: 'Click any card to expand repro & evidence.',
  s4Title: 'Risk matrix',        s4Sub: 'Each bug placed by likelihood (X) vs. impact (Y). Hover for details.',
  s5Title: 'Seed data · payout probe',
  s5Sub:   'Three seeded payouts exercising happy, mismatch, and stuck paths.',
  s6Title: 'STUCK payout · investigation',

  // Verdict banner
  shipBlocked:  'Ship-blocked',
  readyToShip:  'Ready to ship',
  verdictMsg:   'Pass rate is 90%, but one Critical (unauth payout initiate) blocks release.',

  // KPI labels
  totalCases: 'Total cases', passed: 'Passed', failed: 'Failed',
  passRate: 'Pass rate', duration: 'Duration',
  overallDist: 'Overall pass distribution',
  pass: 'pass', fail: 'fail', suites: 'suites',

  // Coverage
  coverageHover: 'Hover a bar to see exact count. Amber = suite not fully green.',
  coverage: [
    { id: 'rbac',       label: 'RBAC · Role Perms',         pass: 8, total: 9,  note: 'UI layer lags API' },
    { id: 'idem',       label: 'Idempotency',               pass: 3, total: 3,  note: 'All keys honored' },
    { id: 'validation', label: 'Input Validation',          pass: 9, total: 11, note: '2 edge cases mis-handled' },
    { id: 'retry',      label: 'Retry Behavior',            pass: 4, total: 4,  note: 'Backoff correct' },
    { id: 'ledger',     label: 'Ledger Reconciliation',     pass: 5, total: 5,  note: 'But see STUCK note' },
    { id: 'ui_rbac',    label: 'UI · Role-gated controls',  pass: 4, total: 5,  note: 'Button visible to Viewer' },
  ],

  // Bug card labels
  impact: 'Impact', expected: 'Expected', actual: 'Actual',
  reproduction: 'Reproduction', evidence: 'Evidence',

  bugs: [
    {
      id: 'BUG-1', severity: 'Critical',
      title: 'Anonymous access to /api/payouts',
      area: 'RBAC · API', owner: '@backend', status: 'Open',
      summary: 'POST without x-user-id header succeeds and creates a payout; idempotency-key is persisted against a null principal.',
      impact: 'Anyone can initiate a payout without authentication. Treasury funds are at direct risk — highest-severity finding of the run.',
      repro: [
        'curl -X POST https://staging…/api/payouts',
        '     (no x-user-id header)',
        '     -H "Idempotency-Key: qa-crit-001"',
        '     -d \'{"to":"0xA1…f7","amount":"100","asset":"USDC"}\'',
        '→ HTTP 202, payout_id=po_01HM9…',
      ],
      expected: 'HTTP 401 Unauthorized; no record created.',
      actual: 'HTTP 202 Accepted; row inserted with principal_id = NULL.',
      evidence: 'request_id=req_9f2c  ·  auth middleware bypassed',
    },
    {
      id: 'BUG-2', severity: 'High',
      title: 'Missing idempotencyKey → 500 (other missing fields return 400)',
      area: 'Validation · API', owner: '@backend', status: 'Open',
      summary: 'Omitting idempotencyKey crashes the server with HTTP 500 — yet all other required fields (walletId, amount, toAddress, asset) correctly return HTTP 400. Only this one field is missing from the validation path.',
      impact: 'Inconsistent validation surface leaks 500s to clients and makes idempotencyKey look like an internal concern rather than a required input.',
      repro: [
        'POST /api/payouts  (body omits "idempotencyKey")',
        '→ HTTP 500  "TypeError: cannot read property of undefined"',
        '',
        '# Control: same request missing "walletId"',
        '→ HTTP 400 { code:"FIELD_REQUIRED", field:"walletId" }  ✓',
      ],
      expected: 'HTTP 400 { code:"FIELD_REQUIRED", field:"idempotencyKey" }.',
      actual: 'HTTP 500 with stack trace; idempotencyKey treated as assumed-present.',
      evidence: 'sentry · PAYOUT-SVC-4412  ·  3 occurrences in run',
    },
    {
      id: 'BUG-3', severity: 'Medium',
      title: 'Missing walletId returns misleading 403 (should be 400)',
      area: 'Validation · API', owner: '@backend', status: 'Open',
      summary: 'Omitting walletId returns HTTP 403 Forbidden instead of 400 Bad Request — the error is classified as an authorization failure rather than an input-validation failure.',
      impact: 'Misleads Ops during triage — looks like an auth / RBAC issue when it is actually a validation issue. Wastes on-call time and pollutes auth error dashboards.',
      repro: [
        'POST /api/payouts  (body omits "walletId")',
        '→ HTTP 403 { error:"forbidden", reason:"wallet_access_denied" }',
      ],
      expected: 'HTTP 400 { code:"FIELD_REQUIRED", field:"walletId" }',
      actual: 'HTTP 403 { error:"forbidden", reason:"wallet_access_denied" }',
      evidence: 'rbac.go:payout_initiate · permission check runs before schema validation',
    },
    {
      id: 'BUG-4', severity: 'Medium',
      title: '"Execute Scenario" button visible & clickable as Viewer',
      area: 'UI · RBAC', owner: '@frontend', status: 'Open',
      summary: 'Signed in as Viewer, the Execute Scenario button still renders and is clickable. It should be hidden or set to disabled for roles without payout:execute.',
      impact: 'Confuses non-operator users; creates support tickets and makes UI RBAC coverage look weaker than backend RBAC.',
      repro: [
        'Log in as viewer@capitallayer.test',
        'Open the Payout Scenarios page',
        '→ "Execute Scenario" button is visible & enabled (click yields 403)',
      ],
      expected: 'Button hidden (or disabled with tooltip) for roles without payout:execute.',
      actual: 'Button visible & enabled; click returns 403.',
      evidence: 'PayoutScenarios.tsx · role guard missing on action bar',
    },
  ],

  // Seed table
  seedHeaders: ['Payout ID / Label', 'Amount', 'Status', 'Provider mode', 'Ledger amount', 'Recon'],
  match: 'match', mismatch: 'mismatch',
  seedFixtureNote: 'Seed loaded via pytest --fixtures=payouts_v2; provider mock ID: mock-payout-svc@2026.04.20.',

  // Risk
  likelihood: 'Likelihood →', impactAxis: 'Impact →',
  levels: ['—','Low','Medium','High'], levelsShort: ['L','M','H'],
  hoverCellHint: 'Hover a cell to inspect the bug.',
  upperRight: 'Upper-right cells carry the most risk.',
  ownerLabel: 'Owner', likelihoodLabel: 'Likelihood', impactLabel: 'Impact',

  // STUCK
  findingsTitle: 'What we found',
  timelineTitle: 'Timeline',
  recsTitle: 'Recommended fixes',
  stuckAmount: 'po_seed_03 · 33.33 USDC · never reached terminal state',
  findings: [
    { k: 'Provider timeout',       v: 'Provider timed out after 46 min (SLA: 5 min hard cap).', tone: 'bad' },
    { k: 'Ledger entries',         v: '0 records — no debit, no credit, no hold.', tone: 'bad' },
    { k: 'Wallet Pending balance', v: 'Wallet Pending 10 USDC ≠ payout amount (33.33) ≠ ledger (0).', tone: 'bad' },
    { k: 'Automated alerting',     v: 'No alert fired. Operator discovered via manual dashboard check.', tone: 'bad' },
    { k: 'Funds status',           v: 'On-chain unmoved. No loss — but system state is inconsistent.', tone: 'warn' },
  ],
  recs: [
    'Hard 5-minute timeout on provider call; transition payout to FAILED_UNKNOWN.',
    'Emit a ledger "hold" entry the moment a payout enters SUBMITTED; reverse on terminal state.',
    'Alert when (wallet.pending − Σ ledger.hold) ≠ 0 for > 2 min.',
    'Run reconciler every 60s to flag SUBMITTED payouts past SLA.',
  ],
  affected: 'affected: payout-svc, ledger-svc, reconciler',
  tracking: 'tracking',

  // Console extras
  caseSequence: 'case sequence',
  case01: 'case 01', caseN: (n) => `case ${n}`,
  runHealthy: 'healthy', runBlocked: 'ship-blocked',
  runPanelTitle: 'run.summary',
  coveragePanelTitle: 'coverage.by_suite',
  coveragePanelAside: 'pass/total',
  bugsPanelTitle: (n) => `bugs.open [${n}]`,
  bugsPanelAside: 'click row to expand',
  seedPanelTitle: 'seed_data.payouts [3]',
  seedPanelAside: 'probe: happy / mismatch / stuck',
  riskPanelTitle: 'risk.matrix',
  riskPanelAside: 'likelihood × impact',
  stuckPanelTitle: 'stuck_payout.investigation',
  findingsLower: 'findings', timelineLower: 'timeline', recsLower: 'recommendations',
  hoverNone: '<hover a cell>', hoverHint: 'top-right = highest risk',

  stuckEvents: [
    { t: '+0m 00s',  label: 'POST /api/payouts',    tone: 'ok',   detail: 'accepted · po_seed_03' },
    { t: '+0m 12s',  label: 'provider.submit',      tone: 'ok',   detail: 'idem-key persisted' },
    { t: '+5m',      label: 'SLA breach',           tone: 'warn', detail: 'no alert fired' },
    { t: '+46m',     label: 'provider timeout',     tone: 'bad',  detail: 'HTTP socket closed' },
    { t: 'now',      label: 'STUCK',                tone: 'bad',  detail: 'ledger=0, wallet.pending=10 (payout=33.33)' },
  ],
};

// ─── Traditional Chinese content ──────────────────────────────
const ZH = {
  subtitle: 'QA 測試報告',
  scope: '財務出款系統 · USDC on Ethereum',
  internal: '內部文件',
  footerInternal: '內部文件 · 請勿外流',

  s1Title: '執行摘要',        s1Sub: '本次測試範圍與結果。',
  s2Title: '測試套件覆蓋率',  s2Sub: '每個測試類別的通過數與總數。',
  s3Title: '發現的問題',      s3Sub: '點擊卡片展開重現步驟與證據。',
  s4Title: '風險矩陣',        s4Sub: '依發生可能性（X）與影響程度（Y）標示各 Bug。滑鼠移上查看詳情。',
  s5Title: '種子資料 · 出款探測',
  s5Sub:   '三筆種子出款，涵蓋正常、不一致、卡住三條路徑。',
  s6Title: 'STUCK 出款 · 深度調查',

  shipBlocked:  '阻擋上線',
  readyToShip:  '可以發布',
  verdictMsg:   '通過率 90%，但一個 Critical 等級問題（未授權出款）阻擋本次發布。',

  totalCases: '總案例數', passed: '通過', failed: '失敗',
  passRate: '通過率', duration: '執行時間',
  overallDist: '整體通過分布',
  pass: '通過', fail: '失敗', suites: '套件',

  coverageHover: '滑鼠移上長條可看精確數字；琥珀色代表該套件未全數通過。',
  coverage: [
    { id: 'rbac',       label: '角色權限 RBAC',       pass: 8, total: 9,  note: 'UI 層落後於 API' },
    { id: 'idem',       label: '冪等性',              pass: 3, total: 3,  note: '所有 key 正確' },
    { id: 'validation', label: '輸入驗證',            pass: 9, total: 11, note: '2 個 edge case 處理錯誤' },
    { id: 'retry',      label: '重試行為',            pass: 4, total: 4,  note: '指數退避正確' },
    { id: 'ledger',     label: '帳本對帳',            pass: 5, total: 5,  note: '但 STUCK 案例見下' },
    { id: 'ui_rbac',    label: 'UI 角色權限控制',     pass: 4, total: 5,  note: 'Viewer 仍可看到按鈕' },
  ],

  impact: '影響', expected: '預期行為', actual: '實際行為',
  reproduction: '重現步驟', evidence: '證據',

  bugs: [
    {
      id: 'BUG-1', severity: 'Critical',
      title: '匿名存取 /api/payouts',
      area: 'RBAC · API', owner: '@backend', status: 'Open',
      summary: '未攜帶 x-user-id header 的 POST 請求仍能成功建立出款；idempotency-key 被以 NULL principal 寫入資料庫。',
      impact: '任何人無需身份驗證即可發起出款，資金面臨直接風險。本次測試最高風險等級問題。',
      repro: [
        'curl -X POST https://staging…/api/payouts',
        '     (未帶 x-user-id header)',
        '     -H "Idempotency-Key: qa-crit-001"',
        '     -d \'{"to":"0xA1…f7","amount":"100","asset":"USDC"}\'',
        '→ HTTP 202, payout_id=po_01HM9…',
      ],
      expected: 'HTTP 401 Unauthorized；不應建立任何紀錄。',
      actual: 'HTTP 202 Accepted；已寫入資料列，principal_id = NULL。',
      evidence: 'request_id=req_9f2c  ·  auth middleware 被繞過',
    },
    {
      id: 'BUG-2', severity: 'High',
      title: '缺少 idempotencyKey 導致 Server 500（其他欄位均正確回 400）',
      area: '輸入驗證 · API', owner: '@backend', status: 'Open',
      summary: '缺少 idempotencyKey 導致 Server 500，其他必填欄位（walletId、amount、toAddress、asset）缺少均正確回傳 400，唯獨此欄位驗證路徑缺失。',
      impact: '驗證表面不一致，500 錯誤外洩給客戶端，讓 idempotencyKey 看起來像內部問題而非必填輸入。',
      repro: [
        'POST /api/payouts  (body 缺 "idempotencyKey")',
        '→ HTTP 500  "TypeError: cannot read property of undefined"',
        '',
        '# 對照組：同一請求缺 "walletId"',
        '→ HTTP 400 { code:"FIELD_REQUIRED", field:"walletId" }  ✓',
      ],
      expected: 'HTTP 400 { code:"FIELD_REQUIRED", field:"idempotencyKey" }',
      actual: 'HTTP 500 並回傳 stack trace；idempotencyKey 被預設為一定存在。',
      evidence: 'sentry · PAYOUT-SVC-4412  ·  本次執行 3 次',
    },
    {
      id: 'BUG-3', severity: 'Medium',
      title: '缺少 walletId 回傳誤導性 403，應回傳 400',
      area: '輸入驗證 · API', owner: '@backend', status: 'Open',
      summary: '缺少 walletId 時回傳 HTTP 403 而非 400，錯誤被分類為授權失敗而非輸入驗證失敗。',
      impact: '誤導 on-call 值班工程師：看起來像 auth / RBAC 問題，實際上只是輸入驗證。浪費排查時間並污染授權錯誤儀表板。',
      repro: [
        'POST /api/payouts  (body 缺 "walletId")',
        '→ HTTP 403 { error:"forbidden", reason:"wallet_access_denied" }',
      ],
      expected: 'HTTP 400 { code:"FIELD_REQUIRED", field:"walletId" }',
      actual: 'HTTP 403 { error:"forbidden", reason:"wallet_access_denied" }',
      evidence: 'rbac.go:payout_initiate · 權限檢查先於 schema 驗證執行',
    },
    {
      id: 'BUG-4', severity: 'Medium',
      title: 'viewer 身份下 Execute Scenario 按鈕仍可見且可點擊',
      area: 'UI · RBAC', owner: '@frontend', status: 'Open',
      summary: 'viewer 身份下 Execute Scenario 按鈕仍然可見且可點擊，應隱藏或設為 disabled。',
      impact: '混淆非 operator 使用者，造成客服工單，並讓 UI 層 RBAC 覆蓋率看起來比後端差。',
      repro: [
        '以 viewer@capitallayer.test 登入',
        '開啟 Payout Scenarios 頁面',
        '→ "Execute Scenario" 按鈕可見且可點擊（點擊後後端回 403）',
      ],
      expected: '沒有 payout:execute 權限的角色應看不到按鈕（或按鈕為 disabled 並附說明）。',
      actual: '按鈕可見且可點擊；點擊後回 403。',
      evidence: 'PayoutScenarios.tsx · action bar 缺 role guard',
    },
  ],

  seedHeaders: ['出款編號 / 標籤', '金額', '狀態', 'Provider 模式', '帳本金額', '對帳結果'],
  match: '一致', mismatch: '不一致',
  seedFixtureNote: '種子由 pytest --fixtures=payouts_v2 載入；Provider mock：mock-payout-svc@2026.04.20。',

  likelihood: '發生可能性 →', impactAxis: '影響程度 →',
  levels: ['—','低','中','高'], levelsShort: ['低','中','高'],
  hoverCellHint: '滑鼠移上查看詳情。',
  upperRight: '右上角風險最高。',
  ownerLabel: '負責', likelihoodLabel: '發生可能性', impactLabel: '影響程度',

  findingsTitle: '調查發現',
  timelineTitle: '時間軸',
  recsTitle: '修復建議',
  stuckAmount: 'po_seed_03 · 33.33 USDC · 從未抵達終止狀態',
  findings: [
    { k: 'Provider 逾時',         v: 'Provider 在 46 分鐘後逾時放棄（SLA 規定上限為 5 分鐘）。', tone: 'bad' },
    { k: '帳本紀錄',               v: '帳本紀錄為 0，無借記、貸記或凍結紀錄。', tone: 'bad' },
    { k: '錢包 Pending 餘額',       v: '錢包 Pending 10 USDC 與出款金額（33.33）、帳本（0）皆不符。', tone: 'bad' },
    { k: '自動告警',               v: '未觸發任何通知，由值班人員以手動儀表板檢查才發現。', tone: 'bad' },
    { k: '資金狀態',               v: '鏈上資金未移動，無實際損失，但系統狀態不一致。', tone: 'warn' },
  ],
  recs: [
    '對 Provider 呼叫設定 5 分鐘強制逾時，過後將出款轉為 FAILED_UNKNOWN。',
    '出款進入 SUBMITTED 狀態時立即寫入帳本凍結紀錄，終止狀態時反轉。',
    '當錢包 Pending 與帳本凍結總額差異持續超過 2 分鐘時觸發告警。',
    '每 60 秒執行對帳任務，標記超過 SLA 的 SUBMITTED 出款。',
  ],
  affected: '影響服務：payout-svc、ledger-svc、reconciler',
  tracking: '追蹤單號',

  caseSequence: '案例序列',
  case01: '第 01 筆', caseN: (n) => `第 ${n} 筆`,
  runHealthy: '健康', runBlocked: '阻擋上線',
  runPanelTitle: '執行摘要',
  coveragePanelTitle: '套件覆蓋率',
  coveragePanelAside: '通過 / 總數',
  bugsPanelTitle: (n) => `待修 Bug [${n}]`,
  bugsPanelAside: '點擊列展開',
  seedPanelTitle: '種子資料 · 出款 [3]',
  seedPanelAside: '探測：正常 / 不一致 / 卡住',
  riskPanelTitle: '風險矩陣',
  riskPanelAside: '可能性 × 影響程度',
  stuckPanelTitle: 'STUCK 出款 · 深度調查',
  findingsLower: '調查發現', timelineLower: '時間軸', recsLower: '修復建議',
  hoverNone: '〈請移上格子〉', hoverHint: '越靠右上角風險越高',

  stuckEvents: [
    { t: '+0m 00s',  label: 'POST /api/payouts',    tone: 'ok',   detail: '已接受 · po_seed_03' },
    { t: '+0m 12s',  label: 'provider.submit',      tone: 'ok',   detail: 'idem-key 已寫入' },
    { t: '+5m',      label: 'SLA 超時',              tone: 'warn', detail: '未觸發告警' },
    { t: '+46m',     label: 'Provider 逾時',         tone: 'bad',  detail: 'HTTP socket 關閉' },
    { t: 'now',      label: 'STUCK',                tone: 'bad',  detail: 'ledger=0、wallet.pending=10（出款=33.33）' },
  ],
};

const CONTENT = { en: EN, zh: ZH };

// SEED rows keyed by id — view picks text per lang from here:
const SEED = [
  { id: 'po_seed_01', label: 'payout_seed_completed',  amount: '125.12', asset: 'USDC', status: 'COMPLETED', provider: 'mock=success',        ledger: '125.12', recon: 'match',    delta: null },
  { id: 'po_seed_02', label: 'payout_seed_mismatch',   amount: '88.88',  asset: 'USDC', status: 'COMPLETED', provider: 'mock=success',        ledger: '80.88',  recon: 'mismatch', delta: '−8.00' },
  { id: 'po_seed_03', label: 'payout_seed_processing', amount: '33.33',  asset: 'USDC', status: 'STUCK',     provider: 'mock=timeout(46m)',   ledger: '0.00',   recon: 'mismatch', delta: '−33.33' },
];

Object.assign(window, { META, SUMMARY, CONTENT, SEED, RISK });
