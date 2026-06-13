import os
import sys

APP_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(APP_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

IS_FROZEN = getattr(sys, "frozen", False)


def _user_data_dir() -> str:
    """Per-user writable data dir for packaged builds (the install dir is read-only)."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif sys.platform == "darwin":
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))
    return os.path.join(base, "SingChronized")


if IS_FROZEN or os.environ.get("KARAOKE_DATA_DIR"):
    DATA_DIR = os.environ.get("KARAOKE_DATA_DIR") or _user_data_dir()
else:
    DATA_DIR = BACKEND_DIR

LIBRARY_DIR = os.path.join(DATA_DIR, "library")
PLAYLISTS_DIR = os.path.join(LIBRARY_DIR, "playlists")
DATABASE_PATH = os.path.join(DATA_DIR, "library.db")
FRONTEND_DIST_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")

# Audio streaming
BLOCKSIZE = 2048
BUFFERSIZE = 20

# Seconds between playback status broadcasts to websocket clients
PLAYBACK_BROADCAST_INTERVAL = 0.1

THUMBNAIL_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
