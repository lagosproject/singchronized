import os
import shutil

from .. import database
from ..config import LIBRARY_DIR, THUMBNAIL_EXTENSIONS


def find_song_thumbnail(original_path: str) -> str:
    if not original_path:
        return None
    song_folder = os.path.dirname(original_path)
    if not os.path.exists(song_folder):
        return None
    for ext in THUMBNAIL_EXTENSIONS:
        if os.path.exists(os.path.join(song_folder, f"thumbnail{ext}")):
            folder_name = os.path.basename(song_folder)
            return f"/library/{folder_name}/thumbnail{ext}"
    return None


def with_media_flags(song: dict) -> dict:
    """Annotate a song row with whether its media files actually exist on disk."""
    song["has_vocals"] = bool(song["vocals_path"] and os.path.exists(song["vocals_path"]))
    song["has_instrumental"] = bool(song["instrumental_path"] and os.path.exists(song["instrumental_path"]))
    song["has_lyrics"] = bool(song["lyrics_path"] and os.path.exists(song["lyrics_path"]))
    
    local_thumb = find_song_thumbnail(song["original_path"])
    if local_thumb:
        song["thumbnail_url"] = local_thumb
    else:
        # Option B fallback: lazy-load image
        try:
            from .image_provider import get_default_image_provider
            provider = get_default_image_provider()
            song["thumbnail_url"] = provider.get_song_image(song["title"], song["artist"])
        except Exception as e:
            print(f"Lazy thumbnail retrieval error: {e}")
            song["thumbnail_url"] = None
            
    return song


def list_songs() -> list[dict]:
    return [with_media_flags(song) for song in database.get_all_songs()]


def save_uploaded_song(title: str, artist: str, upload_filename: str, upload_file, thumbnail_file=None) -> int:
    """Store an uploaded audio file in an 'Artist - Title' folder and register it."""
    folder_name = f"{artist.strip()} - {title.strip()}".replace("/", "_").replace("\\", "_")
    song_folder = os.path.join(LIBRARY_DIR, folder_name)
    os.makedirs(song_folder, exist_ok=True)

    file_ext = os.path.splitext(upload_filename)[1]
    dest_file_path = os.path.join(song_folder, f"original{file_ext}")

    with open(dest_file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file, buffer)

    has_uploaded_thumb = False
    if thumbnail_file and thumbnail_file.filename:
        thumb_ext = os.path.splitext(thumbnail_file.filename)[1].lower()
        if thumb_ext in THUMBNAIL_EXTENSIONS:
            thumb_dest_path = os.path.join(song_folder, f"thumbnail{thumb_ext}")
            with open(thumb_dest_path, "wb") as thumb_buffer:
                shutil.copyfileobj(thumbnail_file.file, thumb_buffer)
            has_uploaded_thumb = True

    # Option A: Ingestion-time proactive image fetch
    if not has_uploaded_thumb:
        try:
            from .image_provider import get_default_image_provider
            provider = get_default_image_provider()
            provider.get_song_image(title, artist)
            for part in artist.split(','):
                name = part.strip()
                if name:
                    provider.get_artist_image(name)
        except Exception as e:
            print(f"Proactive image download error at ingestion: {e}")

    return database.add_song(title=title, artist=artist, original_path=dest_file_path)


def delete_song_with_files(song: dict):
    database.delete_song(song["id"])

    song_folder = os.path.dirname(song["original_path"])
    if song_folder.startswith(LIBRARY_DIR) and os.path.exists(song_folder):
        try:
            shutil.rmtree(song_folder)
        except Exception as e:
            print(f"Error cleaning up files: {e}")
