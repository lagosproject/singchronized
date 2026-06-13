from pydantic import BaseModel


class PlayRequest(BaseModel):
    song_id: int
    # int = PortAudio index, str "pw:<node>" = PipeWire sink
    singer_device: int | str
    audience_device: int | str


class SeekRequest(BaseModel):
    position: float


class VolumeRequest(BaseModel):
    singer_volume: float
    audience_volume: float


class SaveLyricsRequest(BaseModel):
    lyrics_text: str


class PlaylistCreateRequest(BaseModel):
    name: str
    song_ids: list[int]
