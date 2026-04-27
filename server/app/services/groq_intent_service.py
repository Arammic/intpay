import json
from datetime import UTC, datetime
from groq import AsyncGroq
from app.core.config import settings
from app.core.exceptions import ValidationError

class GroqIntentService:
    def __init__(self) -> None:
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    async def parse_intent(self, raw_text: str) -> dict:
        current_time = datetime.now(tz=UTC).isoformat()
        
        prompt = (
            "Extract rules from the text. Return JSON with: "
            "amount, merchant_category, expiry_timestamp, location_data. "
            "If a piece of information is missing, set its value to null. "
            f"Context: Current time is {current_time}. "
            f"Text: {raw_text}"
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a financial assistant. Return JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        
        payload = json.loads(response.choices[0].message.content)
        
        # مصفوفة لتجميع الطلبات الناقصة
        missing_fields = []
        
        if not payload.get("amount") or payload["amount"] == 0:
            missing_fields.append("المبلغ (Amount)")
        
        if not payload.get("merchant_category"):
            missing_fields.append("نوع المتجر أو التصنيف (Category)")

        # إذا كان هناك نقص، نرفع استثناء مخصص يحتوي على قائمة النواقص
        if missing_fields:
            fields_str = " و ".join(missing_fields)
            raise ValidationError(f"من فضلك زودني بـ {fields_str} لإتمام العملية.")

        return payload