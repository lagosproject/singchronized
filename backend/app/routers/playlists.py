from fastapi import APIRouter, File, HTTPException, UploadFile

from ..schemas import PlaylistCreateRequest
from ..services import playlists as playlist_service

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.get("")
def get_playlists():
    return playlist_service.list_playlists()


@router.post("")
def create_playlist(req: PlaylistCreateRequest):
    try:
        safe_name = playlist_service.create_playlist(req.name, req.song_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create playlist: {e}")
    return {"message": f"Playlist {safe_name} created successfully"}


@router.delete("/{name}")
def delete_playlist(name: str):
    try:
        deleted = playlist_service.delete_playlist(name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete playlist: {e}")
    if not deleted:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": f"Playlist {name} deleted"}


@router.post("/{name}/thumbnail")
async def upload_playlist_thumbnail(name: str, file: UploadFile = File(...)):
    try:
        url = playlist_service.save_thumbnail(name, file.filename, file.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Thumbnail uploaded successfully", "url": url}
