import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import database
from .audio import player
from .config import FRONTEND_DIST_DIR, LIBRARY_DIR, PLAYBACK_BROADCAST_INTERVAL
from .routers import api_router
from .ws import manager


async def _broadcast_playback_status():
    while True:
        if player.is_playing and manager.clients:
            await manager.broadcast({
                "type": "playback_status",
                "data": player.get_status()
            })
        await asyncio.sleep(PLAYBACK_BROADCAST_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.bind_loop(asyncio.get_running_loop())
    database.reset_stale_statuses()
    broadcaster = asyncio.create_task(_broadcast_playback_status())
    yield
    broadcaster.cancel()


def create_app() -> FastAPI:
    os.makedirs(LIBRARY_DIR, exist_ok=True)
    database.init_db()

    app = FastAPI(title="SingChronized Backend", lifespan=lifespan)

    # Enable CORS for frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    # Serve library static files (for thumbnails)
    app.mount("/library", StaticFiles(directory=LIBRARY_DIR), name="library")

    # Serve static frontend files if built
    if os.path.exists(FRONTEND_DIST_DIR):
        app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend")

    return app


app = create_app()
