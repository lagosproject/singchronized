import os

from .. import database


def format_lrc_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    rem_seconds = seconds % 60
    # format is [mm:ss.xx]
    return f"[{minutes:02d}:{rem_seconds:05.2f}]"


def run_whisper_transcription(song_id: int, audio_path: str, output_lrc_path: str, model_size: str = "base"):
    """Transcribe audio into a synced .lrc file using faster-whisper."""
    try:
        database.update_song_status(song_id, lyrics_status="PROCESSING")

        # Import inside the function to keep memory light until run
        from faster_whisper import WhisperModel
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        print(f"Loading faster-whisper model '{model_size}' on {device} ({compute_type})")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)

        print(f"Transcribing audio: {audio_path}")
        segments, info = model.transcribe(audio_path, beam_size=5)

        lrc_lines = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                lrc_lines.append(f"{format_lrc_timestamp(segment.start)}{text}")
                print(f"Transcribed [{segment.start:.2f}s - {segment.end:.2f}s]: {text}")

        os.makedirs(os.path.dirname(output_lrc_path), exist_ok=True)
        with open(output_lrc_path, "w", encoding="utf-8") as f:
            for line in lrc_lines:
                f.write(line + "\n")

        database.update_song_paths(song_id, lyrics_path=output_lrc_path)
        database.update_song_status(song_id, lyrics_status="COMPLETED")
        print(f"Whisper transcription completed for song {song_id}")

    except Exception as e:
        print(f"Error transcribing song {song_id}: {e}")
        database.update_song_status(song_id, lyrics_status="FAILED", lyrics_error=str(e))
