import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from . import database
from .audio import player
from .config import FRONTEND_DIST_DIR, LIBRARY_DIR, PLAYBACK_BROADCAST_INTERVAL
from .routers import api_router
from .ws import manager


async def _broadcast_playback_status():
    while True:
        if player.is_playing and manager.clients:
            await manager.broadcast(
                {"type": "playback_status", "data": player.get_status()}
            )
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

    # Restrict CORS to the origins this desktop app can actually be loaded
    # from: the Vite dev server / same-origin production page (localhost or
    # 127.0.0.1, any port), and the packaged Tauri webview, whose origin is
    # http://tauri.localhost on Windows and tauri://localhost on Linux/macOS.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://tauri\.localhost|tauri://localhost)$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        import traceback
        import sys

        traceback.print_exception(type(exc), exc, exc.__traceback__, file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Internal Server Error: {str(exc)}",
                "traceback": traceback.format_exc(),
            },
        )

    # Serve library static files (for thumbnails)
    app.mount("/library", StaticFiles(directory=LIBRARY_DIR), name="library")

    # Serve static frontend files if built
    if os.path.exists(FRONTEND_DIST_DIR):
        app.mount(
            "/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend"
        )

    return app


app = create_app()
