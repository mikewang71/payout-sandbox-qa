"""
Shared fixtures and helpers for payout sandbox tests.
"""
import pytest
import requests

BASE_URL = "http://localhost:3000"

USERS = {
    "admin":    {"id": "user_admin",    "role": "finance_admin"},
    "operator": {"id": "user_operator", "role": "finance_operator"},
    "viewer":   {"id": "user_viewer",   "role": "viewer"},
}

WALLETS = {
    "main": "wallet_main",
    "ops":  "wallet_ops",
}


def session(user_key: str) -> requests.Session:
    """Return a requests.Session with x-user-id header pre-set."""
    s = requests.Session()
    s.headers.update({
        "x-user-id": USERS[user_key]["id"],
        "Content-Type": "application/json",
    })
    s.base_url = BASE_URL
    return s


def api(path: str) -> str:
    return f"{BASE_URL}{path}"


def make_payout_payload(
    wallet_id: str = "wallet_main",
    amount: float = 10.00,
    provider_mode: str = "success",
    idempotency_key: str | None = None,
    **overrides,
) -> dict:
    import uuid
    payload = {
        "walletId": wallet_id,
        "recipientAddress": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "amount": amount,
        "currency": "USDC",
        "idempotencyKey": idempotency_key or f"test-{uuid.uuid4()}",
        "memo": "Test payout",
        "providerMode": provider_mode,
    }
    payload.update(overrides)
    return payload
