from fastapi import APIRouter

from app.api.v1.intents import router as intents_router
from app.api.v1.test_simulation import router as test_simulation_router
from app.api.v1.vault import router as vault_router
from app.api.v1.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(intents_router, tags=["intents"])
api_router.include_router(vault_router, tags=["vault"])
api_router.include_router(webhooks_router, tags=["webhooks"])
api_router.include_router(test_simulation_router, tags=["test"])
