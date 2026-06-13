import os

from .. import database


def parse_lrc(raw_text: str) -> list[dict]:
    """Parse '[MM:SS.xx]text' lines into {time, text} entries."""
    lines = []
    for line in raw_text.splitlines():
        if "[" in line and "]" in line:
            try:
                time_part, text_part = line.split("]", 1)
                time_str = time_part.replace("[", "")
                minutes, seconds = time_str.split(":")
                total_seconds = int(minutes) * 60 + float(seconds)
                lines.append({
                    "time": total_seconds,
                    "text": text_part.strip()
                })
            except Exception:
                pass
    return lines


def read_lyrics(song: dict) -> dict:
    lyrics_path = song["lyrics_path"]
    raw_text = ""
    if lyrics_path and os.path.exists(lyrics_path):
        with open(lyrics_path, "r", encoding="utf-8") as f:
            raw_text = f.read()
    return {"lines": parse_lrc(raw_text), "raw": raw_text}


def save_lyrics(song: dict, lyrics_text: str):
    lyrics_path = song["lyrics_path"]
    if not lyrics_path:
        song_folder = os.path.dirname(song["original_path"])
        lyrics_path = os.path.join(song_folder, "lyrics.lrc")
        database.update_song_paths(song["id"], lyrics_path=lyrics_path)

    with open(lyrics_path, "w", encoding="utf-8") as f:
        f.write(lyrics_text)

    database.update_song_status(song["id"], lyrics_status="COMPLETED")
