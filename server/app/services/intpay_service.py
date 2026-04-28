import random
import re
import secrets
from decimal import Decimal
from typing import Any

from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository

CREATE_CARD_FEE = Decimal("0.05")
ECOMMERCE_MCC_PREFIXES = ("4816", "5815", "5816", "5964", "5968", "5969", "7273", "7372")
CATEGORY_TO_MCC_LIST: dict[str, set[int]] = {
    "food": {5812, 5814, 5411, 5499},
    "travel": {4112, 4511, 4722, 7512, 7011},
    "tech": {5732, 5734, 4816, 7372},
    "entertainment": {7832, 7922, 7997},
}


class IntPayService:
    def __init__(
        self,
        profiles_repo: ProfilesRepository,
        intents_repo: IntentsRepository,
        cards_repo: VirtualCardsRepository,
        audit_repo: AuditLogsRepository | None,
    ) -> None:
        self.profiles_repo = profiles_repo
        self.intents_repo = intents_repo
        self.cards_repo = cards_repo
        self.audit_repo = audit_repo

    async def create_intent_with_card(self, creator_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        # 1. Prepare data
        amount = Decimal(str(payload["amount"])).quantize(Decimal("0.01"))
        card_number = "".join(str(random.randint(0, 9)) for _ in range(16))
        exp_month = random.randint(1, 12)
        exp_year = 2030 + random.randint(0, 5)
        stripe_card_id = f"ic_{secrets.token_hex(10)}"

        # 2. Call RPC
        # Note: float(amount) solves the Decimal serialization error
        rpc_result = await self.intents_repo.create_intent_with_card_atomic(
            {
                "p_creator_id": creator_id,
                "p_receiver_id": payload["userId"],
                "p_amount": float(amount),
                "p_use_times": payload["useTimes"],
                "p_expiry_at": payload.get("expiryDate"),
                "p_country": payload.get("country"),
                "p_city": payload.get("city"),
                "p_lock_for_websites": payload.get("lockForWebsites", False),
                "p_only_websites": payload.get("onlyWebsites", []),
                "p_required_prove": payload.get("requiredProve", False),
                "p_description": payload.get("description"),
                "p_category": self._normalize_category(payload.get("category")),
                "p_stripe_card_id": stripe_card_id,
                "p_card_number": card_number,
                "p_last4": card_number[-4:],
                "p_exp_month": exp_month,
                "p_exp_year": exp_year,
            }
        )

        # 3. Return structured dictionary
        # CRITICAL: Ensure these keys match the column names in your SQL "RETURNS TABLE"
        return {
            "intent": {
                "id": rpc_result["intent_id"], 
                "status": rpc_result["status"]
            }, 
            "card": rpc_result, 
            "fee": float(CREATE_CARD_FEE) 
            }

    async def build_home_summary(self, user_id: int) -> dict[str, Any]:
        profile = await self.profiles_repo.get_by_id(user_id)
        return {
            "freeMoney": float(profile["vault_balance"]),
            "lockMoney": float(profile["lock_money"]),
            "selfCardsCount": await self.intents_repo.count_self_cards(user_id),
            "cardsReceivedCount": await self.intents_repo.count_received_cards(user_id),
            "cardsSentCount": await self.intents_repo.count_sent_cards(user_id),
            "sliderCards": await self.cards_repo.list_slider_cards(user_id),
            "activityCount": await self.audit_repo.count_for_user_cards(user_id),
        }

    async def simulate_tap_to_pay(self, payload: dict[str, Any]) -> dict[str, Any]:
        card = await self.cards_repo.get_by_card_number(payload["cardNumber"])
        intent = await self.intents_repo.get_by_id(card["intent_id"])
        amount = Decimal(str(payload["amount"]))
        is_online = self._is_online(payload["merchantName"], payload["city"], payload["mcc"])

        approved = True
        reason = "approved"
        if Decimal(str(intent["remaining_amount"])) < amount:
            approved = False
            reason = "Insufficient Remaining Amount"
        elif int(intent["uses_left"]) <= 0:
            approved = False
            reason = "Usage Limit Exceeded"
        elif not self._is_mcc_allowed(intent.get("category"), payload["mcc"]):
            approved = False
            reason = f"MCC [{payload['mcc']}] not allowed for category [{intent.get('category')}]"
        else:
            if intent.get("lock_for_websites") and is_online:
                approved = False
                reason = "Online Transactions Locked"
            elif is_online and (intent.get("only_websites") or []):
                allowed = self._matches_allowed_website(payload["merchantName"], intent.get("only_websites") or [])
                if not allowed:
                    approved = False
                    reason = "Website Not Allowed"
            elif intent.get("city") and (intent["city"] or "").lower() != payload["city"].lower():
                approved = False
                reason = "Location Mismatch"
            elif intent.get("country") and (intent["country"] or "").lower() != payload["country"].lower():
                approved = False
                reason = "Country Mismatch"

        if self.audit_repo is None:
            raise ValueError("audit_repo is required for tap-to-pay simulation")

        await self.audit_repo.create(
            {
                "card_id": card["id"],
                "transaction_amount": str(amount),
                "merchant_name": payload["merchantName"],
                "mcc": payload["mcc"],
                "city": payload["city"],
                "country": payload["country"],
                "decision": "approved" if approved else "declined",
                "reason": reason if not approved else None,
            }
        )

        if approved:
            await self.intents_repo.decrement_counters(intent["id"], str(amount))
            await self.profiles_repo.decrement_lock_money(intent["creator_id"], amount)
        return {"approved": approved, "reason": reason}

    def _is_online(self, merchant_name: str, city: str, mcc: str) -> bool:
        city_flag = city.lower() in {"online", "internet"}
        domain_flag = bool(re.search(r"\.[a-z]{2,}$", merchant_name.lower()))
        mcc_flag = any(str(mcc).startswith(prefix) for prefix in ECOMMERCE_MCC_PREFIXES)
        return city_flag or domain_flag or mcc_flag

    def _matches_allowed_website(self, merchant_name: str, allowlist: list[str]) -> bool:
        normalized = merchant_name.lower().strip()
        return any(site.lower().strip() in normalized for site in allowlist)

    def _normalize_category(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    def _is_mcc_allowed(self, category: str | None, mcc: str) -> bool:
        normalized_category = self._normalize_category(category)
        if not normalized_category:
            return True
        allowed_mccs = CATEGORY_TO_MCC_LIST.get(normalized_category)
        if allowed_mccs is None:
            return False
        try:
            parsed_mcc = int(str(mcc))
        except ValueError:
            return False
        return parsed_mcc in allowed_mccs
