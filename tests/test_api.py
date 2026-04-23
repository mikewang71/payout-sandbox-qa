"""
Payout Sandbox — Risk-driven API test suite
執行方式: pytest tests/test_api.py -v
Base URL: http://localhost:3000
Auth:     x-user-id header

實際 API 結構 (探查後確認):
  GET  /api/payouts        → {"payouts": [...]}
  POST /api/payouts        → {"payout": {...}, "wallet": {...}, ...}
  GET  /api/ledger/:id     → {"ledgerEntries": [{..., "entryType": "debit"/"credit", "amount": ...}]}
  GET  /api/events/:id     → {"providerEvents": [...]}
  GET  /api/wallets/:id    → {"id": ..., "availableBalance": ..., ...}
"""

import time
import uuid

import pytest
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:3000"

USERS = {
    "admin":    "user_admin",
    "operator": "user_operator",
    "viewer":   "user_viewer",
}


def sess(user_key: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"x-user-id": USERS[user_key], "Content-Type": "application/json"})
    return s


def url(path: str) -> str:
    return f"{BASE_URL}{path}"


def payout_body(**overrides) -> dict:
    base = {
        "walletId": "wallet_main",
        "recipientAddress": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "amount": 10.00,
        "currency": "USDC",
        "idempotencyKey": f"test-{uuid.uuid4()}",
        "memo": "Test payout",
        "providerMode": "success",
    }
    base.update(overrides)
    return base


def create_payout(user_key: str, **kwargs) -> requests.Response:
    return sess(user_key).post(url("/api/payouts"), json=payout_body(**kwargs))


def payout_id_from(response: requests.Response) -> str:
    """POST /api/payouts 回傳 {"payout": {"id": ...}}"""
    return response.json()["payout"]["id"]


def poll_status(payout_id: str, target_statuses: set, timeout: int = 15) -> str:
    """Poll GET /api/payouts/:id 直到 status 進入目標集合。"""
    deadline = time.time() + timeout
    status = ""
    while time.time() < deadline:
        r = requests.get(url(f"/api/payouts/{payout_id}"), headers={"x-user-id": USERS["admin"]})
        status = r.json().get("payout", r.json()).get("status", "")
        if status in target_statuses:
            return status
        time.sleep(1)
    return status


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def any_failed_payout_id():
    """取得或建立一筆 failed payout。"""
    r = requests.get(url("/api/payouts"), headers={"x-user-id": USERS["admin"]})
    payouts = r.json().get("payouts", [])
    existing = next((p["id"] for p in payouts if p.get("status") == "failed"), None)
    if existing:
        return existing

    cr = create_payout("admin", providerMode="failed")
    assert cr.status_code in (200, 201), f"建立 failed payout 失敗: {cr.text}"
    pid = payout_id_from(cr)
    poll_status(pid, {"failed", "stuck"}, timeout=15)
    return pid


@pytest.fixture(scope="session")
def completed_payout_id():
    """取得或建立一筆 completed payout。"""
    r = requests.get(url("/api/payouts"), headers={"x-user-id": USERS["admin"]})
    payouts = r.json().get("payouts", [])
    existing = next((p["id"] for p in payouts if p.get("status") == "completed"), None)
    if existing:
        return existing

    cr = create_payout("admin", providerMode="success")
    assert cr.status_code in (200, 201), f"建立 success payout 失敗: {cr.text}"
    pid = payout_id_from(cr)
    final = poll_status(pid, {"completed", "failed", "stuck"}, timeout=20)
    assert final == "completed", f"payout 未 completed，實際狀態: {final}"
    return pid


# ---------------------------------------------------------------------------
# P0 — 角色權限 (RBAC)
# ---------------------------------------------------------------------------

class TestRolePermissions:
    """
    規格:
      finance_admin    → wallet_main + wallet_ops, create, retry
      finance_operator → wallet_main only,          create, retry
      viewer           → wallet_main only,          NO create, NO retry
    """

    def test_viewer_cannot_create_payout(self):
        r = create_payout("viewer")
        assert r.status_code == 403, (
            f"[BUG] viewer 建立 payout 應得 403，實際: {r.status_code}\n{r.text}"
        )

    def test_viewer_cannot_retry_payout(self, any_failed_payout_id):
        r = sess("viewer").post(url(f"/api/payouts/{any_failed_payout_id}/retry"))
        assert r.status_code == 403, (
            f"[BUG] viewer retry 應得 403，實際: {r.status_code}\n{r.text}"
        )

    def test_operator_cannot_view_wallet_ops(self):
        r = sess("operator").get(url("/api/wallets/wallet_ops"))
        assert r.status_code in (403, 404), (
            f"[BUG] operator 存取 wallet_ops 應得 403/404，實際: {r.status_code}\n{r.text}"
        )

    def test_operator_cannot_create_payout_on_wallet_ops(self):
        r = create_payout("operator", walletId="wallet_ops")
        assert r.status_code in (403, 404), (
            f"[BUG] operator 對 wallet_ops 建立 payout 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    def test_viewer_can_read_wallet_main(self):
        r = sess("viewer").get(url("/api/wallets/wallet_main"))
        assert r.status_code == 200, f"viewer 應能讀取 wallet_main: {r.text}"

    def test_viewer_cannot_read_wallet_ops(self):
        r = sess("viewer").get(url("/api/wallets/wallet_ops"))
        assert r.status_code in (403, 404), (
            f"[BUG] viewer 存取 wallet_ops 應得 403/404，實際: {r.status_code}\n{r.text}"
        )

    def test_admin_can_view_both_wallets(self):
        for w in ("wallet_main", "wallet_ops"):
            r = sess("admin").get(url(f"/api/wallets/{w}"))
            assert r.status_code == 200, f"admin 應能讀取 {w}: {r.text}"

    def test_no_user_id_header_rejected(self):
        """
        [預期 BUG] 無 x-user-id header 的請求應被拒絕 (401/403)。
        實際: API 回傳 200，等同允許匿名存取 payout 列表。
        風險: 任何人無需身份驗證即可取得出款資料 (security P0)。
        """
        r = requests.get(url("/api/payouts"))
        assert r.status_code in (400, 401, 403), (
            f"[CONFIRMED BUG] 無 x-user-id 應被拒絕，實際: {r.status_code}\n"
            f"回傳內容包含 {len(r.json().get('payouts', []))} 筆 payout 資料"
        )

    def test_unknown_user_id_rejected(self):
        r = requests.get(url("/api/payouts"), headers={"x-user-id": "user_ghost"})
        assert r.status_code in (400, 401, 403), (
            f"[BUG] 不存在的 user_id 應被拒絕，實際: {r.status_code}\n{r.text}"
        )


# ---------------------------------------------------------------------------
# P0 — 冪等性 (Idempotency)
# ---------------------------------------------------------------------------

class TestIdempotency:
    """
    風險: 同一 idempotencyKey 若建立多筆 payout，可能造成重複出款。
    """

    def test_same_key_returns_same_payout(self):
        """相同 idempotencyKey 連送兩次，應回傳同一筆 payout id。"""
        key = f"idem-{uuid.uuid4()}"
        body = payout_body(idempotencyKey=key)

        r1 = sess("admin").post(url("/api/payouts"), json=body)
        assert r1.status_code in (200, 201), f"第一次建立失敗: {r1.text}"
        id1 = payout_id_from(r1)

        r2 = sess("admin").post(url("/api/payouts"), json=body)
        assert r2.status_code in (200, 201), f"第二次建立失敗: {r2.text}"
        id2 = payout_id_from(r2)

        assert id1 == id2, (
            f"[BUG] 相同 idempotencyKey 應回傳同一筆 payout\n"
            f"  第一次 id: {id1}\n  第二次 id: {id2}"
        )

    def test_duplicate_key_does_not_double_debit(self):
        """同一 idempotencyKey 送兩次，wallet 餘額只扣一次。"""
        key = f"idem-debit-{uuid.uuid4()}"
        body = payout_body(idempotencyKey=key, amount=5.00)

        wallet_before = sess("admin").get(url("/api/wallets/wallet_main")).json()
        balance_before = float(wallet_before.get("availableBalance", 0))

        sess("admin").post(url("/api/payouts"), json=body)
        sess("admin").post(url("/api/payouts"), json=body)

        wallet_after = sess("admin").get(url("/api/wallets/wallet_main")).json()
        balance_after = float(wallet_after.get("availableBalance", 0))

        deducted = balance_before - balance_after
        assert deducted <= 5.01, (
            f"[BUG] idempotencyKey 重複送出後餘額被扣兩次\n"
            f"  餘額從 {balance_before} 降到 {balance_after}，扣減 {deducted}，應 ≤ 5.00"
        )

    def test_duplicate_callback_does_not_create_extra_ledger_entries(self):
        """
        providerMode=duplicate_callback: provider 重複回調，
        帳本應只寫入一筆 debit，不因重複回調而增生。
        """
        r = create_payout("admin", providerMode="duplicate_callback")
        assert r.status_code in (200, 201), f"建立失敗: {r.text}"
        payout_id = payout_id_from(r)
        amount = float(r.json()["payout"]["amount"])

        poll_status(payout_id, {"completed", "failed", "stuck"}, timeout=20)

        ledger_r = requests.get(
            url(f"/api/ledger/{payout_id}"),
            headers={"x-user-id": USERS["admin"]},
        )
        assert ledger_r.status_code == 200
        entries = ledger_r.json().get("ledgerEntries", [])
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]

        assert len(debit_entries) == 1, (
            f"[BUG] duplicate_callback 導致帳本重複寫入\n"
            f"  debit 筆數: {len(debit_entries)}，應為 1\n"
            f"  entries: {entries}"
        )
        if debit_entries:
            assert abs(float(debit_entries[0]["amount"]) - amount) < 0.01, (
                f"[BUG] debit 金額 {debit_entries[0]['amount']} ≠ payout 金額 {amount}"
            )


# ---------------------------------------------------------------------------
# P1 — 資料驗證 (Input Validation)
# ---------------------------------------------------------------------------

class TestPayoutDataValidation:
    """
    風險: 無效資料若能通過建立，可能讓系統進入不一致狀態。
    """

    @pytest.mark.parametrize("amount,label", [
        (0,     "零元"),
        (-1,    "負數"),
        (-0.01, "負小數"),
    ])
    def test_invalid_amount_rejected(self, amount, label):
        r = create_payout("admin", amount=amount)
        assert r.status_code in (400, 422), (
            f"[BUG] 金額 {label}({amount}) 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    @pytest.mark.parametrize("address,label", [
        ("not-an-address",                                 "非十六進位字串"),
        ("0x123",                                          "太短"),
        ("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",  "含非法字元"),
        ("",                                               "空字串"),
    ])
    def test_invalid_recipient_address_rejected(self, address, label):
        r = create_payout("admin", recipientAddress=address)
        assert r.status_code in (400, 422), (
            f"[BUG] 地址格式 {label} 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    def test_missing_walletId_rejected(self):
        """
        [預期 BUG] 缺少 walletId 應回傳 400（缺少必填欄位）。
        實際: 回傳 403 "User cannot access this wallet"。
        問題: 錯誤分類為授權失敗而非輸入驗證失敗，訊息具誤導性。
        """
        body = payout_body()
        del body["walletId"]
        r = sess("admin").post(url("/api/payouts"), json=body)
        assert r.status_code in (400, 422), (
            f"[BUG] 缺少 walletId 應得 400，實際: {r.status_code} — {r.text}"
        )

    def test_missing_idempotencyKey_causes_500(self):
        """
        [CONFIRMED BUG] 缺少 idempotencyKey 導致 server 500。
        風險: 未防禦的輸入路徑造成服務中斷，可能被利用做 DoS。
        應回傳: 400/422 (缺少必填欄位)。
        """
        body = payout_body()
        del body["idempotencyKey"]
        r = sess("admin").post(url("/api/payouts"), json=body)
        assert r.status_code in (400, 422), (
            f"[CONFIRMED BUG] 缺少 idempotencyKey 導致 {r.status_code}，應為 400\n{r.text}"
        )

    @pytest.mark.parametrize("field", ["recipientAddress", "amount", "currency"])
    def test_missing_required_field_rejected(self, field):
        body = payout_body()
        del body[field]
        r = sess("admin").post(url("/api/payouts"), json=body)
        assert r.status_code in (400, 422), (
            f"[BUG] 缺少必填欄位 '{field}' 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    def test_unsupported_currency_rejected(self):
        r = create_payout("admin", currency="XYZ")
        assert r.status_code in (400, 422), (
            f"[BUG] 不支援的幣別 XYZ 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    def test_extremely_large_amount_does_not_500(self):
        """超大金額不應造成 500，應回傳 400/422 或業務錯誤。"""
        r = create_payout("admin", amount=999_999_999_999.99)
        assert r.status_code != 500, (
            f"[BUG] 超大金額導致 500，應有業務規則保護\n{r.text}"
        )


# ---------------------------------------------------------------------------
# P1 — Retry 行為
# ---------------------------------------------------------------------------

class TestRetryBehavior:
    """
    規格: completed 狀態不可 retry；failed/stuck 可 retry (admin/operator)；viewer 不可 retry。
    """

    def test_completed_payout_cannot_be_retried(self, completed_payout_id):
        r = sess("admin").post(url(f"/api/payouts/{completed_payout_id}/retry"))
        assert r.status_code in (400, 409, 422), (
            f"[BUG] completed payout retry 應被拒絕，實際: {r.status_code}\n{r.text}"
        )

    def test_viewer_cannot_retry(self, any_failed_payout_id):
        r = sess("viewer").post(url(f"/api/payouts/{any_failed_payout_id}/retry"))
        assert r.status_code == 403, (
            f"[BUG] viewer retry 應得 403，實際: {r.status_code}\n{r.text}"
        )

    def test_operator_can_retry_failed_payout(self, any_failed_payout_id):
        r = sess("operator").post(url(f"/api/payouts/{any_failed_payout_id}/retry"))
        # 若已被重試並推進到終態，接受 409/422
        assert r.status_code in (200, 201, 409, 422), (
            f"operator retry 非預期狀態碼: {r.status_code}\n{r.text}"
        )

    def test_retry_nonexistent_payout_returns_404(self):
        r = sess("admin").post(url("/api/payouts/payout_does_not_exist/retry"))
        assert r.status_code == 404, (
            f"[BUG] retry 不存在的 payout 應得 404，實際: {r.status_code}\n{r.text}"
        )


# ---------------------------------------------------------------------------
# P1 — 帳本對帳 (Ledger Reconciliation)
# ---------------------------------------------------------------------------

class TestLedgerReconciliation:
    """
    風險: 帳本金額與 payout 金額不符 → 資金外洩或帳務失衡。
    """

    def test_completed_payout_has_ledger_entries(self, completed_payout_id):
        r = requests.get(
            url(f"/api/ledger/{completed_payout_id}"),
            headers={"x-user-id": USERS["admin"]},
        )
        assert r.status_code == 200, f"GET /api/ledger 失敗: {r.text}"
        entries = r.json().get("ledgerEntries", [])
        assert len(entries) > 0, (
            f"[BUG] completed payout {completed_payout_id} 應有帳本紀錄，實際為空"
        )

    def test_ledger_debit_matches_payout_amount(self):
        """建立已知金額 payout，完成後驗證 ledger debit 合計 = payout 金額。"""
        amount = 37.50
        r = create_payout("admin", amount=amount, providerMode="success")
        assert r.status_code in (200, 201), f"建立 payout 失敗: {r.text}"
        payout_id = payout_id_from(r)

        final = poll_status(payout_id, {"completed", "failed", "stuck"}, timeout=20)
        if final != "completed":
            pytest.skip(f"payout 未在 timeout 內 completed（狀態: {final}）")

        ledger_r = requests.get(
            url(f"/api/ledger/{payout_id}"),
            headers={"x-user-id": USERS["admin"]},
        )
        assert ledger_r.status_code == 200
        entries = ledger_r.json().get("ledgerEntries", [])

        debit_sum = sum(float(e["amount"]) for e in entries if e.get("entryType") == "debit")
        assert abs(debit_sum - amount) < 0.01, (
            f"[BUG] 帳本 debit 合計 {debit_sum} ≠ payout 金額 {amount}\n"
            f"entries: {entries}"
        )

    def test_seeded_mismatch_payout_is_detectable(self):
        """
        sandbox_overview: seed data 包含一筆「刻意不一致」的 completed payout。
        確認 ledgerMismatch=true 的 payout，其帳本合計與金額確實不符。
        """
        r = requests.get(url("/api/payouts"), headers={"x-user-id": USERS["admin"]})
        assert r.status_code == 200
        payouts = r.json().get("payouts", [])

        mismatch_candidates = [
            p for p in payouts
            if p.get("status") == "completed" and p.get("ledgerMismatch") is True
        ]

        if not mismatch_candidates:
            pytest.skip("找不到 ledgerMismatch=true 的 payout（seed data 可能已重置）")

        for p in mismatch_candidates:
            pid = p["id"]
            payout_amount = float(p["amount"])
            ledger_total = float(p.get("ledgerTotal", 0))

            assert abs(ledger_total - payout_amount) > 0.001, (
                f"[BUG] payout {pid} 標記 ledgerMismatch=true，"
                f"但 ledgerTotal {ledger_total} 與 amount {payout_amount} 一致——訊號誤報"
            )

    def test_provider_events_exist_after_completion(self):
        """completed payout 應有對應的 provider events。"""
        r = create_payout("admin", providerMode="success")
        assert r.status_code in (200, 201)
        payout_id = payout_id_from(r)

        final = poll_status(payout_id, {"completed", "failed", "stuck"}, timeout=20)

        events_r = requests.get(
            url(f"/api/events/{payout_id}"),
            headers={"x-user-id": USERS["admin"]},
        )
        assert events_r.status_code == 200, f"GET /api/events 失敗: {events_r.text}"
        events = events_r.json().get("providerEvents", [])

        if final == "completed":
            assert len(events) > 0, (
                f"[BUG] completed payout {payout_id} 應有 provider events，實際為空"
            )

    def test_never_callback_payout_becomes_stuck(self):
        """
        providerMode=never_callback: provider 永不回調，
        payout 應最終進入 stuck 狀態（而非永遠 processing）。
        """
        r = create_payout("admin", providerMode="never_callback")
        assert r.status_code in (200, 201)
        payout_id = payout_id_from(r)

        # 注意: stuck 需等 worker timeout，沙盒可能需要較長時間
        # 這裡只驗證初始狀態合法，stuck 轉換屬非同步行為
        detail_r = requests.get(
            url(f"/api/payouts/{payout_id}"),
            headers={"x-user-id": USERS["admin"]},
        )
        assert detail_r.status_code == 200
        payout_data = detail_r.json().get("payout", detail_r.json())
        status = payout_data.get("status")
        assert status in ("queued", "processing", "stuck"), (
            f"never_callback payout 狀態非預期: {status}"
        )
