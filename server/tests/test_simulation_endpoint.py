from fastapi.testclient import TestClient

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_payment_provider, get_smart_rules_repo, get_virtual_cards_repo
from app.core.config import settings
from app.main import app


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


class FakePaymentProvider:
    async def create_virtual_card(self, amount, metadata):
        return {"id": "ic_test_card_001"}

    async def get_card_details(self, card_id):
        return {"id": card_id}

    async def simulate_transaction(self, card_id, amount, merchant_category):
        return {
            "type": "issuing_authorization.request",
            "data": {
                "object": {
                    "id": "iauth_sim_1",
                    "amount": int(amount * 100),
                    "card": {"id": card_id},
                    "merchant_data": {"category": merchant_category},
                }
            },
        }


def test_simulate_purchase_endpoint():
    app.dependency_overrides[get_virtual_cards_repo] = lambda: FakeCardsRepo()
    app.dependency_overrides[get_intents_repo] = lambda: FakeIntentsRepo()
    app.dependency_overrides[get_smart_rules_repo] = lambda: FakeRulesRepo()
    app.dependency_overrides[get_audit_logs_repo] = lambda: FakeAuditRepo()
    app.dependency_overrides[get_payment_provider] = lambda: FakePaymentProvider()

    previous_env = settings.app_env
    settings.app_env = "development"
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/test/simulate-purchase",
                json={
                    "card_id": "ic_test_1",
                    "amount": 10.0,
                    "merchant_category": "coffee_shop",
                },
            )
        assert response.status_code == 200
        assert response.json()["approved"] is True
    finally:
        settings.app_env = previous_env
        app.dependency_overrides.clear()
