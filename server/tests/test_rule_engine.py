from decimal import Decimal

from app.services.rule_engine import RuleEngine


def test_rule_engine_approves_when_all_conditions_match() -> None:
    engine = RuleEngine()
    rule = {
        "category": "coffee_shop",
        "expiry_at": "2099-12-31T23:59:59+00:00",
        "max_amount": "100.00",
        "location_data": {"lat": 24.7136, "long": 46.6753, "radius_km": 10},
    }
    merchant = {
        "category": "coffee_shop",
        "location": {"latitude": 24.7130, "longitude": 46.6760},
    }

    approved, reason = engine.evaluate(rule, merchant, Decimal("25.00"))
    assert approved is True
    assert reason == "approved"


def test_rule_engine_declines_wrong_category() -> None:
    engine = RuleEngine()
    rule = {
        "category": "coffee_shop",
        "expiry_at": "2099-12-31T23:59:59+00:00",
        "max_amount": "100.00",
        "location_data": None,
    }
    merchant = {"category": "grocery_store", "location": {"latitude": 24.7, "longitude": 46.6}}

    approved, reason = engine.evaluate(rule, merchant, Decimal("10.00"))
    assert approved is False
    assert reason == "merchant_category_mismatch"


def test_rule_engine_declines_out_of_bounds_location() -> None:
    engine = RuleEngine()
    rule = {
        "category": "coffee_shop",
        "expiry_at": "2099-12-31T23:59:59+00:00",
        "max_amount": "100.00",
        "location_data": {"lat": 24.7136, "long": 46.6753, "radius_km": 1},
    }
    merchant = {
        "category": "coffee_shop",
        "location": {"latitude": 24.8, "longitude": 46.9},
    }

    approved, reason = engine.evaluate(rule, merchant, Decimal("5.00"))
    assert approved is False
    assert reason == "location_out_of_bounds"
