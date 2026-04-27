from collections.abc import AsyncGenerator

from fastapi import Depends
from supabase import AsyncClient

from app.db.supabase import get_supabase_client
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.smart_rules_repository import SmartRulesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.core.config import settings
from app.services.mock_stripe_provider import MockStripeProvider
from app.services.payment_provider import PaymentProvider
from app.services.stripe_issuing_service import StripeProvider


async def get_supabase() -> AsyncGenerator[AsyncClient, None]:
    client = await get_supabase_client()
    yield client


def get_profiles_repo(client: AsyncClient = Depends(get_supabase)) -> ProfilesRepository:
    return ProfilesRepository(client)


def get_intents_repo(client: AsyncClient = Depends(get_supabase)) -> IntentsRepository:
    return IntentsRepository(client)


def get_smart_rules_repo(client: AsyncClient = Depends(get_supabase)) -> SmartRulesRepository:
    return SmartRulesRepository(client)


def get_virtual_cards_repo(client: AsyncClient = Depends(get_supabase)) -> VirtualCardsRepository:
    return VirtualCardsRepository(client)


def get_audit_logs_repo(client: AsyncClient = Depends(get_supabase)) -> AuditLogsRepository:
    return AuditLogsRepository(client)


def get_payment_provider() -> PaymentProvider:
    if settings.use_mock_stripe:
        return MockStripeProvider(store_path=settings.mock_stripe_store_path)
    return StripeProvider()
