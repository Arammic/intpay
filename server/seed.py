import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import NAMESPACE_DNS, uuid5

from faker import Faker

from app.db.supabase import get_supabase_client


ARABIC_NAMES = [
    "أحمد المنصوري",
    "سارة العمودي",
    "خالد باوزير",
    "مها القحطاني",
    "فيصل الحربي",
    "نورة الغامدي",
    "عبدالله الزهراني",
    "ريم الشمري",
]

SCENARIOS = [
    {"text": "غداء عمل مع فريق التطوير", "category": "dining", "amount": Decimal("400.00"), "merchant_hint": "Al-Baik"},
    {"text": "مصروف مدرسة للأبناء", "category": "education", "amount": Decimal("200.00"), "merchant_hint": "Jarir Bookstore"},
    {"text": "تعبئة بنزين للرحلة", "category": "fuel", "amount": Decimal("100.00"), "merchant_hint": "SASCO"},
    {"text": "قهوة الصباح قبل الدوام", "category": "coffee_shop", "amount": Decimal("75.00"), "merchant_hint": "Starbucks"},
    {"text": "احتياجات البقالة الأسبوعية", "category": "groceries", "amount": Decimal("320.00"), "merchant_hint": "Panda Supermarket"},
    {"text": "توصيل عشاء للأسرة", "category": "food_delivery", "amount": Decimal("180.00"), "merchant_hint": "HungerStation"},
    {"text": "مستلزمات صيدلية شهرية", "category": "pharmacy", "amount": Decimal("220.00"), "merchant_hint": "Al-Dawaa"},
    {"text": "تسوق منزلي شهري", "category": "retail", "amount": Decimal("500.00"), "merchant_hint": "Nesto"},
]

MERCHANTS_BY_CATEGORY = {
    "coffee_shop": ["Starbucks", "Barn's", "Dunkin"],
    "dining": ["Al-Baik", "Herfy", "Kudu"],
    "education": ["Jarir Bookstore", "Obeikan", "Noon Books"],
    "fuel": ["SASCO", "Petromin", "Aldrees"],
    "groceries": ["Panda Supermarket", "Nesto", "Danube"],
    "food_delivery": ["HungerStation", "Jahez", "The Chefz"],
    "pharmacy": ["Al-Dawaa", "Nahdi", "Boots"],
    "retail": ["Nesto", "Carrefour", "Lulu Hypermarket"],
}


def stable_uuid(value: str) -> str:
    return str(uuid5(NAMESPACE_DNS, f"intpay-seed:{value}"))


def profile_payload(fake: Faker, index: int) -> dict:
    name = ARABIC_NAMES[index]
    email_local = f"user{index + 1}"
    return {
        "id": stable_uuid(f"profile:{index}"),
        "email": f"{email_local}@intpay.ai",
        # تم تغيير left_digits من 4 إلى 5 لاستيعاب القيمة 15000
        "vault_balance": str(fake.pydecimal(left_digits=5, right_digits=2, positive=True, min_value=500, max_value=15000)),
        "stripe_customer_id": f"cus_seed_{index + 1}_{name.replace(' ', '_')}",
    }

def intent_status_for(index: int) -> str:
    # Schema currently supports only pending/active/expired.
    statuses = ["active", "expired", "pending"]
    return statuses[index % len(statuses)]


def card_status_for(intent_status: str) -> str:
    if intent_status == "expired":
        return "completed"
    if intent_status == "pending":
        return "inactive"
    return "active"


async def run_seed() -> None:
    fake = Faker("ar_SA")
    Faker.seed(42)
    client = await get_supabase_client()
    now = datetime.now(tz=UTC)

    profiles_payload = [profile_payload(fake, i) for i in range(8)]
    await client.table("profiles").upsert(profiles_payload, on_conflict="id").execute()
    profiles_lookup = {p["id"]: p for p in profiles_payload}
    profile_ids = list(profiles_lookup.keys())

    intents_payload: list[dict] = []
    rules_payload: list[dict] = []
    cards_payload: list[dict] = []
    audit_logs_payload: list[dict] = []

    for index in range(18):
        scenario = SCENARIOS[index % len(SCENARIOS)]
        creator_id = profile_ids[index % len(profile_ids)]
        receiver_id = profile_ids[(index + 3) % len(profile_ids)]
        status = intent_status_for(index)
        created_at = now - timedelta(days=index % 30, hours=index % 7)
        expiry_at = created_at + timedelta(days=2 if status == "active" else -1)

        intent_id = stable_uuid(f"intent:{index}")
        raw_text = f"{scenario['text']} - بواسطة {ARABIC_NAMES[index % len(ARABIC_NAMES)]}"

        intents_payload.append(
            {
                "id": intent_id,
                "creator_id": creator_id,
                "receiver_id": receiver_id,
                "raw_text": raw_text,
                "amount": str(scenario["amount"]),
                "status": status,
                "created_at": created_at.isoformat(),
            }
        )

        rules_payload.append(
            {
                "id": stable_uuid(f"rule:{index}"),
                "intent_id": intent_id,
                "category": scenario["category"],
                "expiry_at": expiry_at.isoformat(),
                "location_data": {"lat": 24.7136, "long": 46.6753, "radius_km": 30},
                "max_amount": str(scenario["amount"]),
                "created_at": created_at.isoformat(),
            }
        )

        card_id = stable_uuid(f"card:{index}")
        cards_payload.append(
            {
                "id": card_id,
                "stripe_card_id": f"ic_seed_{index:04d}",
                "intent_id": intent_id,
                "status": card_status_for(status),
                "created_at": created_at.isoformat(),
            }
        )

        merchant_candidates = MERCHANTS_BY_CATEGORY[scenario["category"]]
        log_count = 3 + (index % 3)  # 3-5 logs per card
        for log_index in range(log_count):
            merchant_name = merchant_candidates[log_index % len(merchant_candidates)]
            tx_amount = scenario["amount"] * Decimal("0.35") + Decimal(str(log_index * 10))
            decision = "approved"
            reason = "approved"
            merchant_category = scenario["category"]

            if log_index == log_count - 1 and index % 4 == 0:
                tx_amount = scenario["amount"] + Decimal("50.00")
                decision = "declined"
                reason = "amount_exceeds_rule_limit"

            if scenario["category"] == "pharmacy" and log_index == 1:
                merchant_name = "Jarir Bookstore"
                merchant_category = "electronics_store"
                decision = "declined"
                reason = "merchant_category_mismatch"

            audit_logs_payload.append(
                {
                    "id": stable_uuid(f"audit:{index}:{log_index}"),
                    "card_id": card_id,
                    "transaction_amount": str(tx_amount.quantize(Decimal("0.01"))),
                    "merchant_info": {
                        "name": merchant_name,
                        "category": merchant_category,
                        "suggested_merchant": scenario["merchant_hint"],
                        "city": fake.city(),
                    },
                    "decision": decision,
                    "reason": reason,
                    "created_at": (created_at + timedelta(hours=log_index * 5)).isoformat(),
                }
            )

    await client.table("intents").upsert(intents_payload, on_conflict="id").execute()
    await client.table("smart_rules").upsert(rules_payload, on_conflict="id").execute()
    await client.table("virtual_cards").upsert(cards_payload, on_conflict="id").execute()
    await client.table("audit_logs").upsert(audit_logs_payload, on_conflict="id").execute()

    print("\nSeed Summary")
    print("-" * 48)
    print(f"{'Profiles':<20}{len(profiles_payload):>8}")
    print(f"{'Intents':<20}{len(intents_payload):>8}")
    print(f"{'Smart Rules':<20}{len(rules_payload):>8}")
    print(f"{'Virtual Cards':<20}{len(cards_payload):>8}")
    print(f"{'Audit Logs':<20}{len(audit_logs_payload):>8}")
    print("-" * 48)
    print(
        f"Created {len(profiles_payload)} users, {len(intents_payload)} intents, "
        f"and {len(audit_logs_payload)} audit logs."
    )


if __name__ == "__main__":
    asyncio.run(run_seed())
