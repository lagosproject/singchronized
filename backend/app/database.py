import sqlite3

from .config import DATABASE_PATH


def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            original_path TEXT NOT NULL,
            vocals_path TEXT,
            instrumental_path TEXT,
            lyrics_path TEXT,
            split_status TEXT NOT NULL DEFAULT 'PENDING',
            lyrics_status TEXT NOT NULL DEFAULT 'PENDING',
            split_error TEXT,
            lyrics_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Handle backward compatibility/migration for existing DB
    for column in ("split_error", "lyrics_error"):
        try:
            cursor.execute(f"ALTER TABLE songs ADD COLUMN {column} TEXT")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()


def reset_stale_statuses():
    """Requeue tasks that were interrupted by a server shutdown."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE songs SET split_status = 'PENDING' WHERE split_status = 'PROCESSING'")
    cursor.execute("UPDATE songs SET lyrics_status = 'PENDING' WHERE lyrics_status = 'PROCESSING'")
    conn.commit()
    conn.close()


def add_song(title: str, artist: str, original_path: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO songs (title, artist, original_path, split_status, lyrics_status)
        VALUES (?, ?, ?, 'PENDING', 'PENDING')
    """, (title, artist, original_path))
    conn.commit()
    song_id = cursor.lastrowid
    conn.close()
    return song_id


def get_all_songs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM songs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_song(song_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM songs WHERE id = ?", (song_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_song_status(song_id: int, split_status: str = None, lyrics_status: str = None,
                       split_error: str = None, lyrics_error: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    updates = []
    params = []

    if split_status is not None:
        updates.append("split_status = ?")
        params.append(split_status)
    if lyrics_status is not None:
        updates.append("lyrics_status = ?")
        params.append(lyrics_status)

    if split_error is not None:
        updates.append("split_error = ?")
        params.append(split_error)
    elif split_status in ('PENDING', 'PROCESSING', 'COMPLETED'):
        # clear error if retrying or successful
        updates.append("split_error = NULL")

    if lyrics_error is not None:
        updates.append("lyrics_error = ?")
        params.append(lyrics_error)
    elif lyrics_status in ('PENDING', 'PROCESSING', 'COMPLETED'):
        updates.append("lyrics_error = NULL")

    if updates:
        params.append(song_id)
        cursor.execute(f"UPDATE songs SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()

    conn.close()


def update_song_paths(song_id: int, vocals_path: str = None, instrumental_path: str = None,
                      lyrics_path: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if vocals_path is not None:
        updates.append("vocals_path = ?")
        params.append(vocals_path)
    if instrumental_path is not None:
        updates.append("instrumental_path = ?")
        params.append(instrumental_path)
    if lyrics_path is not None:
        updates.append("lyrics_path = ?")
        params.append(lyrics_path)

    if updates:
        params.append(song_id)
        cursor.execute(f"UPDATE songs SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()
    conn.close()


def delete_song(song_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()
