from fastapi.testclient import TestClient

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_payment_provider, get_smart_rules_repo, get_virtual_cards_repo
from app.main import app
from app.services.stripe_issuing_service import StripeProvider


class FakeCardsRepo:
    async def get_by_stripe_card_id(self, stripe_card_id):
        return {"id": "card_db_id_1", "intent_id": "11111111-1111-1111-1111-111111111111"}


class FakeIntentsRepo:
    async def get_by_id(self, intent_id):
        return {"id": "11111111-1111-1111-1111-111111111111"}


class FakeRulesRepo:
    async def get_by_intent_id(self, intent_id):
        return {
            "category": "coffee_shop",
            "expiry_at": "2099-12-31T23:59:59+00:00",
            "max_amount": "50.00",
            "location_data": None,
        }


class FakeAuditRepo:
    async def create(self, payload):
        return payload


def test_webhook_approves_matching_transaction(monkeypatch):
    class FakeStripeProvider(StripeProvider):
        def construct_event(self, payload, sig_header):
            return {
                "type": "issuing_authorization.request",
                "data": {
                    "object": {
                        "id": "iauth_1",
                        "amount": 1000,
                        "card": {"id": "ic_test_1"},
                        "merchant_data": {"category": "coffee_shop"},
                    }
                },
            }

    app.dependency_overrides[get_virtual_cards_repo] = lambda: FakeCardsRepo()
    app.dependency_overrides[get_intents_repo] = lambda: FakeIntentsRepo()
    app.dependency_overrides[get_smart_rules_repo] = lambda: FakeRulesRepo()
    app.dependency_overrides[get_audit_logs_repo] = lambda: FakeAuditRepo()
    app.dependency_overrides[get_payment_provider] = lambda: FakeStripeProvider()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/webhooks/stripe",
            data="{}",
            headers={"Stripe-Signature": "test_signature"},
        )
    assert response.status_code == 200
    assert response.json()["approved"] is True
    assert response.json()["metadata"]["reason"] == "approved"

    app.dependency_overrides.clear()
