import asyncio
import json

from app.services.mock_stripe_provider import MockStripeProvider


def test_mock_provider_create_and_get_card(tmp_path):
    store_file = tmp_path / "mock_cards.json"
    provider = MockStripeProvider(str(store_file))

    card = asyncio.run(provider.create_virtual_card(100.0, {"intent_id": "intent_1"}))
    assert card["id"].startswith("ic_")
    assert card["status"] == "active"
    assert card["last4"].isdigit()
    assert len(card["last4"]) == 4

    fetched = asyncio.run(provider.get_card_details(card["id"]))
    assert fetched["id"] == card["id"]
    assert fetched["metadata"]["intent_id"] == "intent_1"

    saved = json.loads(store_file.read_text(encoding="utf-8"))
    assert card["id"] in saved["cards"]


def test_mock_provider_simulated_event_shape(tmp_path):
    store_file = tmp_path / "mock_cards.json"
    provider = MockStripeProvider(str(store_file))
    card = asyncio.run(provider.create_virtual_card(50.0, {"intent_id": "intent_2"}))

    event = asyncio.run(provider.simulate_transaction(card["id"], 12.5, "coffee_shop"))
    assert event["type"] == "issuing_authorization.request"
    payload = event["data"]["object"]
    assert payload["card"]["id"] == card["id"]
    assert payload["amount"] == 1250
    assert payload["merchant_data"]["category"] == "coffee_shop"
