import queue
import threading
import time

import numpy as np
import sounddevice as sd
import soundfile as sf

from ..config import BLOCKSIZE, BUFFERSIZE
from .devices import open_target, pipewire_available


def resample_audio(data, orig_sr, target_sr):
    if orig_sr == target_sr:
        return data
    num_samples = int(round(len(data) * target_sr / orig_sr))
    x_orig = np.arange(len(data)) / orig_sr
    x_target = np.arange(num_samples) / target_sr

    if len(data.shape) > 1:
        channels = data.shape[1]
        new_data = np.zeros((num_samples, channels), dtype=np.float32)
        for c in range(channels):
            new_data[:, c] = np.interp(x_target, x_orig, data[:, c])
        return new_data
    else:
        return np.interp(x_target, x_orig, data).astype(np.float32)


class AudioStreamThread:
    def __init__(self, filepath, device_id, volume=1.0, delay_seconds=0.0, is_vocals=False, player=None):
        self.filepath = filepath
        self.device_id = device_id
        self.volume = volume
        self.delay_seconds = delay_seconds
        self.is_vocals = is_vocals
        self.player = player
        
        self.is_paused = True
        self.is_finished = False
        self.is_ready = False
        
        self.samplerate = 44100
        self.total_frames = 0
        self.channels = 2
        self.current_frame = 0
        self.stream = None
        self.audio_data = None
        
        self.seek_target_frame = None
        self.silent_frames_remaining = 0

    def load(self):
        try:
            with sf.SoundFile(self.filepath) as f:
                self.samplerate = f.samplerate
                self.total_frames = len(f)
                self.channels = f.channels
                self.audio_data = f.read(dtype='float32')
        except Exception as e:
            print(f"Error loading audio file: {e}")
            self.is_finished = True
            return

        with open_target(self.device_id) as pa_device:
            # Query device info to get native default sample rate
            try:
                if pa_device is None:
                    device_info = sd.query_devices(kind='output')
                else:
                    device_info = sd.query_devices(pa_device, 'output')
                target_samplerate = int(device_info.get('default_samplerate', 44100))
            except Exception:
                target_samplerate = self.samplerate

        # Resampling is CPU-bound and doesn't need PIPEWIRE_NODE set, so it
        # runs outside open_target to keep that critical section short.
        if self.samplerate != target_samplerate:
            print(f"Resampling audio stream from {self.samplerate}Hz to {target_samplerate}Hz")
            self.audio_data = resample_audio(self.audio_data, self.samplerate, target_samplerate)
            self.samplerate = target_samplerate
            self.total_frames = len(self.audio_data)

        self.silent_frames_remaining = int(self.delay_seconds * self.samplerate)

    def start_stream(self):
        if self.is_finished:
            return
        with open_target(self.device_id) as pa_device:
            self.stream = sd.OutputStream(
                samplerate=self.samplerate,
                blocksize=BLOCKSIZE,
                device=pa_device,
                channels=self.channels,
                dtype='float32',
                callback=self.callback
            )
        self.stream.start()
        self.is_ready = True

    def is_alive(self):
        return self.is_ready and not self.is_finished

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def finish(self):
        self.is_finished = True
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass

    def join(self, timeout=None):
        pass

    def callback(self, outdata, frames, time_info, status):
        if self.is_finished:
            outdata.fill(0)
            return

        if self.seek_target_frame is not None:
            self.current_frame = self.seek_target_frame
            self.silent_frames_remaining = int(self.delay_seconds * self.samplerate)
            self.seek_target_frame = None

        if self.is_paused:
            outdata.fill(0)
            return

        if getattr(self, "silent_frames_remaining", 0) > 0:
            silence_len = min(frames, self.silent_frames_remaining)
            outdata[:silence_len].fill(0)
            self.silent_frames_remaining -= silence_len
            
            if silence_len < frames:
                read_len = frames - silence_len
                end_idx = min(self.total_frames, self.current_frame + read_len)
                data = self.audio_data[self.current_frame:end_idx]
                outdata[silence_len:silence_len+len(data)] = data * self.volume
                self.current_frame = end_idx
                if len(data) < read_len:
                    outdata[silence_len+len(data):].fill(0)
                    self.is_finished = True
        else:
            end_idx = min(self.total_frames, self.current_frame + frames)
            data = self.audio_data[self.current_frame:end_idx]
            outdata[:len(data)] = data * self.volume
            self.current_frame = end_idx
            if len(data) < frames:
                outdata[len(data):].fill(0)
                self.is_finished = True


class SplitChannelStreamThread:
    """Single stereo stream for setups with only one output device: vocals
    go to the left channel, instrumental to the right channel, so a stereo
    splitter cable (or panning) can still separate singer/audience feeds.

    Exposes the same public surface as AudioStreamThread (load, start_stream,
    is_alive, pause/resume/finish, seek_target_frame, current_frame,
    total_frames, samplerate, is_ready) so KaraokePlayer can slot it in as
    thread2 without special-casing most of its control flow. is_split_stream
    marks the instances that need the volume/delay special-casing it does need.
    """

    def __init__(self, vocals_path, instrumental_path, device_id, singer_volume=1.0, audience_volume=1.0,
                 vocals_delay_seconds=0.0, instrumental_delay_seconds=0.0, player=None):
        self.vocals_path = vocals_path
        self.instrumental_path = instrumental_path
        self.device_id = device_id
        self.singer_volume = singer_volume
        self.audience_volume = audience_volume
        self.vocals_delay_seconds = vocals_delay_seconds
        self.instrumental_delay_seconds = instrumental_delay_seconds
        self.player = player
        self.is_split_stream = True

        self.is_paused = True
        self.is_finished = False
        self.is_ready = False

        self.samplerate = 44100
        # total_frames/current_frame track the instrumental (audience) side,
        # matching how KaraokePlayer already reads thread2 for position/duration.
        self.total_frames = 0
        self.current_frame = 0
        self.vocals_data = None
        self.instrumental_data = None
        self.stream = None

        self.seek_target_frame = None
        self._vocals_frame = 0
        self._vocals_silent_remaining = 0
        self._instrumental_silent_remaining = 0

    @staticmethod
    def _load_mono(filepath):
        with sf.SoundFile(filepath) as f:
            samplerate = f.samplerate
            data = f.read(dtype='float32')
        if data.ndim > 1:
            data = data.mean(axis=1).astype(np.float32)
        return data, samplerate

    def load(self):
        try:
            vocals_data, vocals_sr = self._load_mono(self.vocals_path)
            instrumental_data, instrumental_sr = self._load_mono(self.instrumental_path)
        except Exception as e:
            print(f"Error loading audio file: {e}")
            self.is_finished = True
            return

        with open_target(self.device_id) as pa_device:
            try:
                if pa_device is None:
                    device_info = sd.query_devices(kind='output')
                else:
                    device_info = sd.query_devices(pa_device, 'output')
                target_samplerate = int(device_info.get('default_samplerate', 44100))
            except Exception:
                target_samplerate = vocals_sr

        if vocals_sr != target_samplerate:
            vocals_data = resample_audio(vocals_data, vocals_sr, target_samplerate)
        if instrumental_sr != target_samplerate:
            instrumental_data = resample_audio(instrumental_data, instrumental_sr, target_samplerate)
        self.samplerate = target_samplerate

        length = max(len(vocals_data), len(instrumental_data))
        if len(vocals_data) < length:
            vocals_data = np.pad(vocals_data, (0, length - len(vocals_data)))
        if len(instrumental_data) < length:
            instrumental_data = np.pad(instrumental_data, (0, length - len(instrumental_data)))

        self.vocals_data = vocals_data
        self.instrumental_data = instrumental_data
        self.total_frames = length

        self._vocals_silent_remaining = int(self.vocals_delay_seconds * self.samplerate)
        self._instrumental_silent_remaining = int(self.instrumental_delay_seconds * self.samplerate)

    def start_stream(self):
        if self.is_finished:
            return
        with open_target(self.device_id) as pa_device:
            self.stream = sd.OutputStream(
                samplerate=self.samplerate,
                blocksize=BLOCKSIZE,
                device=pa_device,
                channels=2,
                dtype='float32',
                callback=self.callback
            )
        self.stream.start()
        self.is_ready = True

    def is_alive(self):
        return self.is_ready and not self.is_finished

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def finish(self):
        self.is_finished = True
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass

    def join(self, timeout=None):
        pass

    @staticmethod
    def _read_channel(data, frame_pos, frames, silent_remaining, volume):
        out = np.zeros(frames, dtype=np.float32)
        exhausted = False

        if silent_remaining > 0:
            silence_len = min(frames, silent_remaining)
            silent_remaining -= silence_len
            if silence_len < frames:
                read_len = frames - silence_len
                end_idx = min(len(data), frame_pos + read_len)
                chunk = data[frame_pos:end_idx]
                out[silence_len:silence_len + len(chunk)] = chunk * volume
                frame_pos = end_idx
                exhausted = len(chunk) < read_len
        else:
            end_idx = min(len(data), frame_pos + frames)
            chunk = data[frame_pos:end_idx]
            out[:len(chunk)] = chunk * volume
            frame_pos = end_idx
            exhausted = len(chunk) < frames

        return out, frame_pos, silent_remaining, exhausted

    def callback(self, outdata, frames, time_info, status):
        if self.is_finished:
            outdata.fill(0)
            return

        if self.seek_target_frame is not None:
            self.current_frame = self.seek_target_frame
            self._vocals_frame = self.seek_target_frame
            self._vocals_silent_remaining = int(self.vocals_delay_seconds * self.samplerate)
            self._instrumental_silent_remaining = int(self.instrumental_delay_seconds * self.samplerate)
            self.seek_target_frame = None

        if self.is_paused:
            outdata.fill(0)
            return

        left, self._vocals_frame, self._vocals_silent_remaining, vocals_done = self._read_channel(
            self.vocals_data, self._vocals_frame, frames, self._vocals_silent_remaining, self.singer_volume
        )
        right, self.current_frame, self._instrumental_silent_remaining, instrumental_done = self._read_channel(
            self.instrumental_data, self.current_frame, frames, self._instrumental_silent_remaining, self.audience_volume
        )

        outdata[:, 0] = left
        outdata[:, 1] = right

        if vocals_done and instrumental_done:
            self.is_finished = True


class CalibrationStreamCallback:
    def __init__(self, player, is_singer, channels):
        self.player = player
        self.is_singer = is_singer
        self.channels = channels
        self.sample_idx = 0
        self.frequencies = [261.63, 329.63, 392.00, 523.25]
        self.duration_samples = 4410
        self.cycle_samples = 44100

    def callback(self, outdata, frames, time_info, status):
        t = np.arange(self.sample_idx, self.sample_idx + frames)
        self.sample_idx += frames

        shift = 0
        delay = int(round(getattr(self.player, "vocals_delay", 0.0) * 44100))
        if not self.is_singer and delay > 0:
            shift = delay
        elif self.is_singer and delay < 0:
            shift = -delay

        t_shifted = t - shift

        cycle_pos = t_shifted % self.cycle_samples
        cycle_idx = t_shifted // self.cycle_samples
        freq_idx = (cycle_idx % len(self.frequencies)).astype(int)
        freqs = np.array(self.frequencies)[freq_idx]

        time_in_cycle = cycle_pos / 44100.0
        tone_base = 0.3 * np.sin(2 * np.pi * freqs * time_in_cycle)

        fade_len = int(44100 * 0.005)
        envelope = np.ones_like(cycle_pos, dtype=np.float32)

        fade_in_mask = cycle_pos < fade_len
        envelope[fade_in_mask] = cycle_pos[fade_in_mask] / fade_len

        fade_out_mask = (cycle_pos >= (self.duration_samples - fade_len)) & (cycle_pos < self.duration_samples)
        envelope[fade_out_mask] = (self.duration_samples - cycle_pos[fade_out_mask]) / fade_len

        envelope[cycle_pos >= self.duration_samples] = 0.0
        envelope[t_shifted < 0] = 0.0

        out = (tone_base * envelope).astype(np.float32)

        if self.channels == 2:
            outdata[:] = np.column_stack([out, out])
        else:
            outdata[:] = out.reshape(-1, 1)


class KaraokePlayer:
    def __init__(self):
        self.thread1 = None  # Vocals / Singer
        self.thread2 = None  # Instrumental / Audience
        self.singer_device = None
        self.audience_device = None
        self.is_playing = False
        self.is_starting = False
        self.is_paused = False
        self.current_song_id = None
        self.start_time = 0
        self.pause_duration = 0
        self.pause_start_time = 0
        self.singer_volume = 1.0
        self.audience_volume = 1.0
        self.vocals_delay = 0.0
        self.calibration_active = False
        self.calibration_streams = []

        # Try to read system Master volume to initialize. Skipped under
        # PipeWire: the hardware Master sits below the sound server there and
        # would scale both outputs at once, defeating the singer/audience split.
        if not pipewire_available():
            try:
                import subprocess
                import re
                res = subprocess.run(["amixer", "-c", "0", "sget", "Master"], capture_output=True, text=True)
                if res.returncode == 0:
                    match = re.search(r'\[(\d+)%\]', res.stdout)
                    if match:
                        self.audience_volume = float(match.group(1)) / 100.0
            except Exception:
                pass

    def start_song(self, song_path, karaoke_path, singer_device, audience_device, stereo_split=False):
        if getattr(self, "calibration_active", False):
            self.stop_calibration()

        self.stop_song()

        # Set before any stream is opened so devices.py's idle check (which
        # reads is_playing/is_starting to decide whether it's safe to
        # terminate/reinitialize PortAudio) never sees a false "idle" window
        # while these streams are being opened.
        self.is_starting = True

        self.singer_device = singer_device
        self.audience_device = audience_device

        single_device_mode = singer_device == audience_device
        
        vocals_delay = getattr(self, "vocals_delay", 0.0)
        t1_delay = -vocals_delay if vocals_delay < 0 else 0.0
        t2_delay = vocals_delay if vocals_delay > 0 else 0.0

        self.start_time_dac = 0.0
        self.pause_duration_dac = 0.0
        self.pause_start_time_dac = 0.0
        self.start_time_system = 0.0
        self.pause_duration_system = 0.0
        self.pause_start_time_system = 0.0
        self.seek_time = 0.0

        if single_device_mode:
            self.thread1 = None
            if stereo_split and song_path and karaoke_path:
                # One output, opted into the L/R split: vocals on the left
                # channel, instrumental on the right, so a stereo splitter
                # cable (or panning) can still separate singer/audience.
                self.thread2 = SplitChannelStreamThread(
                    vocals_path=song_path,
                    instrumental_path=karaoke_path,
                    device_id=audience_device,
                    singer_volume=self.singer_volume,
                    audience_volume=self.audience_volume,
                    vocals_delay_seconds=t1_delay,
                    instrumental_delay_seconds=t2_delay,
                    player=self
                )
            else:
                # One output: skip vocals to avoid mixing both stems into the
                # same device. Fall back to the full mix when stems aren't ready yet.
                play_path = karaoke_path or song_path
                self.thread2 = AudioStreamThread(play_path, audience_device, volume=self.audience_volume, delay_seconds=t2_delay, is_vocals=False, player=self) if play_path else None
        else:
            self.thread1 = AudioStreamThread(song_path, singer_device, volume=self.singer_volume, delay_seconds=t1_delay, is_vocals=True, player=self) if song_path else None
            self.thread2 = AudioStreamThread(karaoke_path, audience_device, volume=self.audience_volume, delay_seconds=t2_delay, is_vocals=False, player=self) if karaoke_path else None

        try:
            if self.thread1:
                self.thread1.load()
            if self.thread2:
                self.thread2.load()

            if self.thread1:
                self.thread1.start_stream()
            if self.thread2:
                self.thread2.start_stream()
                
            # Both streams are loaded and running their callbacks, but are paused (outputting silence).
            # Unpause them simultaneously to guarantee perfect microsecond sync.
            if self.thread1:
                self.thread1.resume()
            if self.thread2:
                self.thread2.resume()
        except Exception:
            self.stop_song()
            raise

        self.is_playing = True
        self.is_paused = False
        self.is_starting = False

    def pause_song(self):
        if not self.is_playing or self.is_paused:
            return
        if self.thread1:
            self.thread1.pause()
        if self.thread2:
            self.thread2.pause()
        self.is_paused = True
        self.pause_start_time_dac = sd.get_time()
        self.pause_start_time_system = time.perf_counter()

    def resume_song(self):
        if not self.is_playing or not self.is_paused:
            return
        if self.thread1:
            self.thread1.resume()
        if self.thread2:
            self.thread2.resume()
        self.is_paused = False
        self.pause_duration_dac += sd.get_time() - self.pause_start_time_dac
        self.pause_duration_system += time.perf_counter() - self.pause_start_time_system

    def stop_song(self):
        if getattr(self, "calibration_active", False):
            self.stop_calibration()

        if self.thread1:
            self.thread1.finish()
            self.thread1 = None
        if self.thread2:
            self.thread2.finish()
            self.thread2 = None
        self.is_playing = False
        self.is_starting = False
        self.is_paused = False
        self.current_song_id = None
        self.start_time_dac = 0.0
        self.pause_duration_dac = 0.0
        self.start_time_system = 0.0
        self.pause_duration_system = 0.0
        self.seek_time = 0.0

    def set_volumes(self, singer_volume, audience_volume):
        self.singer_volume = max(0.0, min(1.0, float(singer_volume)))
        self.audience_volume = max(0.0, min(1.0, float(audience_volume)))
        if self.thread1:
            self.thread1.volume = self.singer_volume
        if self.thread2:
            if getattr(self.thread2, "is_split_stream", False):
                self.thread2.singer_volume = self.singer_volume
                self.thread2.audience_volume = self.audience_volume
            else:
                self.thread2.volume = self.audience_volume

        # Sync with system Master volume (hardware mixer affects all outputs,
        # so only do this when a sound server is not in charge of routing)
        if not pipewire_available():
            try:
                import subprocess
                subprocess.run(["amixer", "-c", "0", "sset", "Master", f"{int(self.audience_volume * 100)}%"], capture_output=True)
            except Exception:
                pass

    def seek(self, position_seconds):
        if not self.is_playing:
            return

        vocals_delay = getattr(self, "vocals_delay", 0.0)
        t1_delay = -vocals_delay if vocals_delay < 0 else 0.0
        t2_delay = vocals_delay if vocals_delay > 0 else 0.0

        # Clear DAC reference values on seek
        self.seek_time = position_seconds
        self.start_time_dac = 0.0
        self.pause_duration_dac = 0.0
        self.start_time_system = 0.0
        self.pause_duration_system = 0.0

        if self.thread1 and self.thread1.is_alive():
            self.thread1.delay_seconds = t1_delay
            target_frame = int(position_seconds * self.thread1.samplerate)
            target_frame = max(0, min(target_frame, self.thread1.total_frames))
            self.thread1.seek_target_frame = target_frame

        if self.thread2 and self.thread2.is_alive():
            if getattr(self.thread2, "is_split_stream", False):
                self.thread2.vocals_delay_seconds = t1_delay
                self.thread2.instrumental_delay_seconds = t2_delay
            else:
                self.thread2.delay_seconds = t2_delay
            target_frame = int(position_seconds * self.thread2.samplerate)
            target_frame = max(0, min(target_frame, self.thread2.total_frames))
            self.thread2.seek_target_frame = target_frame

    def get_current_time(self):
        if not self.is_playing:
            return 0.0

        # Calculate time based on frames played in instrumental thread (audience)
        if self.thread2 and self.thread2.is_ready:
            return self.thread2.current_frame / self.thread2.samplerate
        # Fallback to vocals thread
        if self.thread1 and self.thread1.is_ready:
            return self.thread1.current_frame / self.thread1.samplerate
        return self.seek_time

    def get_status(self):
        if self.is_playing:
            t1_active = self.thread1 and self.thread1.is_alive()
            t2_active = self.thread2 and self.thread2.is_alive()
            if not t1_active and not t2_active:
                self.is_playing = False
                self.current_song_id = None

        duration = 0.0
        if self.thread2 and self.thread2.is_ready:
            duration = self.thread2.total_frames / self.thread2.samplerate
        elif self.thread1 and self.thread1.is_ready:
            duration = self.thread1.total_frames / self.thread1.samplerate

        return {
            "is_playing": self.is_playing,
            "is_paused": self.is_paused,
            "current_time": self.get_current_time(),
            "song_id": self.current_song_id,
            "duration": duration,
            "singer_volume": self.singer_volume,
            "audience_volume": self.audience_volume,
            "vocals_delay": getattr(self, "vocals_delay", 0.0)
        }

    def start_calibration(self, singer_device, audience_device):
        self.stop_song()
        self.stop_calibration()

        samplerate = 44100
        self.calibration_active = True
        self.calibration_streams = []

        with open_target(singer_device) as pa_singer, open_target(audience_device) as pa_audience:
            try:
                singer_channels = 2
                audience_channels = 2
                if isinstance(pa_singer, int):
                    info = sd.query_devices(pa_singer)
                    singer_channels = min(2, info.get('max_output_channels', 2))
                if isinstance(pa_audience, int):
                    info = sd.query_devices(pa_audience)
                    audience_channels = min(2, info.get('max_output_channels', 2))

                single_device = pa_singer == pa_audience

                if single_device:
                    cb_audience = CalibrationStreamCallback(self, is_singer=False, channels=audience_channels)
                    stream_audience = sd.OutputStream(
                        device=pa_audience,
                        samplerate=samplerate,
                        channels=audience_channels,
                        dtype='float32',
                        callback=cb_audience.callback
                    )
                    stream_audience.start()
                    self.calibration_streams.append(stream_audience)
                else:
                    cb_singer = CalibrationStreamCallback(self, is_singer=True, channels=singer_channels)
                    stream_singer = sd.OutputStream(
                        device=pa_singer,
                        samplerate=samplerate,
                        channels=singer_channels,
                        dtype='float32',
                        callback=cb_singer.callback
                    )
                    
                    cb_audience = CalibrationStreamCallback(self, is_singer=False, channels=audience_channels)
                    stream_audience = sd.OutputStream(
                        device=pa_audience,
                        samplerate=samplerate,
                        channels=audience_channels,
                        dtype='float32',
                        callback=cb_audience.callback
                    )
                    
                    stream_singer.start()
                    stream_audience.start()
                    self.calibration_streams.append(stream_singer)
                    self.calibration_streams.append(stream_audience)
            except Exception as e:
                import traceback
                try:
                    with open("backend_error.log", "w") as f:
                        f.write(f"Error starting calibration streams: {e}\n")
                        traceback.print_exc(file=f)
                except Exception:
                    pass
                print(f"Error starting calibration streams: {e}")
                self.calibration_active = False
                raise

    def stop_calibration(self):
        self.calibration_active = False
        if getattr(self, "calibration_streams", None):
            for stream in self.calibration_streams:
                try:
                    stream.stop()
                    stream.close()
                except Exception:
                    pass
            self.calibration_streams = []
        sd.stop()


# Global player instance
player = KaraokePlayer()
