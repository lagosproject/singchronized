import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .. import database
from ..services import library
from ..workers.queue import enqueue_lyrics, enqueue_split

router = APIRouter(prefix="/songs", tags=["songs"])


def get_song_or_404(song_id: int) -> dict:
    song = database.get_song(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.get("")
def get_songs():
    return library.list_songs()


@router.post("")
async def upload_song(
    title: str = Form(...),
    artist: str = Form(...),
    file: UploadFile = File(...),
    thumbnail: UploadFile = File(None)
):
    song_id = library.save_uploaded_song(title, artist, file.filename, file.file, thumbnail)
    return {"id": song_id, "message": "Song added successfully"}


@router.delete("/{song_id}")
def delete_song(song_id: int):
    song = get_song_or_404(song_id)
    library.delete_song_with_files(song)
    return {"message": "Song deleted successfully"}


@router.post("/{song_id}/split")
def split_song(song_id: int):
    song = get_song_or_404(song_id)
    if song["split_status"] == "PROCESSING":
        return {"message": "Already splitting"}

    enqueue_split(song_id)
    return {"message": "Separation added to queue"}


@router.post("/{song_id}/generate-lyrics")
def generate_lyrics(song_id: int, model_size: str = "base"):
    song = get_song_or_404(song_id)
    if song["lyrics_status"] == "PROCESSING":
        return {"message": "Already transcribing"}

    vocals_exist = song["vocals_path"] and os.path.exists(song["vocals_path"])
    if not vocals_exist:
        raise HTTPException(
            status_code=400,
            detail="Song must be separated (vocal split) before generating lyrics "
                   "to ensure high transcription accuracy."
        )

    enqueue_lyrics(song_id, model_size)
    return {"message": "Transcription added to queue"}


@router.post("/split-all")
def split_all():
    queued_count = 0
    for song in database.get_all_songs():
        if song["split_status"] == "PENDING":
            enqueue_split(song["id"])
            queued_count += 1
    return {"message": f"Added {queued_count} songs to the separation queue"}


@router.post("/generate-lyrics-all")
def generate_lyrics_all(model_size: str = "base"):
    queued_count = 0
    for song in database.get_all_songs():
        vocals_exist = song["vocals_path"] and os.path.exists(song["vocals_path"])
        if song["lyrics_status"] == "PENDING" and vocals_exist:
            enqueue_lyrics(song["id"], model_size)
            queued_count += 1
    return {"message": f"Added {queued_count} songs to the transcription queue"}


@router.get("/artists/image")
def get_artist_image(name: str):
    try:
        from ..services.image_provider import get_default_image_provider
        provider = get_default_image_provider()
        url = provider.get_artist_image(name)
        return {"image_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

