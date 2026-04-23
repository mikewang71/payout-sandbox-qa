"""
Payout Sandbox — UI 測試套件（Playwright 同步模式）
執行方式: pytest tests/test_ui.py -v
前置需求: pip install pytest-playwright && playwright install firefox

注意：本環境 Chromium 因 macOS 版本相容性問題（SEGV_ACCERR）無法啟動，
      改用 Firefox 作為測試瀏覽器。

Base URL: http://localhost:3000

UI 元素對應（從 accessibility tree 探查確認）：
  - 身份切換下拉：combobox，選項格式為 "Name · role"
  - 切換按鈕：button[name="Switch"]
  - 建立 payout 送出鈕：button[name="Execute Scenario"]
  - 錢包標題：heading，文字為 "Treasury Main Wallet" / "Operations Wallet"
  - Payout 列表：table，State 欄位顯示 "COMPLETED" / "STUCK" / "FAILED" 等
  - Signals 欄位：顯示 "Ledger mismatch detected" 警示文字
"""

import json
import re

import pytest
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = "http://localhost:3000"

# 使用者選項文字（對應 UI combobox 的 option 值）
USER_OPTIONS = {
    "admin":    "Alice Admin · finance_admin",
    "operator": "Oscar Operator · finance_operator",
    "viewer":   "Vera Viewer · viewer",
}

USER_IDS = {
    "admin":    "user_admin",
    "operator": "user_operator",
    "viewer":   "user_viewer",
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def browser():
    # Chromium 在此 macOS 版本（arm64）有 SEGV_ACCERR 崩潰問題，改用 Firefox
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture()
def page(browser):
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def switch_user(page: Page, user_key: str) -> None:
    """
    透過 POST /api/session 切換身份後 reload。
    使用 domcontentloaded + 等待 wallet heading，
    因為 TanStack Start 有持續 polling，networkidle 永遠不會觸發。
    """
    page.request.post(
        f"{BASE_URL}/api/session",
        data=json.dumps({"userId": USER_IDS[user_key]}),
        headers={"Content-Type": "application/json"},
    )
    page.reload()
    page.wait_for_load_state("domcontentloaded")
    # 等待錢包區塊渲染（代表資料已載入）
    page.get_by_role("heading", name="Treasury Main Wallet").wait_for(timeout=10000)


def goto_home(page: Page) -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("domcontentloaded")
    # 等待 payout 表格標題出現，代表首頁主要內容已渲染
    page.get_by_role("heading", name="Recent Payout Telemetry").wait_for(timeout=10000)


# ---------------------------------------------------------------------------
# Test 1 — viewer 不應看到「Execute Scenario」送出按鈕
# ---------------------------------------------------------------------------

def test_viewer_cannot_see_create_button(page: Page):
    """
    規格：viewer 角色無法建立 payout。
    UI 應隱藏或移除「Execute Scenario」送出按鈕（或整個建立表單）。

    注意：若此測試 FAIL，代表 UI 未依角色隱藏操作入口，
    僅依靠 API 拒絕並非完善的 UX——viewer 仍會看到可填寫的表單，
    提交後才收到 403，屬 UI 層的 RBAC 缺口，建議記錄為 UI Bug。
    """
    goto_home(page)
    switch_user(page, "viewer")

    btn = page.get_by_role("button", name="Execute Scenario")

    # 預期：按鈕不存在，或存在但為 disabled 狀態
    is_visible = btn.is_visible() if btn.count() > 0 else False
    is_disabled = btn.is_disabled() if btn.count() > 0 else True

    assert not is_visible or is_disabled, (
        "[UI BUG] viewer 看得到可點擊的「Execute Scenario」按鈕，\n"
        "UI 未依角色隱藏建立 payout 的操作入口。\n"
        "規格：viewer 不具建立 payout 的權限，應移除或停用此按鈕。"
    )


# ---------------------------------------------------------------------------
# Test 2 — admin 同時看到兩個錢包
# ---------------------------------------------------------------------------

def test_admin_can_see_both_wallets(page: Page):
    """
    規格：finance_admin 可查看 wallet_main 與 wallet_ops。
    Dashboard 應同時顯示兩張錢包卡片。
    """
    goto_home(page)
    switch_user(page, "admin")

    expect(page.get_by_role("heading", name="Treasury Main Wallet")).to_be_visible()
    expect(page.get_by_role("heading", name="Operations Wallet")).to_be_visible()


# ---------------------------------------------------------------------------
# Test 3 — operator 只看到 wallet_main，看不到 wallet_ops
# ---------------------------------------------------------------------------

def test_operator_sees_only_main_wallet(page: Page):
    """
    規格：finance_operator 僅能查看 wallet_main。
    Dashboard 應只顯示 Treasury Main Wallet，不顯示 Operations Wallet。

    注意：若此測試 FAIL，代表 UI 未依角色過濾錢包卡片，
    屬 UI 層的資料可見性缺口，與 API 層的 403 行為不一致。
    """
    goto_home(page)
    switch_user(page, "operator")

    expect(page.get_by_role("heading", name="Treasury Main Wallet")).to_be_visible()

    ops_heading = page.get_by_role("heading", name="Operations Wallet")
    assert ops_heading.count() == 0 or not ops_heading.is_visible(), (
        "[UI BUG] operator 看得到 Operations Wallet 卡片，\n"
        "規格：finance_operator 僅有 wallet_main 存取權限。\n"
        "UI 應依照角色隱藏無權限的錢包卡片。"
    )


# ---------------------------------------------------------------------------
# Test 4 — payout_seed_mismatch 顯示「Ledger mismatch detected」警示
# ---------------------------------------------------------------------------

def test_ledger_mismatch_signal_visible(page: Page):
    """
    規格（sandbox_overview）：completed payout 的帳本合計與 payout 金額不符時，
    Dashboard 的 Signals 欄位應顯示「Ledger mismatch detected」警示。
    seed data 中 payout_seed_mismatch（88.88 USDC，ledgerTotal: 80.88 USDC）
    應觸發此訊號。
    """
    goto_home(page)
    switch_user(page, "admin")

    # 找到含有 payout_seed_mismatch 連結的表格列
    mismatch_row = page.get_by_role("row").filter(
        has=page.get_by_role("link", name=re.compile("payout_seed_mismatch"))
    )
    expect(mismatch_row).to_be_visible()

    # 該列的 Signals 欄位應含有 mismatch 警示文字
    expect(mismatch_row.get_by_text("Ledger mismatch detected")).to_be_visible()


# ---------------------------------------------------------------------------
# Test 5 — payout_seed_processing 在 Dashboard 顯示 STUCK 狀態標籤
# ---------------------------------------------------------------------------

def test_stuck_payout_visible_on_dashboard(page: Page):
    """
    規格（sandbox_overview）：never_callback 模式的 payout 最終進入 stuck 狀態，
    Dashboard 的 State 欄位應顯示「STUCK」標籤。
    seed data 中 payout_seed_processing（33.33 USDC）應呈現此狀態。
    """
    goto_home(page)
    switch_user(page, "admin")

    # 找到含有 payout_seed_processing 連結的表格列
    stuck_row = page.get_by_role("row").filter(
        has=page.get_by_role("link", name=re.compile("payout_seed_processing"))
    )
    expect(stuck_row).to_be_visible()

    # 該列的 State 欄位應顯示 STUCK
    expect(stuck_row.get_by_text("STUCK")).to_be_visible()
