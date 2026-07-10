import os
import shutil
import subprocess

from .. import database
from .backend_select import resolve_backend_command
from .subprocess_utils import stream_progress

try:
    import certifi

    _CERTIFI_BUNDLE = certifi.where()
except ImportError:
    _CERTIFI_BUNDLE = None


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


def run_demucs_separation(
    song_id: int, original_path: str, output_dir: str, progress_callback=None
):
    """Split a track into vocals.wav and instrumental.wav using Demucs."""
    try:
        database.update_song_status(song_id, split_status="PROCESSING")
        os.makedirs(output_dir, exist_ok=True)

        cmd = [
            *resolve_backend_command("demucs"),
            "--two-stems=vocals",
            "-o",
            output_dir,
            original_path,
        ]
        print(f"Running Demucs: {' '.join(cmd)}")

        env = os.environ.copy()
        if _CERTIFI_BUNDLE and os.path.exists(_CERTIFI_BUNDLE):
            env.setdefault("SSL_CERT_FILE", _CERTIFI_BUNDLE)
            env.setdefault("REQUESTS_CA_BUNDLE", _CERTIFI_BUNDLE)

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )

        stream_progress(process, f"Demucs Song {song_id}", progress_callback)

        process.wait()
        if process.returncode != 0:
            raise Exception(f"Demucs failed with exit code {process.returncode}")

        filename_no_ext = os.path.splitext(os.path.basename(original_path))[0]
        vocals_source, no_vocals_source, model_name = _locate_output_tracks(
            output_dir, filename_no_ext
        )

        vocals_dest = os.path.join(output_dir, "vocals.wav")
        instrumental_dest = os.path.join(output_dir, "instrumental.wav")
        shutil.move(vocals_source, vocals_dest)
        shutil.move(no_vocals_source, instrumental_dest)

        try:
            shutil.rmtree(os.path.join(output_dir, model_name))
        except Exception:
            pass

        database.update_song_paths(
            song_id, vocals_path=vocals_dest, instrumental_path=instrumental_dest
        )
        database.update_song_status(song_id, split_status="COMPLETED")
        print(f"Demucs separation complete for song {song_id}")

    except Exception:
        import traceback

        print(f"Error splitting song {song_id}:")
        traceback.print_exc()
        database.update_song_status(
            song_id, split_status="FAILED", split_error=traceback.format_exc()
        )
        raise
