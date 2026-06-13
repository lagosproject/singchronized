from fastapi import APIRouter

from . import devices, lyrics, playback, playlists, songs, system

api_router = APIRouter(prefix="/api")
api_router.include_router(devices.router)
api_router.include_router(system.router)
api_router.include_router(songs.router)
api_router.include_router(lyrics.router)
api_router.include_router(playback.router)
api_router.include_router(playlists.router)
