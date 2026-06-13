import queue
import threading
import time

import numpy as np
import sounddevice as sd
import soundfile as sf

from ..config import BLOCKSIZE, BUFFERSIZE
from .devices import open_target, pipewire_available


class AudioStreamThread(threading.Thread):
    def __init__(self, filepath, device_id, volume=1.0):
        super().__init__()
        self.filepath = filepath
        self.device_id = device_id
        self.volume = volume
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

                # Pre-fill queue
                for _ in range(BUFFERSIZE):
                    data = f.read(BLOCKSIZE)
                    if not len(data):
                        break
                    self.q.put_nowait(data)

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
        self.stop_song()

        self.singer_device = singer_device
        self.audience_device = audience_device

        self.thread1 = AudioStreamThread(song_path, singer_device, volume=self.singer_volume) if song_path else None
        self.thread2 = AudioStreamThread(karaoke_path, audience_device, volume=self.audience_volume) if karaoke_path else None

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

        if self.thread1 and self.thread1.is_alive():
            target_frame = int(position_seconds * self.thread1.samplerate)
            target_frame = max(0, min(target_frame, self.thread1.total_frames))
            self.thread1.seek_target_frame = target_frame

        if self.thread2 and self.thread2.is_alive():
            target_frame = int(position_seconds * self.thread2.samplerate)
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
            "audience_volume": self.audience_volume
        }


# Global player instance
player = KaraokePlayer()
