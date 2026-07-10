import os


def format_lrc_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    rem_seconds = seconds % 60
    # format is [mm:ss.xx]
    return f"[{minutes:02d}:{rem_seconds:05.2f}]"


def transcribe_to_lrc(
    audio_path: str,
    output_lrc_path: str,
    model_size: str = "base",
    progress_callback=None,
):
    """Transcribe audio into a synced .lrc file using faster-whisper.

    Runs in whichever process/interpreter it's called from (bundled CPU
    backend or downloaded GPU pack) — device selection is purely local to
    that process's torch build.
    """
    from faster_whisper import WhisperModel
    import soundfile as sf
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    print(f"Loading faster-whisper model '{model_size}' on {device} ({compute_type})")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    total_duration = sf.info(audio_path).duration

    print(f"Transcribing audio: {audio_path}")
    segments, info = model.transcribe(audio_path, beam_size=5)

    lrc_lines = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            lrc_lines.append(f"{format_lrc_timestamp(segment.start)}{text}")
            print(f"Transcribed [{segment.start:.2f}s - {segment.end:.2f}s]: {text}")
        if progress_callback and total_duration:
            progress_callback(min(100, int(segment.end / total_duration * 100)))

    os.makedirs(os.path.dirname(output_lrc_path), exist_ok=True)
    with open(output_lrc_path, "w", encoding="utf-8") as f:
        for line in lrc_lines:
            f.write(line + "\n")

    if progress_callback:
        progress_callback(100)
