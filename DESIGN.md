# SingChronized — Design Document

> Reference for AI-assisted development. Describes architecture, data model, API, frontend structure, and key behaviors as they exist in v2.0.0.

---

## 1. Purpose

SingChronized is a desktop karaoke application that lets users sing along to their own music library. Its core trick is **dual-output audio routing**: the singer hears the original vocals through their headphones, while the audience hears only the instrumental through the main speakers. Time-synced lyrics scroll on screen for the singer.

All AI processing (stem separation, transcription) runs locally — no cloud account or internet connection required after first use.

---

## 2. Architecture

```
┌─────────────────────────────────────────┐
│              Tauri shell                │  (Rust)
│  spawns backend sidecar on a free port  │
│  injects window.__BACKEND_PORT__        │
└──────────────┬──────────────────────────┘
               │ HTTP + WebSocket
┌──────────────▼──────────────────────────┐
│           FastAPI backend               │  (Python)
│  REST API  ·  WebSocket  ·  Audio engine│
│  Demucs worker  ·  Whisper worker       │
└──────────────┬──────────────────────────┘
               │ serves built frontend
┌──────────────▼──────────────────────────┐
│          React 19 frontend              │  (Vite)
│  hooks  ·  context  ·  components      │
└─────────────────────────────────────────┘
```

The frontend is a single-page React app. In the packaged desktop build it is served as static files by FastAPI itself (`/`). In development, Vite runs on `:5173` and the backend runs on `:8000` — CORS is wide open in both modes.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop shell | Tauri 2 (Rust) | Bundles to `.deb`, `.AppImage`, NSIS `.exe` |
| Backend | Python 3.12, FastAPI, uvicorn | Frozen by PyInstaller for distribution |
| Stem separation | Demucs 4 (htdemucs model) | GPU if available, CPU fallback |
| Lyrics transcription | faster-whisper (CTranslate2) | Model size selectable: tiny/base/small/medium |
| Audio I/O | sounddevice (PortAudio), soundfile | PipeWire-aware sink routing on Linux |
| Database | SQLite via raw `sqlite3` | Single file: `library.db` |
| Frontend | React 19, Vite 8 | No router — single-page, view switching in state |
| Icons | lucide-react | Only icon library used |

---

## 4. Data Model

### `songs` table (SQLite)

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `title` | TEXT | Song title (user-supplied on import) |
| `artist` | TEXT | Artist name (user-supplied on import) |
| `original_path` | TEXT | Absolute path to the uploaded audio file |
| `vocals_path` | TEXT \| NULL | Path to Demucs-separated vocals stem |
| `instrumental_path` | TEXT \| NULL | Path to Demucs-separated instrumental stem |
| `lyrics_path` | TEXT \| NULL | Path to the `.lrc` file |
| `split_status` | TEXT | `PENDING` / `PROCESSING` / `COMPLETED` / `FAILED` |
| `lyrics_status` | TEXT | `PENDING` / `PROCESSING` / `COMPLETED` / `FAILED` |
| `split_error` | TEXT \| NULL | Error message if split failed |
| `lyrics_error` | TEXT \| NULL | Error message if transcription failed |
| `created_at` | TIMESTAMP | Row creation time |

Stale `PROCESSING` statuses (set before a server crash) are reset to `PENDING` on startup.

### File layout on disk

```
<DATA_DIR>/
├── library.db
└── library/
    ├── <Artist> - <Title>/
    │   ├── original.<ext>       # uploaded file
    │   ├── vocals.wav           # Demucs output
    │   ├── no_vocals.wav        # Demucs output (instrumental)
    │   ├── lyrics.lrc           # Whisper output / user edits
    │   └── thumbnail.<ext>      # optional cover art
    ├── cache/                   # artist image cache
    └── playlists/
        └── <name>/
            ├── playlist.json    # ordered list of song IDs
            └── thumbnail.<ext>  # optional playlist cover
```

**Data dir location:**
- Dev / source run: `backend/` (alongside `library.db`)
- Packaged app: `~/.local/share/SingChronized` (Linux), `%APPDATA%\SingChronized` (Windows)
- Override: set `KARAOKE_DATA_DIR` environment variable

---

## 5. API Reference

All routes are prefixed `/api/`. The backend also serves `/library/…` as static files (thumbnails, etc.) and `/` as the built frontend.

### Songs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/songs` | List all songs (includes paths + statuses) |
| `POST` | `/api/songs` | Upload a song (multipart: `title`, `artist`, `file`, optional `thumbnail`) |
| `DELETE` | `/api/songs/{id}` | Delete song + all its files from disk |
| `POST` | `/api/songs/{id}/split` | Enqueue Demucs stem separation |
| `POST` | `/api/songs/{id}/generate-lyrics` | Enqueue Whisper transcription (`?model_size=base`) |
| `POST` | `/api/songs/split-all` | Enqueue split for every PENDING song |
| `POST` | `/api/songs/generate-lyrics-all` | Enqueue lyrics for every split+PENDING song |
| `GET` | `/api/songs/artists/image` | Fetch artist image URL (`?name=…`) |

### Lyrics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/songs/{id}/lyrics` | Returns `{ lines: [{time, text}] }` parsed from `.lrc` |
| `PUT` | `/api/songs/{id}/lyrics` | Save edited lyrics (`{ lyrics_text: "…" }` raw LRC string) |

### Playback

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/songs/play` | Start playback (`PlayRequest` body, see below) |
| `POST` | `/api/songs/pause` | Pause |
| `POST` | `/api/songs/resume` | Resume |
| `POST` | `/api/songs/stop` | Stop and reset |
| `POST` | `/api/songs/seek` | Seek (`{ position: float }` seconds) |
| `GET` | `/api/playback/status` | Current playback state snapshot |
| `POST` | `/api/playback/volume` | Set volumes (`{ singer_volume, audience_volume }` 0.0–1.0) |
| `WS` | `/api/ws/playback` | WebSocket — pushed every 100 ms while playing (see §7) |

**`PlayRequest` body:**
```json
{
  "song_id": 1,
  "singer_device": "pw:alsa_output.usb-headphones",
  "audience_device": "pw:alsa_output.pci-0000_00_1f.3"
}
```
`singer_device` / `audience_device` are either a PortAudio integer index or a `"pw:<node.name>"` string (PipeWire sink).

**Single-device mode:** if both devices are equal, only the instrumental (or full mix if not yet split) plays on the single output — vocals are suppressed to avoid mixing stems into the audience feed.

### Devices

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/devices` | List available output devices |
| `POST` | `/api/devices/{id}/test-tone` | Play a 440 Hz test tone on the given device |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/system/gpu` | Returns `{ has_gpu: bool, gpu_name: str \| null }` |

### Playlists

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/playlists` | List playlists with song lists |
| `POST` | `/api/playlists` | Create (`{ name, song_ids }`) |
| `DELETE` | `/api/playlists/{name}` | Delete playlist folder |
| `POST` | `/api/playlists/{name}/thumbnail` | Upload playlist cover image |

---

## 6. WebSocket Protocol

**Endpoint:** `ws://localhost:<PORT>/api/ws/playback`

All messages are JSON. The server only sends; the client sends no-op pings to keep the connection alive.

### Message types

**`playback_status`** — pushed every 100 ms while playing, and once on connect:
```json
{
  "type": "playback_status",
  "data": {
    "is_playing": true,
    "is_paused": false,
    "current_time": 42.3,
    "song_id": 7,
    "duration": 213.0,
    "singer_volume": 1.0,
    "audience_volume": 0.85
  }
}
```

**`progress_update`** — pushed during AI task execution:
```json
{
  "type": "progress_update",
  "data": {
    "song_id": 7,
    "action": "split",        // "split" | "lyrics"
    "progress": 65,           // 0–100
    "status": "PROCESSING"    // "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"
  }
}
```

---

## 7. Audio Engine

### Dual-output design

`KaraokePlayer` runs two `AudioStreamThread`s simultaneously:

- **thread1 (singer)** — plays `vocals.wav` (or `original.<ext>` as fallback) to the singer's headphone device
- **thread2 (audience)** — plays `no_vocals.wav` (instrumental) to the speaker device

Each thread owns a `sounddevice.OutputStream` with a pre-filled queue (`BUFFERSIZE=20` blocks of `BLOCKSIZE=2048` frames). A single callback drains the queue and scales by volume.

Playback time is read from `thread2.current_frame` (instrumental) so the lyrics cursor tracks the audience output, the authoritative clock.

### Seek

Both threads receive `seek_target_frame` independently. Each drains its queue, seeks the file, and refills. Minor jitter (< 1 block ≈ 46 ms at 44100 Hz) between the two outputs can occur.

### PipeWire routing (Linux)

PipeWire holds the ALSA hardware exclusively. PortAudio cannot open hardware devices directly; all streams land on whichever sink PipeWire routes "default" to. To address individual sinks, the backend reads `PIPEWIRE_NODE` from the environment when the PCM is opened — so stream creation is serialized under `_route_lock` while `PIPEWIRE_NODE` is set to the target sink's `node.name`.

Device IDs on PipeWire systems use the prefix `"pw:"`: e.g., `"pw:alsa_output.usb-Creative_USB_Headset"`.

---

## 8. AI Pipeline

### Stem separation (Demucs)

- Model: `htdemucs` (default Demucs 4 model)
- Input: any audio format supported by torchaudio
- Output: `vocals.wav` + `no_vocals.wav` in the song's folder
- Progress: percentage is estimated from file writes and pushed via WebSocket
- CPU-only builds are supported (torch CPU wheels reduce bundle size from ~4 GB to ~800 MB)

### Lyrics transcription (faster-whisper)

- Model sizes: `tiny`, `base`, `small`, `medium` (user selects in Settings → AI)
- Input: `vocals.wav` (preferred) or `original.<ext>` (fallback if not split)
- Output: `.lrc` file with `[MM:SS.xx]` timestamps per word/segment
- The model is downloaded on first use to the default HuggingFace cache (`~/.cache/huggingface/`)

### Task queue

Both tasks share a single `queue.Queue` drained by one daemon thread. Tasks are serialized (no concurrency). Statuses in the DB and WebSocket progress messages are kept in sync throughout:

```
enqueue_* called
  → DB: status = PROCESSING
  → WS: { status: "QUEUED", progress: 0 }
    → task starts running
    → WS: { status: "PROCESSING", progress: 0..100 }
    → DB: paths updated (on success) or split_error set (on failure)
    → WS: { status: "COMPLETED"|"FAILED", progress: 100|last }
```

---

## 9. Frontend Structure

### State management

No Redux or Zustand — all state lives in React hooks composed into a single `AppContext` provider.

| Hook | Owns |
|---|---|
| `useLibrary` | Song list, fetch + CRUD |
| `usePlayback` | Playback state, lyrics, WebSocket connection, volume |
| `useQueue` | Ordered play queue, auto-advance |
| `useDevices` | Device list, singer/audience selection, localStorage persistence |
| `usePlaylists` | Playlist list, CRUD |
| `useKeyboardShortcuts` | Space = pause/resume, arrow keys = seek |
| `useLastPlayed` | Persists last-played song ID in localStorage |

### Views

| View | Route (via state) | Description |
|---|---|---|
| Home | default | Artist grid, search, recently played |
| Studio | `/studio` | Import songs, trigger AI pipeline, progress cards |
| Playlists | `/playlists` | Playlist cards, detail view |
| Settings | `/settings` | Audio routing, AI model size, queue behavior |

### Persistent UI layer (always visible)

- **Sidebar** — navigation + now-playing mini card
- **PlayerBar** — transport controls, seek bar, volume sliders
- **FullscreenLyrics** — fullscreen overlay with scrolling LRC lines (toggled from PlayerBar)
- **QueueCountdownOverlay** — countdown between songs in queue mode

---

## 10. Tauri Packaging

The Tauri shell (`frontend/src-tauri/src/lib.rs`) does three things:

1. **Finds the backend executable** at `<resource_dir>/backend/singchronized-backend[.exe]`
2. **Picks a free port** with `TcpListener::bind("127.0.0.1:0")`
3. **Spawns the sidecar** and waits up to 90 s for it to accept connections, then **injects `window.__BACKEND_PORT__`** into the webview so the frontend knows where the API lives

On Linux, `PR_SET_PDEATHSIG` ensures the backend process is killed if Tauri crashes without running the `Exit` handler.

In development (`tauri dev`), no sidecar is found so the shell falls back to port 8000 (assumed to be a running `uvicorn` process).

### Build pipeline

```
PyInstaller singchronized-backend.spec
  → dist/singchronized-backend/    (onedir)

cp -r dist/singchronized-backend frontend/src-tauri/resources/backend

cd frontend && npm run tauri build
  → .deb + .AppImage (Linux)
  → NSIS .exe (Windows)
```

CI runs this on `ubuntu-22.04` and `windows-latest` in parallel, triggered by any `v*` tag.

---

## 11. Configuration & Environment

| Variable | Default | Effect |
|---|---|---|
| `KARAOKE_DATA_DIR` | (none) | Override the per-user data directory |
| `PIPEWIRE_NODE` | (unset) | Set by the backend per-stream to route to a specific PipeWire sink |

No `.env` file is used in production. The backend reads its port from the CLI arguments passed by the Tauri shell (`--host 127.0.0.1 --port <PORT>`).

---

## 12. Known Constraints & Edge Cases

- **Single audio device**: if singer and audience device are identical, vocals are suppressed and only the instrumental (or full mix if not split) plays on the single output.
- **Song not split**: lyrics generation requires vocals to exist first (API returns 400 otherwise). Playback falls back to the original file for the singer track.
- **ALC255 (built-in audio, Linux)**: the jack and internal speakers share one ALSA PCM; they cannot be used simultaneously as separate outputs. A Bluetooth, USB, or HDMI second output is required for true dual-output on such hardware.
- **Model downloads**: Demucs and Whisper models are not bundled. The first split/transcription downloads ~1–2 GB per model. Progress is shown in the UI but the download itself has no granular progress.
- **Queue ordering**: the `queue.Queue` in `workers/queue.py` is FIFO and single-threaded. A long split job will block a queued lyrics job for the same or a different song.
