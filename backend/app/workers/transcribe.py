import subprocess

from .. import database
from ..config import PROJECT_ROOT
from .backend_select import resolve_backend_command
from .subprocess_utils import stream_progress


def run_whisper_transcription(song_id: int, audio_path: str, output_lrc_path: str, model_size: str = "base", progress_callback=None):
    """Transcribe audio into a synced .lrc file using faster-whisper (out-of-process,
    so it can use a downloaded GPU pack's torch build — see backend_select.py)."""
    try:
        database.update_song_status(song_id, lyrics_status="PROCESSING", lyrics_model=model_size)

        cmd = [
            *resolve_backend_command("transcribe"),
            audio_path,
            output_lrc_path,
            model_size,
        ]
        print(f"Running Whisper transcription: {' '.join(cmd)}")

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=PROJECT_ROOT,  # dev-mode fallback runs `-m backend.server`, which resolves via cwd
        )

        stream_progress(process, f"Whisper Song {song_id}", progress_callback)

        process.wait()
        if process.returncode != 0:
            raise Exception(f"Whisper transcription failed with exit code {process.returncode}")

        database.update_song_paths(song_id, lyrics_path=output_lrc_path)
        database.update_song_status(song_id, lyrics_status="COMPLETED", lyrics_model=model_size)
        print(f"Whisper transcription completed for song {song_id}")

    except Exception as e:
        import traceback
        print(f"Error transcribing song {song_id}:")
        traceback.print_exc()
        database.update_song_status(song_id, lyrics_status="FAILED", lyrics_error=traceback.format_exc(), lyrics_model=model_size)
        raise
