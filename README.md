# <img src="logo.svg" alt="SingChronized Logo" width="44" height="44" valign="middle" /> SingChronized 🎤🎶

Sing karaoke with your own music library. The app plays the **original vocals to the singer's headphones** 🎧 while the audience hears **only the instrumental** through the speakers 🎼 — with synced lyrics on screen.

Local AI does the heavy lifting:

- **Demucs** splits any song into vocals + instrumental
- **faster-whisper** transcribes time-synced lyrics (LRC)

> Looking for the old Python/pygame CLI version? It's available as the [v1.0.0 release](https://github.com/lagosproject/Karaoke/releases/tag/v1.0.0).

> For a full technical reference — stack, API, data model, audio engine, AI pipeline, and Tauri packaging — see [ARCHITECTURE.md](ARCHITECTURE.md).

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

## 🎵 User Guide

### Step 1 — Set up your audio outputs

Go to **Settings → Audio Routing** and pick two output devices:

- **Singer output** — your headphones. You'll hear the full song with vocals so you can follow along.
- **Audience output** — the speakers the crowd listens to. They'll only hear the instrumental.

Hit **Test** next to each device to confirm sound comes out of the right place. If you only have one output device (e.g. a laptop with no external audio), the app works in single-device mode: it plays the instrumental on the one output, just like a regular karaoke player.

> **Linux tip:** Bluetooth, USB, or HDMI audio are the easiest way to get two separate outputs. The built-in jack and speakers share one audio path on most laptops and can't be split.

---

### Step 2 — Import your music

Open the **Studio** tab and click **Import Song**.

![Import a song](docs/screenshots/studio-import.png)

Fill in the title and artist, then pick your audio file (MP3, FLAC, WAV, OGG, and most common formats work). You can also drag a cover image into the thumbnail field.

---

### Step 3 — Process with AI

Each imported song shows a pipeline card with two actions:

| Button | What it does | Time |
|---|---|---|
| **Split Audio** | Runs Demucs to separate vocals and instrumental | 1–5 min per song |
| **Auto Lyrics** | Runs Whisper to transcribe time-synced lyrics | 30 s–3 min per song |

![AI pipeline progress](docs/screenshots/studio-pipeline.png)

A progress bar appears while the AI works. You can queue multiple songs and they'll be processed one after another. The first run of each AI model downloads it (~1 GB for Demucs, ~150 MB–1.5 GB for Whisper depending on the size you pick in **Settings → AI**).

> **Auto Lyrics requires Split Audio to finish first** — Whisper gets better results from the isolated vocals track.

---

### Step 4 — Edit lyrics (optional)

Once lyrics are generated, click the **Edit Lyrics** button on any song to open the lyrics editor. The file is stored in standard [LRC format](https://en.wikipedia.org/wiki/LRC_(file_format)) — each line has a timestamp like `[01:23.45] Word or phrase`. You can fix transcription mistakes or adjust timing here.

![Lyrics editor](docs/screenshots/lyrics-editor.png)

---

### Step 5 — Play and sing

Click the play button on any song from the **Home** screen or the **Studio** tab. The lyrics scroll on screen in sync with the music.

![Now playing with lyrics](docs/screenshots/fullscreen-lyrics.png)

- Press **Space** to pause/resume
- Use the seek bar to jump to any point
- Toggle **Fullscreen Lyrics** for the big-screen karaoke view
- Adjust **Singer** and **Audience** volume sliders independently in the player bar

---

### Playlists

In the **Playlists** tab you can create ordered setlists. Songs in a playlist play back-to-back automatically, with a brief countdown between tracks so the next singer has time to step up.

![Playlists view](docs/screenshots/playlists.png)

---

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Seek back / forward 5 seconds |
| `F` | Toggle fullscreen lyrics |

Songs, stems, and lyrics are stored in `backend/library/` during development, or in `~/.local/share/SingChronized` (Linux) / `%APPDATA%\SingChronized` (Windows) when running the packaged app.
