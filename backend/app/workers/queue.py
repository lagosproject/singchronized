import os
import queue
import threading

from .. import database
from ..ws import manager
from .split import run_demucs_separation
from .transcribe import run_whisper_transcription

_task_queue = queue.Queue()
_worker_thread = None


def report_progress(song_id: int, action: str, progress: int, status: str = "PROCESSING"):
    manager.broadcast_threadsafe({
        "type": "progress_update",
        "data": {
            "song_id": song_id,
            "action": action,
            "progress": progress,
            "status": status
        }
    })


def _run_split(song_id: int):
    song = database.get_song(song_id)
    if not song:
        return
    song_folder = os.path.dirname(song["original_path"])
    report_progress(song_id, "split", 0, "PROCESSING")
    run_demucs_separation(
        song_id,
        song["original_path"],
        song_folder,
        progress_callback=lambda percent: report_progress(song_id, "split", percent, "PROCESSING")
    )
    report_progress(song_id, "split", 100, "COMPLETED")


def _run_lyrics(song_id: int, model_size: str):
    song = database.get_song(song_id)
    if not song:
        return
    report_progress(song_id, "lyrics", 0, "PROCESSING")

    vocals_exist = song["vocals_path"] and os.path.exists(song["vocals_path"])
    audio_path = song["vocals_path"] if vocals_exist else song["original_path"]
    output_lrc = os.path.join(os.path.dirname(song["original_path"]), "lyrics.lrc")

    report_progress(song_id, "lyrics", 20, "PROCESSING")
    run_whisper_transcription(song_id, audio_path, output_lrc, model_size)
    report_progress(song_id, "lyrics", 100, "COMPLETED")


def _process_tasks():
    while True:
        try:
            task = _task_queue.get()
            if task is None:
                break

            print(f"Starting queued task: {task['type']} for song {task['song_id']}")
            if task["type"] == "split":
                _run_split(task["song_id"])
            elif task["type"] == "lyrics":
                _run_lyrics(task["song_id"], task.get("model_size", "base"))

            _task_queue.task_done()
        except Exception as e:
            print(f"Error in task worker: {e}")


def _ensure_worker():
    global _worker_thread
    if _worker_thread is None or not _worker_thread.is_alive():
        _worker_thread = threading.Thread(target=_process_tasks, daemon=True)
        _worker_thread.start()


def enqueue_split(song_id: int):
    database.update_song_status(song_id, split_status="PROCESSING")
    report_progress(song_id, "split", 0, "QUEUED")
    _task_queue.put({"type": "split", "song_id": song_id})
    _ensure_worker()


def enqueue_lyrics(song_id: int, model_size: str = "base"):
    database.update_song_status(song_id, lyrics_status="PROCESSING")
    report_progress(song_id, "lyrics", 0, "QUEUED")
    _task_queue.put({"type": "lyrics", "song_id": song_id, "model_size": model_size})
    _ensure_worker()
