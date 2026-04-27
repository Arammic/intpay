from typing import Any

import stripe

from app.core.config import settings
from app.core.exceptions import IntegrationError
from app.services.payment_provider import PaymentProvider

stripe.api_key = settings.stripe_api_key


class StripeProvider(PaymentProvider):
    async def create_virtual_card(self, amount: float, metadata: dict[str, Any]) -> dict[str, Any]:
        try:
            card = stripe.issuing.Card.create(
                cardholder=settings.stripe_issuing_cardholder_id,
                currency="sar",
                type="virtual",
                status="active",
                metadata={
                    "intended_amount": str(amount),
                    **{str(key): str(value) for key, value in metadata.items()},
                },
            )
            return dict(card)
        except Exception as exc:  # noqa: BLE001
            raise IntegrationError(f"Stripe issuing card creation failed: {exc}") from exc

    async def get_card_details(self, card_id: str) -> dict[str, Any]:
        try:
            card = stripe.issuing.Card.retrieve(card_id)
            return dict(card)
        except Exception as exc:  # noqa: BLE001
            raise IntegrationError(f"Stripe card retrieval failed: {exc}") from exc

    async def simulate_transaction(self, card_id: str, amount: float, merchant_category: str) -> dict[str, Any]:
        raise IntegrationError(
            "simulate_transaction is not supported on StripeProvider. Use MockStripeProvider in development."
        )

    def construct_event(self, payload: bytes, sig_header: str) -> dict[str, Any]:
        try:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=settings.stripe_webhook_secret)
            return dict(event)
        except Exception as exc:  # noqa: BLE001
            raise IntegrationError(f"Invalid Stripe webhook payload/signature: {exc}") from exc
