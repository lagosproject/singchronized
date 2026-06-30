import queue
import threading
import time

import numpy as np
import sounddevice as sd
import soundfile as sf

from ..config import BLOCKSIZE, BUFFERSIZE
from .devices import open_target, pipewire_available


class AudioStreamThread(threading.Thread):
    def __init__(self, filepath, device_id, volume=1.0, delay_seconds=0.0):
        super().__init__()
        self.filepath = filepath
        self.device_id = device_id
        self.volume = volume
        self.delay_seconds = delay_seconds
        self.is_paused = False
        self.is_finished = False
        self.is_ready = False
        self.q = queue.Queue(maxsize=BUFFERSIZE)
        self.event = threading.Event()
        self.current_frame = 0
        self.samplerate = 44100
        self.total_frames = 0
        self.stream = None
        self.seek_target_frame = None

    def callback(self, outdata, frames, time_info, status):
        if status.output_underflow:
            raise sd.CallbackAbort
        try:
            data = self.q.get_nowait()
        except queue.Empty:
            # Buffer underflow, fill with silence
            outdata.fill(0)
            return

        if len(data) < len(outdata):
            outdata[:len(data)] = data * self.volume
            outdata[len(data):].fill(0)
            raise sd.CallbackStop
        else:
            outdata[:] = data * self.volume
            if not self.is_paused:
                self.current_frame += frames

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def finish(self):
        self.is_finished = True
        self.event.set()

    def run(self):
        try:
            with sf.SoundFile(self.filepath) as f:
                self.samplerate = f.samplerate
                self.total_frames = len(f)
                channels = f.channels

                # Pre-fill queue with silence blocks first
                delay_blocks = int(round(self.delay_seconds * self.samplerate / BLOCKSIZE))
                silence_to_prefill = min(delay_blocks, BUFFERSIZE)
                
                for _ in range(silence_to_prefill):
                    self.q.put_nowait(np.zeros((BLOCKSIZE, channels), dtype=np.float32))
                
                delay_blocks_remaining = delay_blocks - silence_to_prefill

                # Pre-fill the rest of the queue with actual audio data
                try:
                    for _ in range(BUFFERSIZE - silence_to_prefill):
                        data = f.read(BLOCKSIZE)
                        if not len(data):
                            break
                        self.q.put_nowait(data)
                except queue.Full:
                    pass

                with open_target(self.device_id) as pa_device:
                    self.stream = sd.OutputStream(
                        samplerate=self.samplerate,
                        blocksize=BLOCKSIZE,
                        device=pa_device,
                        channels=channels,
                        callback=self.callback,
                        finished_callback=self.event.set
                    )

                with self.stream:
                    timeout = BLOCKSIZE * BUFFERSIZE / self.samplerate
                    self.is_ready = True
                    while not self.is_finished:
                        if self.seek_target_frame is not None:
                            target = self.seek_target_frame
                            self.seek_target_frame = None

                            f.seek(target)
                            while not self.q.empty():
                                try:
                                    self.q.get_nowait()
                                except queue.Empty:
                                    break

                            # Reset delay blocks remaining on seek since seek offsets are handles individually
                            delay_blocks_remaining = 0
                            self.current_frame = target
                            if not self.is_paused:
                                for _ in range(BUFFERSIZE):
                                    data = f.read(BLOCKSIZE)
                                    if not len(data):
                                        break
                                    self.q.put(data, timeout=timeout)

                        if self.is_paused:
                            # Feed silence when paused
                            self.q.put(np.zeros((BLOCKSIZE, channels)), timeout=timeout)
                        elif delay_blocks_remaining > 0:
                            self.q.put(np.zeros((BLOCKSIZE, channels), dtype=np.float32), timeout=timeout)
                            delay_blocks_remaining -= 1
                        else:
                            data = f.read(BLOCKSIZE)
                            if not len(data):
                                break
                            self.q.put(data, timeout=timeout)
                    self.event.wait()
        except Exception as e:
            print(f"Error in audio thread: {e}")
        finally:
            self.is_finished = True
            self.is_ready = False


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

    def start_song(self, song_path, karaoke_path, singer_device, audience_device):
        if getattr(self, "calibration_active", False):
            self.stop_calibration()

        self.stop_song()

        self.singer_device = singer_device
        self.audience_device = audience_device

        single_device_mode = singer_device == audience_device
        
        vocals_delay = getattr(self, "vocals_delay", 0.0)
        t1_delay = -vocals_delay if vocals_delay < 0 else 0.0
        t2_delay = vocals_delay if vocals_delay > 0 else 0.0

        if single_device_mode:
            # One output: skip vocals to avoid mixing both stems into the same
            # device. Fall back to the full mix when stems aren't ready yet.
            play_path = karaoke_path or song_path
            self.thread1 = None
            self.thread2 = AudioStreamThread(play_path, audience_device, volume=self.audience_volume) if play_path else None
        else:
            self.thread1 = AudioStreamThread(song_path, singer_device, volume=self.singer_volume, delay_seconds=t1_delay) if song_path else None
            self.thread2 = AudioStreamThread(karaoke_path, audience_device, volume=self.audience_volume, delay_seconds=t2_delay) if karaoke_path else None

        if self.thread1:
            self.thread1.start()
        if self.thread2:
            self.thread2.start()

        self.is_playing = True
        self.is_paused = False
        self.start_time = time.time()
        self.pause_duration = 0

    def pause_song(self):
        if not self.is_playing or self.is_paused:
            return
        if self.thread1:
            self.thread1.pause()
        if self.thread2:
            self.thread2.pause()
        self.is_paused = True
        self.pause_start_time = time.time()

    def resume_song(self):
        if not self.is_playing or not self.is_paused:
            return
        if self.thread1:
            self.thread1.resume()
        if self.thread2:
            self.thread2.resume()
        self.is_paused = False
        self.pause_duration += time.time() - self.pause_start_time

    def stop_song(self):
        if getattr(self, "calibration_active", False):
            self.stop_calibration()

        if self.thread1:
            self.thread1.finish()
            self.thread1.join(timeout=1.0)
            self.thread1 = None
        if self.thread2:
            self.thread2.finish()
            self.thread2.join(timeout=1.0)
            self.thread2 = None
        self.is_playing = False
        self.is_paused = False
        self.current_song_id = None

    def set_volumes(self, singer_volume, audience_volume):
        self.singer_volume = max(0.0, min(1.0, float(singer_volume)))
        self.audience_volume = max(0.0, min(1.0, float(audience_volume)))
        if self.thread1:
            self.thread1.volume = self.singer_volume
        if self.thread2:
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

        if self.thread1 and self.thread1.is_alive():
            vocals_pos = position_seconds
            if vocals_delay > 0:
                vocals_pos = max(0.0, position_seconds - vocals_delay)
            target_frame = int(vocals_pos * self.thread1.samplerate)
            target_frame = max(0, min(target_frame, self.thread1.total_frames))
            self.thread1.seek_target_frame = target_frame

        if self.thread2 and self.thread2.is_alive():
            inst_pos = position_seconds
            if vocals_delay < 0:
                inst_pos = max(0.0, position_seconds + vocals_delay)
            target_frame = int(inst_pos * self.thread2.samplerate)
            target_frame = max(0, min(target_frame, self.thread2.total_frames))
            self.thread2.seek_target_frame = target_frame

        if self.is_paused:
            self.pause_start_time = time.time()
            self.start_time = self.pause_start_time - position_seconds
            self.pause_duration = 0
        else:
            self.start_time = time.time() - position_seconds
            self.pause_duration = 0

    def get_current_time(self):
        if not self.is_playing:
            return 0.0

        # Calculate time based on frames played in instrumental thread (audience)
        if self.thread2 and self.thread2.is_ready:
            return self.thread2.current_frame / self.thread2.samplerate
        # Fallback to vocals thread
        if self.thread1 and self.thread1.is_ready:
            return self.thread1.current_frame / self.thread1.samplerate

        # Fallback to system timer
        if self.is_paused:
            return self.pause_start_time - self.start_time - self.pause_duration
        return time.time() - self.start_time - self.pause_duration

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
