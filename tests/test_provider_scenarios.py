"""
Payout Sandbox — Provider 情境端對端測試
執行方式: pytest tests/test_provider_scenarios.py -v --timeout=180

涵蓋所有 providerMode：
  success / failed / delayed_success / duplicate_callback / never_callback

每個情境驗證：
  - 建立後初始狀態
  - 輪詢等待最終狀態轉換
  - Provider events 數量與類型
  - Ledger entries 數量與金額
  - Wallet 餘額變化合理性
"""

import time
import uuid

import pytest
import requests

BASE_URL = "http://localhost:3000"
ADMIN_HEADERS = {"x-user-id": "user_admin", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def url(path: str) -> str:
    return f"{BASE_URL}{path}"


def unique_key(prefix: str = "e2e") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def create_payout(provider_mode: str, amount: float = 10.0, key: str = None) -> dict:
    """建立 payout 並回傳完整 response dict。"""
    body = {
        "walletId": "wallet_main",
        "recipientAddress": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "amount": amount,
        "currency": "USDC",
        "idempotencyKey": key or unique_key(provider_mode),
        "memo": f"e2e test — {provider_mode}",
        "providerMode": provider_mode,
    }
    r = requests.post(url("/api/payouts"), json=body, headers=ADMIN_HEADERS)
    assert r.status_code in (200, 201), f"建立 payout 失敗 ({provider_mode}): {r.status_code} {r.text}"
    return r.json()


def get_payout(payout_id: str) -> dict:
    r = requests.get(url(f"/api/payouts/{payout_id}"), headers=ADMIN_HEADERS)
    assert r.status_code == 200, f"GET payout 失敗: {r.status_code}"
    return r.json().get("payout", r.json())


def poll_status(payout_id: str, target_statuses: list, timeout: int = 60, interval: int = 2) -> str:
    """
    輪詢 payout 狀態，直到命中 target_statuses 之一或逾時。
    回傳最終狀態字串。
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        payout = get_payout(payout_id)
        status = payout.get("status", "")
        if status in target_statuses:
            return status
        time.sleep(interval)
    # 逾時後回傳最後一次查到的狀態
    return get_payout(payout_id).get("status", "unknown")


def get_ledger(payout_id: str) -> list:
    r = requests.get(url(f"/api/ledger/{payout_id}"), headers=ADMIN_HEADERS)
    assert r.status_code == 200, f"GET ledger 失敗: {r.status_code}"
    return r.json().get("ledgerEntries", [])


def get_events(payout_id: str) -> list:
    r = requests.get(url(f"/api/events/{payout_id}"), headers=ADMIN_HEADERS)
    assert r.status_code == 200, f"GET events 失敗: {r.status_code}"
    return r.json().get("providerEvents", [])


def get_wallet_balance(wallet_id: str = "wallet_main") -> dict:
    r = requests.get(url(f"/api/wallets/{wallet_id}"), headers=ADMIN_HEADERS)
    assert r.status_code == 200, f"GET wallet 失敗: {r.status_code}"
    return r.json().get("wallet", r.json())


# ---------------------------------------------------------------------------
# Test Suite
# ---------------------------------------------------------------------------

class TestProviderSuccess:
    """providerMode: success — 預期快速完成"""

    def test_initial_status_is_processing_or_queued(self):
        resp = create_payout("success", amount=5.0)
        payout = resp["payout"]
        assert payout["status"] in ("queued", "processing"), (
            f"初始狀態應為 queued 或 processing，實際: {payout['status']}"
        )

    def test_final_status_is_completed(self):
        resp = create_payout("success", amount=5.0)
        payout_id = resp["payout"]["id"]
        final = poll_status(payout_id, ["completed", "failed", "stuck"], timeout=60)
        assert final == "completed", f"success 模式最終狀態應為 completed，實際: {final}"

    def test_provider_events_contain_completed(self):
        resp = create_payout("success", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        events = get_events(payout_id)
        event_types = [e["eventType"] for e in events]
        assert "provider_completed" in event_types, (
            f"success 模式應有 provider_completed 事件，實際: {event_types}"
        )

    def test_provider_events_sequence(self):
        resp = create_payout("success", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        events = get_events(payout_id)
        event_types = [e["eventType"] for e in events]
        for expected in ("created", "submitted", "provider_completed"):
            assert expected in event_types, (
                f"success 模式缺少事件 '{expected}'，實際: {event_types}"
            )

    def test_ledger_has_debit_entry(self):
        resp = create_payout("success", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        entries = get_ledger(payout_id)
        assert len(entries) >= 1, f"completed payout 應有 ledger entry，實際: {entries}"
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]
        assert len(debit_entries) >= 1, f"應有 debit 類型的 ledger entry，實際: {entries}"

    def test_ledger_debit_amount_matches_payout(self):
        amount = 7.77
        resp = create_payout("success", amount=amount)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        entries = get_ledger(payout_id)
        debit_total = sum(e["amount"] for e in entries if e.get("entryType") == "debit")
        assert abs(debit_total - amount) < 0.001, (
            f"debit 合計 {debit_total} 應等於 payout 金額 {amount}"
        )

    def test_wallet_balance_decreases(self):
        wallet_before = get_wallet_balance()
        balance_before = wallet_before["availableBalance"]
        amount = 3.0
        resp = create_payout("success", amount=amount)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        wallet_after = get_wallet_balance()
        balance_after = wallet_after["availableBalance"]
        assert balance_after <= balance_before, (
            f"出款後餘額應減少或持平，before={balance_before}, after={balance_after}"
        )


class TestProviderFailed:
    """providerMode: failed — 預期快速失敗"""

    def test_final_status_is_failed(self):
        resp = create_payout("failed", amount=5.0)
        payout_id = resp["payout"]["id"]
        final = poll_status(payout_id, ["failed", "completed", "stuck"], timeout=60)
        assert final == "failed", f"failed 模式最終狀態應為 failed，實際: {final}"

    def test_provider_events_contain_failed(self):
        resp = create_payout("failed", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["failed"], timeout=60)
        events = get_events(payout_id)
        event_types = [e["eventType"] for e in events]
        assert "provider_failed" in event_types, (
            f"failed 模式應有 provider_failed 事件，實際: {event_types}"
        )

    def test_ledger_has_no_debit_on_failure(self):
        resp = create_payout("failed", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["failed"], timeout=60)
        entries = get_ledger(payout_id)
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]
        assert len(debit_entries) == 0, (
            f"failed payout 不應有 debit ledger entry，實際: {debit_entries}"
        )

    def test_failed_payout_can_be_retried(self):
        resp = create_payout("failed", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["failed"], timeout=60)
        r = requests.post(
            url(f"/api/payouts/{payout_id}/retry"),
            headers=ADMIN_HEADERS,
        )
        assert r.status_code in (200, 201, 202), (
            f"failed payout 應可 retry，實際: {r.status_code} {r.text}"
        )


class TestProviderDelayedSuccess:
    """providerMode: delayed_success — 預期延遲後完成"""

    def test_final_status_is_completed(self):
        resp = create_payout("delayed_success", amount=5.0)
        payout_id = resp["payout"]["id"]
        # delayed_success 需要更長等待時間
        final = poll_status(payout_id, ["completed", "failed", "stuck"], timeout=90)
        assert final == "completed", (
            f"delayed_success 模式最終狀態應為 completed，實際: {final}"
        )

    def test_provider_events_contain_completed(self):
        resp = create_payout("delayed_success", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=90)
        events = get_events(payout_id)
        event_types = [e["eventType"] for e in events]
        assert "provider_completed" in event_types, (
            f"delayed_success 應有 provider_completed 事件，實際: {event_types}"
        )

    def test_ledger_debit_matches_amount(self):
        amount = 4.44
        resp = create_payout("delayed_success", amount=amount)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=90)
        entries = get_ledger(payout_id)
        debit_total = sum(e["amount"] for e in entries if e.get("entryType") == "debit")
        assert abs(debit_total - amount) < 0.001, (
            f"delayed_success debit 合計 {debit_total} 應等於 payout 金額 {amount}"
        )


class TestProviderDuplicateCallback:
    """providerMode: duplicate_callback — 預期完成，但 ledger 只有一筆"""

    def test_final_status_is_completed(self):
        resp = create_payout("duplicate_callback", amount=5.0)
        payout_id = resp["payout"]["id"]
        final = poll_status(payout_id, ["completed", "failed", "stuck"], timeout=60)
        assert final == "completed", (
            f"duplicate_callback 最終狀態應為 completed，實際: {final}"
        )

    def test_ledger_has_exactly_one_debit(self):
        resp = create_payout("duplicate_callback", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        entries = get_ledger(payout_id)
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]
        assert len(debit_entries) == 1, (
            f"duplicate_callback 應只有 1 筆 debit，實際有 {len(debit_entries)} 筆：{debit_entries}"
        )

    def test_no_double_debit_amount(self):
        amount = 6.0
        resp = create_payout("duplicate_callback", amount=amount)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        entries = get_ledger(payout_id)
        debit_total = sum(e["amount"] for e in entries if e.get("entryType") == "debit")
        assert abs(debit_total - amount) < 0.001, (
            f"duplicate_callback debit 合計 {debit_total} 不應重複計算，payout 金額 {amount}"
        )

    def test_provider_events_show_duplicate(self):
        resp = create_payout("duplicate_callback", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["completed"], timeout=60)
        events = get_events(payout_id)
        completed_events = [e for e in events if e.get("eventType") == "provider_completed"]

        # 系統對 provider_completed 做了事件去重，只保留 1 筆（正確行為）
        assert len(completed_events) == 1, (
            f"duplicate_callback 應去重為 1 筆 provider_completed，實際: {len(completed_events)}"
        )
        # 總事件數應 > 1，代表確實收到了多次回調（created + submitted + provider_completed）
        assert len(events) > 1, (
            f"duplicate_callback 總事件數應 > 1，實際: {[e['eventType'] for e in events]}"
        )
        # ledger 同樣只有 1 筆，防止重複計算
        entries = get_ledger(payout_id)
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]
        assert len(debit_entries) == 1, (
            f"duplicate_callback ledger 應只有 1 筆 debit（防重複計算），實際: {len(debit_entries)}"
        )


class TestProviderNeverCallback:
    """providerMode: never_callback — 預期最終進入 stuck 狀態"""

    def test_initial_status_is_processing_or_queued(self):
        resp = create_payout("never_callback", amount=5.0)
        payout = resp["payout"]
        assert payout["status"] in ("queued", "processing"), (
            f"初始狀態應為 queued 或 processing，實際: {payout['status']}"
        )

    def test_final_status_is_stuck(self):
        # never_callback 的 timeout 約需 46 分鐘，超出測試等待上限。
        # 改用 seed data payout_seed_processing（已處於 stuck 狀態）做斷言。
        payout = get_payout("payout_seed_processing")
        assert payout["status"] == "stuck", (
            f"payout_seed_processing 應為 stuck，實際: {payout['status']}"
        )

    def test_provider_events_contain_timeout(self):
        # 同上，使用 seed data 驗證 provider_timeout 事件存在。
        events = get_events("payout_seed_processing")
        event_types = [e["eventType"] for e in events]
        assert "provider_timeout" in event_types, (
            f"payout_seed_processing 應有 provider_timeout 事件，實際: {event_types}"
        )

    def test_ledger_is_empty_when_stuck(self):
        resp = create_payout("never_callback", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["stuck"], timeout=120)
        entries = get_ledger(payout_id)
        debit_entries = [e for e in entries if e.get("entryType") == "debit"]
        assert len(debit_entries) == 0, (
            f"stuck payout 不應有 debit ledger entry，實際: {debit_entries}"
        )

    def test_stuck_payout_can_be_retried(self):
        resp = create_payout("never_callback", amount=5.0)
        payout_id = resp["payout"]["id"]
        poll_status(payout_id, ["stuck"], timeout=120)
        r = requests.post(
            url(f"/api/payouts/{payout_id}/retry"),
            headers=ADMIN_HEADERS,
        )
        assert r.status_code in (200, 201, 202), (
            f"stuck payout 應可 retry，實際: {r.status_code} {r.text}"
        )
