import json
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from ..audio import player
from ..schemas import PlayRequest, SeekRequest, VolumeRequest, DelayRequest
from ..ws import manager
from .songs import get_song_or_404

router = APIRouter(tags=["playback"])


@router.post("/songs/play")
def play_song(req: PlayRequest):
    song = get_song_or_404(req.song_id)

    # Fall back to the original mix for the singer if vocals were not split yet
    vocals_ready = bool(song["vocals_path"] and os.path.exists(song["vocals_path"]))
    instrumental_ready = bool(song["instrumental_path"] and os.path.exists(song["instrumental_path"]))
    vocals = song["vocals_path"] if vocals_ready else song["original_path"]
    instrumental = song["instrumental_path"] if instrumental_ready else None

    try:
        player.start_song(
            song_path=vocals,
            karaoke_path=instrumental,
            singer_device=req.singer_device,
            audience_device=req.audience_device,
            # Only honor the L/R split request when real stems exist -
            # never split the raw mix against nothing.
            stereo_split=req.stereo_split and vocals_ready and instrumental_ready
        )
        player.current_song_id = req.song_id
    except Exception as e:
        import traceback
        import sys
        print("Failed to start song playback:", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start song playback: {str(e)}")

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


@router.post("/playback/delay")
def set_playback_delay(req: DelayRequest):
    player.vocals_delay = req.delay
    if player.is_playing:
        player.seek(player.get_current_time())
    return {"message": "Delay updated", "vocals_delay": player.vocals_delay}


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
