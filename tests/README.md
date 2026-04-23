# QA 測試套件說明

本測試套件為 Capital Layer QA take-home 作業的提交內容，針對 Payout Sandbox 財務出款系統進行風險導向的 API 測試。

---

## 環境需求

- Python 3.8+
- pytest 7.0+
- requests 2.31+
- Payout Sandbox 服務運行於 `http://localhost:3000`

## 安裝步驟

```bash
pip install pytest requests
```

或使用 requirements.txt：

```bash
pip install -r tests/requirements.txt
```

## 執行測試

```bash
# 執行完整測試套件（建議從專案根目錄執行）
python3 -m pytest tests/test_api.py -v

# 執行特定類別
python3 -m pytest tests/test_api.py::TestRolePermissions -v
python3 -m pytest tests/test_api.py::TestIdempotency -v
python3 -m pytest tests/test_api.py::TestPayoutDataValidation -v
python3 -m pytest tests/test_api.py::TestRetryBehavior -v
python3 -m pytest tests/test_api.py::TestLedgerReconciliation -v
```

**預期結果：** 35 個案例，32 passed，3 failed（均為已確認的 bugs，FAILED 狀態本身即為 bug 的證據）

---

## 測試結構

共 **35 個測試案例**，依風險優先順序分為五個類別：

| 類別 | 案例數 | 風險等級 | 涵蓋內容 |
|------|--------|----------|----------|
| `TestRolePermissions` | 9 | P0 | viewer/operator 的越權操作、匿名存取 |
| `TestIdempotency` | 3 | P0 | 相同 key 重複送出、duplicate_callback 帳本防護 |
| `TestPayoutDataValidation` | 11 | P1 | 金額、地址、必填欄位的輸入驗證（參數化） |
| `TestRetryBehavior` | 4 | P1 | completed 不可 retry、角色限制、不存在的 payout |
| `TestLedgerReconciliation` | 5 | P1 | 帳本金額一致性、mismatch 偵測、provider events |

---

## 主要發現

| # | 嚴重等級 | 說明 |
|---|----------|------|
| BUG-1 | 🔴 Critical | 無 `x-user-id` header 的匿名請求回傳 HTTP 200，洩露所有 payout 資料 |
| BUG-2 | 🔴 High | 缺少 `idempotencyKey` 導致 HTTP 500，應回傳 400（唯一未驗證的必填欄位） |
| BUG-3 | 🟡 Medium | 缺少 `walletId` 回傳誤導性的 403，應回傳 400（錯誤分類為授權失敗） |

完整的 bug 報告與 seed data 對帳調查請見 [bug_report.md](../bug_report.md)。
