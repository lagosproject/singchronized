import json
import os
import shutil
import subprocess
import threading
import time
from contextlib import contextmanager

import numpy as np
import sounddevice as sd

# Device ids can be either a PortAudio integer index (Windows/macOS/plain ALSA)
# or a string "pw:<node.name>" referring to a PipeWire sink. PipeWire sinks are
# the only reliable way to address individual outputs on modern Linux: the
# sound server holds the ALSA hardware exclusively, so PortAudio cannot open
# hw devices directly and its "default"/"pipewire" devices all land on the
# default sink unless we route each stream explicitly.

PW_PREFIX = "pw:"

# The PipeWire ALSA plugin reads PIPEWIRE_NODE from the environment when the
# PCM is opened, so stream creation must be serialized while the variable is set.
_route_lock = threading.Lock()


_last_test_tone_time = 0.0
_pipewire_available = None


def pipewire_available():
    global _pipewire_available
    if _pipewire_available is None:
        _pipewire_available = shutil.which("pw-dump") is not None and len(get_pipewire_sinks()) > 0
    return _pipewire_available


def get_pipewire_sinks():
    try:
        res = subprocess.run(["pw-dump"], capture_output=True, text=True, timeout=5)
        if res.returncode != 0:
            return []
        dump = json.loads(res.stdout)
    except Exception:
        return []

    sinks = []
    for obj in dump:
        if not str(obj.get("type", "")).endswith("Node"):
            continue
        props = (obj.get("info") or {}).get("props") or {}
        if props.get("media.class") != "Audio/Sink":
            continue
        node_name = props.get("node.name")
        if not node_name:
            continue
        sinks.append({
            "node_name": node_name,
            "description": props.get("node.description") or node_name,
        })
    return sinks


def _portaudio_pipewire_device():
    # PortAudio device that hands the stream to PipeWire for routing
    for idx, device in enumerate(sd.query_devices()):
        if device["name"] == "pipewire" and device["max_output_channels"] > 0:
            return idx
    return None  # sounddevice falls back to the system default


@contextmanager
def open_target(device_id):
    """Resolve a device id into the PortAudio device to open.

    For "pw:<node>" ids, sets PIPEWIRE_NODE while the caller opens its stream
    so the PipeWire ALSA plugin connects it to that sink. The caller MUST
    create its stream inside this context.
    """
    if isinstance(device_id, str) and device_id.startswith(PW_PREFIX):
        node_name = device_id[len(PW_PREFIX):]
        with _route_lock:
            previous = os.environ.get("PIPEWIRE_NODE")
            os.environ["PIPEWIRE_NODE"] = node_name
            try:
                yield _portaudio_pipewire_device()
            finally:
                if previous is None:
                    os.environ.pop("PIPEWIRE_NODE", None)
                else:
                    os.environ["PIPEWIRE_NODE"] = previous
    else:
        if isinstance(device_id, str) and device_id.isdigit():
            device_id = int(device_id)
        yield device_id


def clean_device_name(name):
    if name == 'default':
        return 'System Default Device (Automatic Routing)'
    if name == 'pipewire':
        return 'PipeWire Sound Server (All Outputs)'
    if name == 'pulse':
        return 'PulseAudio Sound Server (All Outputs)'
    if name == 'sysdefault':
        return 'ALSA System Default'
    if name == 'dmix':
        return 'ALSA Direct Mixer (dmix)'
    if name == 'front':
        return 'Analog Front Speakers'
    if name.startswith('surround'):
        num_channels = name.replace('surround', '')
        if num_channels == '40':
            return '4.0 Surround Sound'
        if num_channels == '51':
            return '5.1 Surround Sound'
        if num_channels == '71':
            return '7.1 Surround Sound'
        return f'{num_channels} Surround Sound'
    if name == 'hdmi':
        return 'HDMI Audio Output (Generic)'

    import re
    match = re.match(r'^([^:]+):\s*([^(]+)\s*\((hw:\d+,\d+)\)$', name)
    if match:
        card, subdevice, hw = match.groups()
        card = card.strip()
        subdevice = subdevice.strip()

        if 'Intel' in card or 'PCH' in card:
            card_friendly = 'Built-in Audio'
        else:
            card_friendly = card

        if 'Analog' in subdevice:
            return f"{card_friendly} - Analog Output ({hw})"
        if 'HDMI' in subdevice or 'HDMI' in card:
            return f"{card_friendly} - HDMI Digital Output ({hw})"

        return f"{card_friendly} - {subdevice} ({hw})"

    return name


def get_devices():
    # On PipeWire systems, expose the server's sinks: each one is a real,
    # individually routable output (analog jack, HDMI, Bluetooth, USB, ...).
    sinks = get_pipewire_sinks() if shutil.which("pw-dump") else []
    if sinks:
        return [{
            "index": f"{PW_PREFIX}{sink['node_name']}",
            "name": sink["description"],
            "raw_name": sink["node_name"],
            "hostapi": "pipewire",
            "max_output_channels": 2,
        } for sink in sinks]

    # Re-initialize PortAudio to get an updated list of devices if idle.
    # The whole check-and-reinit sequence is serialized through _route_lock so
    # two concurrent requests can't both decide to terminate/reinitialize at
    # once, and is_starting/is_playing/calibration_active must all be false
    # so we never tear down PortAudio while a stream is being opened elsewhere.
    from .player import player
    with _route_lock:
        is_tone_playing = (time.time() - _last_test_tone_time) < 0.8
        if (not player.is_playing and not getattr(player, "is_starting", False)
                and not getattr(player, "calibration_active", False) and not is_tone_playing):
            try:
                sd._terminate()
                time.sleep(0.2)  # Give driver time to settle
                sd._initialize()
            except Exception as e:
                print(f"Error refreshing PortAudio devices: {e}")

        devices = sd.query_devices()

    result = []
    for idx, device in enumerate(devices):
        # We look for output devices
        if device['max_output_channels'] > 0:
            raw_name = device["name"]
            display_name = clean_device_name(raw_name)
            result.append({
                "index": idx,
                "name": display_name,
                "raw_name": raw_name,
                "hostapi": device["hostapi"],
                "max_output_channels": device["max_output_channels"]
            })
    return result


def play_test_tone(device_id):
    global _last_test_tone_time

    # Re-initialize PortAudio if idle to ensure we use the correct index.
    # Guarded by _route_lock (released before open_target, which acquires
    # the same lock for pw: routing) so this never races another caller's
    # terminate/reinit or a stream being opened elsewhere.
    from .player import player
    with _route_lock:
        now = time.time()
        is_tone_playing = (now - _last_test_tone_time) < 0.8
        _last_test_tone_time = now
        if (not player.is_playing and not getattr(player, "is_starting", False)
                and not getattr(player, "calibration_active", False) and not is_tone_playing):
            try:
                sd._terminate()
                time.sleep(0.2)  # Give driver time to settle
                sd._initialize()
            except Exception as e:
                print(f"Error refreshing PortAudio devices before test tone: {e}")

    try:
        with open_target(device_id) as pa_device:
            if isinstance(pa_device, int):
                device_info = sd.query_devices(pa_device)
                max_channels = device_info.get('max_output_channels', 2)
                samplerate = int(device_info.get('default_samplerate', 44100))
            else:
                max_channels = 2
                samplerate = 44100

            duration = 0.5
            frequency = 440.0
            t = np.linspace(0, duration, int(samplerate * duration), endpoint=False)
            tone = 0.5 * np.sin(2 * np.pi * frequency * t)
            tone = np.column_stack([tone, tone])
            if max_channels == 1:
                tone = tone[:, :1]

            # sd.play opens the stream before returning, while PIPEWIRE_NODE
            # is still set, so the tone reaches the selected sink
            sd.play(tone, samplerate=samplerate, device=pa_device)
    except Exception as e:
        print(f"Error playing test tone on device {device_id}: {e}")
        raise

