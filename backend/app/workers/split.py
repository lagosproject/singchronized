import os
import re
import shutil
import subprocess
import sys

from .. import database
from ..config import IS_FROZEN, PROJECT_ROOT


def _demucs_command() -> list:
    if IS_FROZEN:
        # Packaged build: re-invoke our own executable, whose entry point
        # dispatches "demucs" to demucs.separate.main (see backend/server.py).
        return [sys.executable, "demucs"]
    venv_demucs = os.path.join(PROJECT_ROOT, ".venv", "bin", "demucs")
    if os.path.exists(venv_demucs):
        return [venv_demucs]
    return ["demucs"]  # fallback to system path


def _stream_progress(process, progress_callback):
    """Parse percentages from Demucs/tqdm output (lines end with \\r or \\n)."""
    percent_re = re.compile(r'(\d+)%')
    buffer = []

    def flush():
        if buffer:
            match = percent_re.search("".join(buffer))
            if match:
                progress_callback(int(match.group(1)))
            buffer.clear()

    while True:
        char = process.stdout.read(1)
        if not char:
            flush()
            break
        if char in ('\r', '\n'):
            flush()
        else:
            buffer.append(char)


def _locate_output_tracks(output_dir: str, filename_no_ext: str):
    """Find vocals/no_vocals wavs regardless of which Demucs model folder was used."""
    model_name = "htdemucs"  # default demucs model
    vocals = os.path.join(output_dir, model_name, filename_no_ext, "vocals.wav")
    no_vocals = os.path.join(output_dir, model_name, filename_no_ext, "no_vocals.wav")
    if os.path.exists(vocals) and os.path.exists(no_vocals):
        return vocals, no_vocals, model_name

    for subdir in os.listdir(output_dir):
        if not os.path.isdir(os.path.join(output_dir, subdir)):
            continue
        v_path = os.path.join(output_dir, subdir, filename_no_ext, "vocals.wav")
        nv_path = os.path.join(output_dir, subdir, filename_no_ext, "no_vocals.wav")
        if os.path.exists(v_path) and os.path.exists(nv_path):
            return v_path, nv_path, subdir

    raise FileNotFoundError("Could not find Demucs output tracks (vocals/no_vocals).")


def run_demucs_separation(song_id: int, original_path: str, output_dir: str, progress_callback=None):
    """Split a track into vocals.wav and instrumental.wav using Demucs."""
    try:
        database.update_song_status(song_id, split_status="PROCESSING")
        os.makedirs(output_dir, exist_ok=True)

        cmd = [
            *_demucs_command(),
            "--two-stems=vocals",
            "-o", output_dir,
            original_path
        ]
        print(f"Running Demucs: {' '.join(cmd)}")

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        if progress_callback:
            _stream_progress(process, progress_callback)
        else:
            for line in process.stdout:
                print(f"[Demucs Song {song_id}]: {line.strip()}")

        process.wait()
        if process.returncode != 0:
            raise Exception(f"Demucs failed with exit code {process.returncode}")

        filename_no_ext = os.path.splitext(os.path.basename(original_path))[0]
        vocals_source, no_vocals_source, model_name = _locate_output_tracks(output_dir, filename_no_ext)

        vocals_dest = os.path.join(output_dir, "vocals.wav")
        instrumental_dest = os.path.join(output_dir, "instrumental.wav")
        shutil.move(vocals_source, vocals_dest)
        shutil.move(no_vocals_source, instrumental_dest)

        try:
            shutil.rmtree(os.path.join(output_dir, model_name))
        except Exception:
            pass

        database.update_song_paths(song_id, vocals_path=vocals_dest, instrumental_path=instrumental_dest)
        database.update_song_status(song_id, split_status="COMPLETED")
        print(f"Demucs separation complete for song {song_id}")

    except Exception as e:
        print(f"Error splitting song {song_id}: {e}")
        database.update_song_status(song_id, split_status="FAILED", split_error=str(e))
        raise
