from fastapi import APIRouter

from app.api.v1.cards import router as cards_router
from app.api.v1.home import router as home_router
from app.api.v1.intents import router as intents_router
from app.api.v1.logs import router as logs_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.simulate import router as simulate_router
from app.api.v1.vault import router as vault_router
from app.api.v1.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(intents_router, tags=["intents"])
api_router.include_router(profiles_router, tags=["profiles"])
api_router.include_router(cards_router, tags=["cards"])
api_router.include_router(logs_router, tags=["logs"])
api_router.include_router(home_router, tags=["home"])
api_router.include_router(simulate_router, tags=["simulate"])
api_router.include_router(vault_router, tags=["vault"])
api_router.include_router(webhooks_router, tags=["webhooks"])