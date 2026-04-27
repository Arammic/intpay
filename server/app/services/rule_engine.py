from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from app.utils.geo import haversine_distance_km


class RuleEngine:
    def evaluate(self, smart_rule: dict[str, Any], merchant: dict[str, Any], amount: Decimal) -> tuple[bool, str]:
        rule_category = (smart_rule.get("category") or "").lower().strip()
        merchant_category = (merchant.get("category") or "").lower().strip()
        if rule_category and rule_category != merchant_category:
            return False, "merchant_category_mismatch"

        expiry_at = smart_rule.get("expiry_at")
        if expiry_at:
            expiry_dt = datetime.fromisoformat(str(expiry_at).replace("Z", "+00:00"))
            if datetime.now(tz=UTC) > expiry_dt:
                return False, "card_expired"

        max_amount = smart_rule.get("max_amount")
        if max_amount is not None and amount > Decimal(str(max_amount)):
            return False, "amount_exceeds_rule_limit"

        location_data = smart_rule.get("location_data")
        if location_data and merchant.get("location"):
            merchant_location = merchant["location"]
            distance = haversine_distance_km(
                float(location_data["lat"]),
                float(location_data["long"]),
                float(merchant_location["latitude"]),
                float(merchant_location["longitude"]),
            )
            if distance > float(location_data["radius_km"]):
                return False, "location_out_of_bounds"

        return True, "approved"
