# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-07-10

### Added
- Stereo L/R split mode for single-output audio setups: pan vocals left and instrumental right instead of dropping vocals when only one output device is available.
- Audio latency calibration tool (tone or library-song based) with real-time dynamic delay adjustment via PortAudio DAC-time synchronization.
- Single-device audio mode for setups with only one output device.
- Internationalization (i18n) across all frontend components.
- Collapsible sidebar UI with a compact action row.
- Playlist renaming.
- Global `F11` fullscreen shortcut and sidebar toggle button.
- Played-progress highlighting on the song seek bar.
- Lyrics model tracking in the Studio pipeline.
- Optional GPU acceleration for AI processing, with a separately downloadable GPU pack.
- Community/project docs: issue and PR templates, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

### Changed
- Migrated frontend package management from npm to pnpm.
- Restructured README to lead with the user guide, moving deep architecture details to `ARCHITECTURE.md`.
- Removed cover image upload in favor of drag-and-drop thumbnail selection.

### Fixed
- Audio playback stability, device refreshing, and startup backend API synchronization.
- AI processing crash during Demucs/Whisper pipeline runs.
- Calibration loop reworked to use a non-blocking PortAudio callback, fixing WDM-KS host API support and audio lockups.
- Inverted calibration delay sign convention to match intuitive latency compensation.
- Double output streams opening in single-device mode.
- Window label conflict causing a blank UI on Linux AppImage builds.
- WebSocket playback sync broken in AppImage builds (missing bundled `websockets` package).
- SSL certificate and thumbnail URL issues affecting Demucs/Deezer in frozen builds.
- Demucs split failing in frozen AppImage builds (numpy/torchaudio packaging).

## [2.0.0] - 2026-06-13

### Added
- Rewrote frontend in React + Vite + TypeScript.
- Integrated Tauri framework for cross-platform desktop installers (Linux `.deb`, `.AppImage`, and Windows `.exe`).
- Integrated Demucs for high-quality audio stem splitting (vocals + instrumentals).
- Integrated faster-whisper for local AI time-synced lyrics (LRC) generation.
- Added dual audio output support for Singer headphones (original mix) and Audience speakers (instrumental only).
- Added playlist management support with automatic track transitions.
- Added interactive LRC lyrics editor.

### Changed
- Migrated codebase from the old pygame-based CLI to FastAPI backend and React frontend.

## [1.0.0] - 2022-10-15

### Added
- Initial release of the Python/pygame CLI karaoke player.
- Support for playing audio tracks with synced LRC files.
