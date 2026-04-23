"""
Test suite: Role-based access control (RBAC)

Spec (from sandbox_overview & api_reference):
  finance_admin   (user_admin)    → view wallet_main + wallet_ops, create payout, retry payout
  finance_operator(user_operator) → view wallet_main only,          create payout, retry payout
  viewer          (user_viewer)   → view wallet_main only,          NO create, NO retry

Risk: P0 — security boundary; any bypass = potential financial exposure or privilege escalation.
"""
import pytest
import requests
from conftest import api, session, make_payout_payload


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_payout(user_key: str, **kwargs) -> requests.Response:
    s = session(user_key)
    return s.post(api("/api/payouts"), json=make_payout_payload(**kwargs))


def get_wallet(user_key: str, wallet_id: str) -> requests.Response:
    s = session(user_key)
    return s.get(api(f"/api/wallets/{wallet_id}"))


def get_payouts(user_key: str) -> requests.Response:
    s = session(user_key)
    return s.get(api("/api/payouts"))


def retry_payout(user_key: str, payout_id: str) -> requests.Response:
    s = session(user_key)
    return s.post(api(f"/api/payouts/{payout_id}/retry"))


# ---------------------------------------------------------------------------
# Wallet access
# ---------------------------------------------------------------------------

class TestWalletAccess:
    """Who can read which wallet?"""

    def test_admin_can_view_wallet_main(self):
        r = get_wallet("admin", "wallet_main")
        assert r.status_code == 200, r.text
        assert r.json().get("id") == "wallet_main"

    def test_admin_can_view_wallet_ops(self):
        """finance_admin should have access to wallet_ops."""
        r = get_wallet("admin", "wallet_ops")
        assert r.status_code == 200, r.text
        assert r.json().get("id") == "wallet_ops"

    def test_operator_can_view_wallet_main(self):
        r = get_wallet("operator", "wallet_main")
        assert r.status_code == 200, r.text

    def test_operator_cannot_view_wallet_ops(self):
        """finance_operator is NOT listed as having access to wallet_ops."""
        r = get_wallet("operator", "wallet_ops")
        assert r.status_code in (403, 404), (
            f"Expected 403/404 for operator on wallet_ops, got {r.status_code}: {r.text}"
        )

    def test_viewer_can_view_wallet_main(self):
        r = get_wallet("viewer", "wallet_main")
        assert r.status_code == 200, r.text

    def test_viewer_cannot_view_wallet_ops(self):
        """viewer role has no mention of wallet_ops access."""
        r = get_wallet("viewer", "wallet_ops")
        assert r.status_code in (403, 404), (
            f"Expected 403/404 for viewer on wallet_ops, got {r.status_code}: {r.text}"
        )


# ---------------------------------------------------------------------------
# Payout list visibility
# ---------------------------------------------------------------------------

class TestPayoutListAccess:
    """GET /api/payouts should be accessible to all roles (read)."""

    def test_admin_can_list_payouts(self):
        r = get_payouts("admin")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_operator_can_list_payouts(self):
        r = get_payouts("operator")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_viewer_can_list_payouts(self):
        r = get_payouts("viewer")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# Payout creation
# ---------------------------------------------------------------------------

class TestPayoutCreation:
    """Only finance_admin and finance_operator may create payouts."""

    def test_admin_can_create_payout(self):
        r = create_payout("admin")
        assert r.status_code in (200, 201), (
            f"Admin should be able to create payout, got {r.status_code}: {r.text}"
        )
        body = r.json()
        assert "id" in body, f"Response missing payout id: {body}"

    def test_operator_can_create_payout(self):
        r = create_payout("operator")
        assert r.status_code in (200, 201), (
            f"Operator should be able to create payout, got {r.status_code}: {r.text}"
        )
        body = r.json()
        assert "id" in body, f"Response missing payout id: {body}"

    def test_viewer_cannot_create_payout(self):
        """viewer role must be blocked from creating payouts."""
        r = create_payout("viewer")
        assert r.status_code == 403, (
            f"Expected 403 for viewer creating payout, got {r.status_code}: {r.text}"
        )

    def test_operator_cannot_create_payout_on_wallet_ops(self):
        """
        Operator only has access to wallet_main.
        Attempting to create a payout against wallet_ops should be denied.
        """
        r = create_payout("operator", wallet_id="wallet_ops")
        assert r.status_code in (403, 404), (
            f"Expected 403/404 for operator creating payout on wallet_ops, "
            f"got {r.status_code}: {r.text}"
        )

    def test_viewer_cannot_create_payout_on_wallet_ops(self):
        r = create_payout("viewer", wallet_id="wallet_ops")
        assert r.status_code in (403, 404), (
            f"Expected 403/404 for viewer on wallet_ops payout, "
            f"got {r.status_code}: {r.text}"
        )


# ---------------------------------------------------------------------------
# Payout retry
# ---------------------------------------------------------------------------

class TestPayoutRetry:
    """
    Only finance_admin and finance_operator may retry payouts.
    viewer must be denied.

    Strategy: admin creates a failed payout first, then we test retry permissions.
    """

    @pytest.fixture(scope="class")
    def failed_payout_id(self):
        """Create a failed payout as admin and return its id."""
        r = create_payout("admin", provider_mode="failed")
        assert r.status_code in (200, 201), f"Setup failed: {r.status_code} {r.text}"
        return r.json()["id"]

    def test_viewer_cannot_retry_payout(self, failed_payout_id):
        """viewer must not be able to retry any payout."""
        r = retry_payout("viewer", failed_payout_id)
        assert r.status_code == 403, (
            f"Expected 403 for viewer retrying payout, got {r.status_code}: {r.text}"
        )

    def test_operator_can_retry_payout(self, failed_payout_id):
        r = retry_payout("operator", failed_payout_id)
        # 200 = accepted for retry; payout may already be in a non-retriable state
        # after admin/operator already retried — we accept 409/422 as "retry logic enforced"
        assert r.status_code in (200, 201, 409, 422), (
            f"Unexpected status for operator retry: {r.status_code}: {r.text}"
        )

    def test_admin_can_retry_payout(self, failed_payout_id):
        r = retry_payout("admin", failed_payout_id)
        assert r.status_code in (200, 201, 409, 422), (
            f"Unexpected status for admin retry: {r.status_code}: {r.text}"
        )


# ---------------------------------------------------------------------------
# No identity / unknown user
# ---------------------------------------------------------------------------

class TestUnauthenticated:
    """
    Requests with no x-user-id or an unknown user id should be rejected.
    This validates that the auth mechanism isn't silently permissive.
    """

    def test_no_user_id_header_is_rejected(self):
        r = requests.get(api("/api/payouts"))
        # Expect some form of auth failure, not a 200 serving data
        assert r.status_code in (400, 401, 403), (
            f"Expected auth error with no x-user-id, got {r.status_code}: {r.text}"
        )

    def test_unknown_user_id_is_rejected(self):
        r = requests.get(
            api("/api/payouts"),
            headers={"x-user-id": "user_does_not_exist"},
        )
        assert r.status_code in (400, 401, 403), (
            f"Expected auth error for unknown user, got {r.status_code}: {r.text}"
        )
