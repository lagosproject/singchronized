from fastapi import APIRouter, HTTPException

from ..schemas import SaveLyricsRequest
from ..services import lyrics as lyrics_service
from .songs import get_song_or_404

router = APIRouter(prefix="/songs", tags=["lyrics"])


@router.get("/{song_id}/lyrics")
def get_song_lyrics(song_id: int):
    song = get_song_or_404(song_id)
    return lyrics_service.read_lyrics(song)


@router.put("/{song_id}/lyrics")
def save_song_lyrics(song_id: int, req: SaveLyricsRequest):
    song = get_song_or_404(song_id)
    try:
        lyrics_service.save_lyrics(song, req.lyrics_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save lyrics: {e}")
    return {"message": "Lyrics saved successfully"}
