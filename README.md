# <img src="logo.svg" alt="SingChronized Logo" width="44" height="44" valign="middle" /> SingChronized 🎤🎶

[![CI Build](https://github.com/lagosproject/Karaoke/actions/workflows/ci.yml/badge.svg)](https://github.com/lagosproject/Karaoke/actions/workflows/ci.yml)
[![Tauri Release](https://github.com/lagosproject/Karaoke/actions/workflows/release.yml/badge.svg)](https://github.com/lagosproject/Karaoke/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/lagosproject/Karaoke.svg)](https://github.com/lagosproject/Karaoke/releases)

Sing karaoke with your own music library. SingChronized plays the **original vocals to the singer's headphones** 🎧 while the audience hears **only the instrumental** through the speakers 🎼 — with synced lyrics scrolling on screen in real time.

---

## 📋 Table of Contents
- [🎵 User Guide](#-user-guide)
- [⌨️ Keyboard Shortcuts](#-keyboard-shortcuts)
- [🏗 Technical Architecture](#-technical-architecture)
- [📖 About the Project](#-about-the-project)
- [🛠 Prerequisites](#-prerequisites)
- [🚀 Installation & Setup](#-installation--setup)
- [⚙️ Configuration](#-configuration)
- [▶️ Running the App](#-running-the-app)
- [📦 Desktop Bundles (Tauri)](#-desktop-bundles-tauri)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎵 User Guide

### Step 1 — Set up your audio outputs
Go to **Settings → Audio Routing** and pick two output devices:
- **Singer output** — your headphones. You'll hear the full song with vocals so you can follow along.
- **Audience output** — the speakers the crowd listens to. They'll only hear the instrumental.

Hit **Test** next to each device to confirm sound comes out of the right place. If you only have one output device, the app plays the instrumental on the one output, just like a regular karaoke player.

> **Linux tip:** Bluetooth, USB, or HDMI audio are the easiest way to get two separate outputs. The built-in jack and speakers share one audio path on most laptops and can't be split.

---

### Step 2 — Import your music
Open the **Studio** tab and click **Import Song**.
Fill in the title and artist, then select your audio file (MP3, FLAC, WAV, OGG, and most common formats work). You can also drag a cover image into the thumbnail field.

---

### Step 3 — Process with AI
Each imported song shows a pipeline card with two actions:

| Button | What it does | Time |
|---|---|---|
| **Split Audio** | Runs Demucs to separate vocals and instrumental | 1–5 min per song |
| **Auto Lyrics** | Runs Whisper to transcribe time-synced lyrics | 30 s–3 min per song |

A progress bar appears while the AI works. The first run of each AI model downloads it (~1 GB for Demucs, ~150 MB–1.5 GB for Whisper).
> **Note:** *Auto Lyrics* requires *Split Audio* to finish first for higher transcription accuracy.

---

### Step 4 — Edit lyrics (optional)
Once lyrics are generated, click **Edit Lyrics** on any song to open the lyrics editor. The lyrics are stored in standard LRC format (`[MM:SS.xx] lyrics text`). You can fix transcription errors or adjust timing here.

---

### Step 5 — Play and sing
Click the play button on any song from the **Home** screen or the **Studio** tab. The lyrics scroll on screen in sync with the music.

- Press **Space** to pause/resume.
- Use the seek bar to jump to any point.
- Toggle **Fullscreen Lyrics** for the big-screen karaoke view.
- Adjust **Singer** and **Audience** volume sliders independently in the player bar.

---

### Playlists
In the **Playlists** tab, you can create ordered setlists. Songs in a playlist play back-to-back automatically, with a brief countdown between tracks so the next singer has time to step up.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Seek back / forward 5 seconds |
| `F` | Toggle fullscreen lyrics |

---

## 🏗 Technical Architecture

For an in-depth reference containing architecture details, stack diagrams, API structures, data model references, details on the audio routing engine, local AI integration details, and packaging guidelines:
👉 **See [ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 📖 About the Project

SingChronized is a desktop karaoke player designed for home parties and small venues. Traditional karaoke players remove vocals from songs completely, making it hard for amateur singers to stay on pitch and tempo. SingChronized solves this by routing audio to two outputs:
1. **Singer Output (Headphones)**: The singer hears the original full song (vocals + instrumental) to guide them.
2. **Audience Output (Speakers)**: The crowd hears only the isolated instrumental track.

### Tech Stack
- **Frontend**: React, Vite, TypeScript, Lucide Icons, and Tailwind CSS.
- **Desktop Shell**: Tauri (Rust-powered lightweight wrapper).
- **Backend API**: FastAPI (Python 3.12) serving audio streams over WebSockets.
- **AI Processing Pipeline**:
  - **Demucs**: Splits any song into vocals + instrumental stems.
  - **faster-whisper**: Transcribes and generates time-synced lyrics (LRC files) locally.

---

## 🛠 Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.12+**
- **Node.js 22+**
- **Rust (stable toolchain)** (only required if building Tauri desktop packages)
- **Git**

---

## 🚀 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/lagosproject/Karaoke.git
   cd Karaoke
   ```

2. **Set up the Backend**:
   Create a virtual environment and install the Python dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

3. **Set up the Frontend**:
   Install Node dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

---

## ⚙️ Configuration

SingChronized supports custom environment configurations (e.g., for fetching album artwork/metadata via external APIs).

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the values:
   - **`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`**: Retrieve from the Spotify Developer Dashboard.
   - **`GENIUS_ACCESS_TOKEN`**: Retrieve from Genius API Clients page.
   - **`KARAOKE_DATA_DIR`**: (Optional) Override path to store imported songs and database.

---

## ▶️ Running the App

To run the application with single-command startup (runs a built frontend served by the backend):
```bash
python run_app.py
```
This serves the application locally at [http://localhost:8000](http://localhost:8000).

### Development with Hot Reload
To run frontend and backend developers' hot-reload servers separately:

1. **Start the API Backend** (runs on port `8000`):
   ```bash
   .venv/bin/python -m uvicorn backend.app.main:app --reload
   ```

2. **Start the Vite Frontend** (runs on port `5173`):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Develop Inside the Tauri Shell**:
   To test inside the native desktop frame instead of a browser:
   ```bash
   # Keep the API backend running, then run:
   cd frontend
   npm run tauri dev
   ```

---

## 📦 Desktop Bundles (Tauri)

Installers for Linux (`.deb`, `.AppImage`) and Windows (NSIS `.exe`) are built by the [Release Workflow](.github/workflows/release.yml) on every `v*` tag.

To build the standalone installer locally:
```bash
# 1. Freeze the backend sidecar (outputs to dist/singchronized-backend/)
.venv/bin/pip install pyinstaller
.venv/bin/pyinstaller singchronized-backend.spec --noconfirm

# 2. Stage it as a Tauri resource
mkdir -p frontend/src-tauri/resources
cp -r dist/singchronized-backend frontend/src-tauri/resources/backend

# 3. Build the app + installers
cd frontend
npm run tauri build
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
