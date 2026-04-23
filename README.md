# payout-sandbox-qa

![CI](https://github.com/mikewang71/payout-sandbox-qa/actions/workflows/qa.yml/badge.svg)

Capital Layer QA Take-home 作業提交
作者：Mike Wang
日期：2026-04-23

## 測試環境

- Python 3.12
- pytest + requests + playwright
- 本地需啟動 payout sandbox（`mise run dev`）

## 執行方式

安裝依賴：
```bash
pip install -r tests/requirements.txt
playwright install firefox
```

執行 API 測試：
```bash
pytest tests/test_api.py -v
```

執行 UI 測試：
```bash
pytest tests/test_ui.py -v
```

執行全部：
```bash
pytest tests/ -v
```

預期結果：40 案例，36 passed，4 failed（均為 confirmed bugs）

## 測試結構

| 類別 | 檔案 | 案例數 |
|---|---|---|
| API 測試 | tests/test_api.py | 35 |
| UI 測試 | tests/test_ui.py | 5 |

## 主要發現

| Bug | 嚴重等級 | 說明 |
|---|---|---|
| BUG-1 | Critical | 匿名存取未攔截，任何人可發起出款 |
| BUG-2 | High | 缺少 idempotencyKey 導致 Server 500 |
| BUG-3 | Medium | 缺少 walletId 回傳誤導性 403 |
| BUG-4 | Medium | viewer 可見 Execute Scenario 按鈕 |

完整報告請見 [bug_report.md](bug_report.md)
