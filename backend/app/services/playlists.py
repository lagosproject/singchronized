import os
import shutil

from .. import database
from .library import with_media_flags
from ..config import PLAYLISTS_DIR, THUMBNAIL_EXTENSIONS


def _playlist_path(name: str) -> str:
    return os.path.join(PLAYLISTS_DIR, f"{name}.m3u")


def find_thumbnail_url(name: str):
    for ext in THUMBNAIL_EXTENSIONS:
        if os.path.exists(os.path.join(PLAYLISTS_DIR, f"{name}{ext}")):
            return f"/library/playlists/{name}{ext}"
    return None


def _read_song_paths(filepath: str) -> list[str]:
    song_paths = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    song_paths.append(line)
    except Exception:
        pass
    return song_paths


def list_playlists() -> list[dict]:
    os.makedirs(PLAYLISTS_DIR, exist_ok=True)

    all_songs = database.get_all_songs()
    songs_by_path = {os.path.normpath(s["original_path"]): s for s in all_songs}

    result = []
    for filename in os.listdir(PLAYLISTS_DIR):
        if not filename.lower().endswith(".m3u"):
            continue
        playlist_name = os.path.splitext(filename)[0]

        playlist_songs = []
        for path in _read_song_paths(os.path.join(PLAYLISTS_DIR, filename)):
            song = songs_by_path.get(os.path.normpath(path))
            if song:
                playlist_songs.append(with_media_flags(dict(song)))

        result.append({
            "name": playlist_name,
            "filename": filename,
            "songs": playlist_songs,
            "thumbnail_url": find_thumbnail_url(playlist_name)
        })

    return result


def create_playlist(name: str, song_ids: list[int]) -> str:
    """Write an .m3u playlist; returns the sanitized name or raises ValueError."""
    os.makedirs(PLAYLISTS_DIR, exist_ok=True)

    safe_name = "".join(c for c in name if c.isalnum() or c in (" ", "_", "-")).strip()
    if not safe_name:
        raise ValueError("Invalid playlist name")

    lines = ["#EXTM3U"]
    for song_id in song_ids:
        song = database.get_song(song_id)
        if song:
            lines.append(f"#EXTINF:0,{song['artist']} - {song['title']}")
            lines.append(song["original_path"])

    with open(_playlist_path(safe_name), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return safe_name


def delete_playlist(name: str) -> bool:
    filepath = _playlist_path(name)
    if not os.path.exists(filepath):
        return False

    os.remove(filepath)
    for ext in THUMBNAIL_EXTENSIONS:
        thumb_path = os.path.join(PLAYLISTS_DIR, f"{name}{ext}")
        if os.path.exists(thumb_path):
            try:
                os.remove(thumb_path)
            except Exception:
                pass
    return True


def save_thumbnail(name: str, upload_filename: str, upload_file) -> str:
    """Store a playlist cover image, replacing any existing one. Returns its URL."""
    os.makedirs(PLAYLISTS_DIR, exist_ok=True)

    file_ext = os.path.splitext(upload_filename)[1].lower()
    if file_ext not in THUMBNAIL_EXTENSIONS:
        raise ValueError("Only images are allowed")

    for ext in THUMBNAIL_EXTENSIONS:
        old_path = os.path.join(PLAYLISTS_DIR, f"{name}{ext}")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    dest_path = os.path.join(PLAYLISTS_DIR, f"{name}{file_ext}")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(upload_file, buffer)

    return f"/library/playlists/{name}{file_ext}"
