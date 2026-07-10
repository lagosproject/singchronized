from typing import Union
from pydantic import BaseModel


class PlayRequest(BaseModel):
    song_id: int
    # int = PortAudio index, str "pw:<node>" = PipeWire sink
    singer_device: Union[int, str]
    audience_device: Union[int, str]
    # When singer_device == audience_device, pan vocals to the left channel
    # and the instrumental to the right channel of that single output
    # instead of dropping vocals entirely.
    stereo_split: bool = False


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


class PlaylistRenameRequest(BaseModel):
    new_name: str


class DelayRequest(BaseModel):
    delay: float


class CalibrationStartRequest(BaseModel):
    singer_device: Union[int, str]
    audience_device: Union[int, str]
