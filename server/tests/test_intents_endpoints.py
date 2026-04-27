from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_intents_repo, get_payment_provider, get_profiles_repo, get_smart_rules_repo, get_virtual_cards_repo
from app.main import app
from app.schemas.intents import ParsedIntentRule


class FakeIntentsRepo:
    async def create(self, payload):
        return {"id": str(uuid4()), **payload}

    async def get_by_id(self, intent_id):
        return {
            "id": str(intent_id),
            "creator_id": str(uuid4()),
            "receiver_id": str(uuid4()),
            "raw_text": "100 SAR for coffee only today",
            "amount": "100.00",
            "status": "pending",
        }

    async def update_status(self, intent_id, status):
        return {"id": str(intent_id), "status": status}

    async def list_sent(self, profile_id, status=None):
        return []

    async def list_received(self, profile_id, status=None):
        return []


class FakeSmartRulesRepo:
    async def create(self, payload):
        return {"id": str(uuid4()), **payload}

    async def get_by_intent_id(self, intent_id):
        return {"id": str(uuid4()), "intent_id": str(intent_id), "expiry_at": "2099-12-31T23:59:59Z"}


class FakeProfilesRepo:
    async def ensure_sufficient_balance(self, profile_id, required_amount):
        return {"id": str(profile_id), "vault_balance": "1000.00"}


class FakeCardsRepo:
    async def create(self, payload):
        return {"id": str(uuid4()), **payload}


class FakeGroqService:
    async def parse_intent(self, raw_text):
        return ParsedIntentRule(
            amount="100.00",
            merchant_category="coffee_shop",
            expiry_timestamp="2099-12-31T23:59:59Z",
            max_amount="100.00",
            location_data=None,
        )


class FakePaymentProvider:
    async def create_virtual_card(self, amount, metadata):
        return {"id": "ic_test_card_001"}

    async def get_card_details(self, card_id):
        return {"id": card_id}

    async def simulate_transaction(self, card_id, amount, merchant_category):
        return {}


def test_define_intent_endpoint(monkeypatch):
    from app.api.v1 import intents as intents_module

    monkeypatch.setattr(intents_module, "GroqIntentService", lambda: FakeGroqService())
    app.dependency_overrides[get_intents_repo] = lambda: FakeIntentsRepo()
    app.dependency_overrides[get_smart_rules_repo] = lambda: FakeSmartRulesRepo()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/intents/define",
            json={
                "creator_id": str(uuid4()),
                "receiver_id": str(uuid4()),
                "raw_text": "100 SAR for coffee only today",
            },
        )
    assert response.status_code == 201
    payload = response.json()
    assert "intent_id" in payload
    assert payload["parsed_rule"]["merchant_category"] == "coffee_shop"

    app.dependency_overrides.clear()


def test_confirm_intent_endpoint(monkeypatch):
    from app.api.v1 import intents as intents_module

    monkeypatch.setattr(intents_module, "GroqIntentService", lambda: FakeGroqService())
    app.dependency_overrides[get_intents_repo] = lambda: FakeIntentsRepo()
    app.dependency_overrides[get_profiles_repo] = lambda: FakeProfilesRepo()
    app.dependency_overrides[get_smart_rules_repo] = lambda: FakeSmartRulesRepo()
    app.dependency_overrides[get_virtual_cards_repo] = lambda: FakeCardsRepo()
    app.dependency_overrides[get_payment_provider] = lambda: FakePaymentProvider()

    with TestClient(app) as client:
        response = client.post(f"/api/v1/intents/{uuid4()}/confirm")
    assert response.status_code == 200
    assert response.json()["stripe_card_id"] == "ic_test_card_001"

    app.dependency_overrides.clear()
