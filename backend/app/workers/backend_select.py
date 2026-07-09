import os
import sys

from ..config import IS_FROZEN, PROJECT_ROOT
from ..services import gpu_pack


def resolve_backend_command(subcommand: str) -> list:
    """Pick which backend executable should run `subcommand` ("demucs"/"transcribe"):
    the downloaded GPU pack if installed, else the bundled/dev CPU backend."""
    gpu_exe = gpu_pack.installed_exe_path()
    if gpu_exe:
        return [gpu_exe, subcommand]

    if IS_FROZEN:
        # Packaged build: re-invoke our own executable, whose entry point
        # dispatches subcommands to demucs.separate.main / transcribe_core
        # (see backend/server.py).
        return [sys.executable, subcommand]

    if subcommand == "demucs":
        # Dev mode: prefer the current interpreter's installed demucs CLI.
        try:
            import demucs  # noqa: F401
            return [sys.executable, "-m", "demucs"]
        except ImportError:
            pass

        if os.name == 'nt':
            venv_demucs = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "demucs.exe")
        else:
            venv_demucs = os.path.join(PROJECT_ROOT, ".venv", "bin", "demucs")

        if os.path.exists(venv_demucs):
            return [venv_demucs]

        return ["demucs"]  # fallback to system PATH

    # Dev mode transcribe: no standalone whisper CLI, so re-invoke server.py's
    # dispatch (same entry point the frozen build uses) via `-m` so its
    # `backend.app...` absolute imports resolve — running the script by path
    # doesn't put PROJECT_ROOT on sys.path and fails with ModuleNotFoundError.
    return [sys.executable, "-m", "backend.server", subcommand]
