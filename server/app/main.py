from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ✅ import this

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        version="0.1.0",
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # ✅ Add CORS middleware here
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # or restrict to your frontend domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


app = create_app()
