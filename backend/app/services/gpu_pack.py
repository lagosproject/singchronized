import os
import shutil
import subprocess
import sys
import threading
from typing import Optional

from ..config import DATA_DIR, IS_FROZEN
from ..ws import manager

GPU_VENV_DIR = os.path.join(DATA_DIR, "gpu-venv")
# Pinned to an exact patch version, not just "3.12": `uv venv --python 3.12`
# resolves through a minor-version symlink that can come up broken on some
# Windows installs (observed during testing), while requesting the exact
# patch version uv already downloaded works reliably.
_PYTHON_VERSION = "3.12.13"
_TORCH_INDEX_URL = "https://download.pytorch.org/whl/cu128"

_install_lock = threading.Lock()


def _resource_root() -> Optional[str]:
    """Directory holding the bundled `uv/` and `backend-src/` resources, sitting
    next to the packaged CPU sidecar's `backend/` folder (see tauri.conf.json).
    None outside a packaged build — `sys.executable` only points at the real
    installed exe location when frozen; `__file__`-derived paths do not
    (PyInstaller resolves them inside the frozen bundle's temp extraction dir).
    """
    if not IS_FROZEN:
        return None
    return os.path.dirname(os.path.dirname(sys.executable))


def _uv_path() -> Optional[str]:
    root = _resource_root()
    if not root:
        return None
    name = "uv.exe" if sys.platform == "win32" else "uv"
    path = os.path.join(root, "uv", name)
    return path if os.path.exists(path) else None


def backend_src_dir() -> Optional[str]:
    root = _resource_root()
    if not root:
        return None
    path = os.path.join(root, "backend-src")
    return path if os.path.isdir(path) else None


def _venv_python_path() -> str:
    if sys.platform == "win32":
        return os.path.join(GPU_VENV_DIR, "Scripts", "python.exe")
    return os.path.join(GPU_VENV_DIR, "bin", "python")


def installed_python_path() -> Optional[str]:
    path = _venv_python_path()
    return path if os.path.exists(path) else None


def is_installed() -> bool:
    return installed_python_path() is not None


def _run(uv_path: str, args: list) -> None:
    result = subprocess.run(
        [uv_path, *args],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"`uv {' '.join(args)}` failed (exit {result.returncode}):\n{result.stderr}"
        )


def install(progress_callback=None):
    """Provision a CUDA-enabled Python venv via the bundled `uv` binary.

    `progress_callback(stage, percent, error=None)` is called with stage in
    provisioning-python/installing-torch/installing-dependencies/completed/failed.
    """
    if not _install_lock.acquire(blocking=False):
        raise RuntimeError("A GPU pack install is already in progress")

    def _report(stage, percent=0, error=None):
        if progress_callback:
            progress_callback(stage, percent, error)

    try:
        uv_path = _uv_path()
        src_dir = backend_src_dir()
        if not uv_path or not src_dir:
            raise RuntimeError(
                "GPU pack install requires a packaged build (uv/backend-src resources not found)"
            )

        _report("provisioning-python", 0)
        if os.path.isdir(GPU_VENV_DIR):
            shutil.rmtree(GPU_VENV_DIR)
        os.makedirs(os.path.dirname(GPU_VENV_DIR), exist_ok=True)
        _run(uv_path, ["venv", GPU_VENV_DIR, "--python", _PYTHON_VERSION])

        venv_python = _venv_python_path()

        _report("installing-torch", 0)
        _run(
            uv_path,
            [
                "pip",
                "install",
                "--python",
                venv_python,
                "torch",
                "torchaudio",
                "--index-url",
                _TORCH_INDEX_URL,
            ],
        )

        _report("installing-dependencies", 0)
        requirements_path = os.path.join(src_dir, "backend", "requirements.txt")
        _run(
            uv_path,
            ["pip", "install", "--python", venv_python, "-r", requirements_path],
        )

        _report("completed", 100)
    except Exception as e:
        _report("failed", 0, str(e))
        shutil.rmtree(GPU_VENV_DIR, ignore_errors=True)
        raise
    finally:
        _install_lock.release()


def uninstall():
    shutil.rmtree(GPU_VENV_DIR, ignore_errors=True)


def run_install_async():
    """Fire-and-forget install, broadcasting progress over the websocket."""

    def _progress(stage, percent, error=None):
        message = {
            "type": "gpu_pack_status",
            "data": {"stage": stage, "percent": percent},
        }
        if error:
            message["data"]["error"] = error
        manager.broadcast_threadsafe(message)

    def _run():
        try:
            install(_progress)
        except Exception as e:
            print(f"GPU pack install failed: {e}")

    threading.Thread(target=_run, daemon=True).start()
