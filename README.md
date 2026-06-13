# <img src="logo.svg" alt="SingChronized Logo" width="44" height="44" valign="middle" /> SingChronized 🎤🎶

Sing karaoke with your own music library. The app plays the **original vocals to the singer's headphones** 🎧 while the audience hears **only the instrumental** through the speakers 🎼 — with synced lyrics on screen.

Local AI does the heavy lifting:

- **Demucs** splits any song into vocals + instrumental
- **faster-whisper** transcribes time-synced lyrics (LRC)

> Looking for the old Python/pygame CLI version? It's available as the [v1.0.0 release](https://github.com/lagosproject/Karaoke/releases/tag/v1.0.0).

## Architecture

| Part | Stack | Location |
|---|---|---|
| Backend | Python, FastAPI, sounddevice, Demucs, faster-whisper, SQLite | `backend/` |
| Frontend | React 19, Vite | `frontend/` |

The frontend talks to the backend over a REST API plus a websocket (`/api/ws/playback`) for real-time playback position and AI task progress. The app ships as a **Tauri desktop app** (`frontend/src-tauri/`): the Python backend is frozen with PyInstaller and spawned by Tauri as a sidecar on a free port, which is injected into the webview at startup. Alternatively, the backend can serve the built frontend itself as a plain web app.

```
backend/app/
├── main.py        # FastAPI app factory + lifespan
├── config.py      # Paths and constants
├── schemas.py     # Pydantic request models
├── database.py    # SQLite song repository
├── ws.py          # Websocket connection manager
├── routers/       # HTTP/WS endpoints (songs, lyrics, playback, playlists, devices, system)
├── services/      # Library files, lyrics, playlist logic
├── workers/       # Background AI queue (Demucs split, Whisper transcription)
└── audio/         # Dual-output audio engine (singer + audience devices)

frontend/src/
├── api/           # REST client
├── context/       # App-wide state provider
├── hooks/         # Playback socket, library, queue, playlists, devices…
└── components/    # home / studio / settings / player / playlists / songs
```

## 🛠 Setup

```bash
# Backend
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install
```

## ▶️ Run

```bash
python run_app.py
```

This builds the frontend and starts the server at http://localhost:8000.

For development with hot reload, run the two halves separately:

```bash
.venv/bin/python -m uvicorn backend.app.main:app --reload   # API on :8000
cd frontend && npm run dev                                   # UI on :5173
```

To develop inside the Tauri shell instead (uses the same dev backend on :8000):

```bash
.venv/bin/python -m uvicorn backend.app.main:app --reload   # API on :8000
cd frontend && npm run tauri dev
```

## 📦 Desktop bundles (Tauri)

Installers for Linux (`.deb`, `.AppImage`) and Windows (NSIS `.exe`) are built by the
[release workflow](.github/workflows/release.yml) on every `v*` tag (or manually via
*workflow dispatch*). To build locally:

```bash
# 1. Freeze the backend sidecar (output: dist/singchronized-backend/)
.venv/bin/pip install pyinstaller
.venv/bin/pyinstaller singchronized-backend.spec --noconfirm

# 2. Stage it as a Tauri resource
mkdir -p frontend/src-tauri/resources
cp -r dist/singchronized-backend frontend/src-tauri/resources/backend

# 3. Build the app + installers
cd frontend && npm run tauri build
```

The packaged app stores its library and database in the per-user data dir
(`~/.local/share/SingChronized` on Linux, `%APPDATA%\SingChronized` on Windows). AI models are
downloaded on first use to the usual torch/HuggingFace caches. Tip: install the CPU-only
torch wheels (`pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu`)
before freezing unless you want a multi-GB CUDA bundle.

## 🎵 Usage

1. Open the **Ingestion & Processing** tab and import an audio file (title + artist).
2. Click **Split Audio** to separate vocals/instrumental, then **Auto Lyrics** to generate synced lyrics (editable afterwards in the lyrics editor).
3. In **Settings → Audio Routing**, pick the singer (headphones) and audience (speakers) outputs.
4. Hit play and sing your heart out! 🌟🎤🕺💃

Songs, stems and lyrics are stored under `backend/library/`, indexed in `backend/library.db` (or the per-user data dir when running the packaged desktop app).
