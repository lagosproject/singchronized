import json
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..audio import player
from ..schemas import PlayRequest, SeekRequest, VolumeRequest
from ..ws import manager
from .songs import get_song_or_404

router = APIRouter(tags=["playback"])


@router.post("/songs/play")
def play_song(req: PlayRequest):
    song = get_song_or_404(req.song_id)

    # Fall back to the original mix for the singer if vocals were not split yet
    vocals = song["vocals_path"] if (song["vocals_path"] and os.path.exists(song["vocals_path"])) else song["original_path"]
    instrumental = song["instrumental_path"] if (song["instrumental_path"] and os.path.exists(song["instrumental_path"])) else None

    player.start_song(
        song_path=vocals,
        karaoke_path=instrumental,
        singer_device=req.singer_device,
        audience_device=req.audience_device
    )
    player.current_song_id = req.song_id

    return {"message": "Playback started", "status": player.get_status()}


@router.post("/songs/pause")
def pause_song():
    player.pause_song()
    return {"status": player.get_status()}


@router.post("/songs/resume")
def resume_song():
    player.resume_song()
    return {"status": player.get_status()}


@router.post("/songs/stop")
def stop_song():
    player.stop_song()
    return {"status": player.get_status()}


@router.post("/songs/seek")
def seek_song(req: SeekRequest):
    player.seek(req.position)
    return {"status": player.get_status()}


@router.get("/playback/status")
def get_playback_status():
    return player.get_status()


@router.post("/playback/volume")
def set_playback_volume(req: VolumeRequest):
    player.set_volumes(req.singer_volume, req.audience_volume)
    return {
        "message": "Volumes updated",
        "singer_volume": player.singer_volume,
        "audience_volume": player.audience_volume
    }


@router.websocket("/ws/playback")
async def playback_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_text(json.dumps({
            "type": "playback_status",
            "data": player.get_status()
        }))
        while True:
            # Keep socket alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
