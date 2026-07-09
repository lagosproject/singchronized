import hashlib
import json
import os
import shutil
import sys
import tempfile
import threading
import urllib.error
import urllib.request
import zipfile
from typing import Optional

from ..config import DATA_DIR
from ..ws import manager

GITHUB_REPO = "lagosproject/singchronized"
GPU_PACK_DIR = os.path.join(DATA_DIR, "gpu-backend")
_BACKEND_FOLDER_NAME = "singchronized-backend"
_USER_AGENT = "SingChronized-App"

_install_lock = threading.Lock()


def _asset_suffix() -> str:
    return "windows-x64" if sys.platform == "win32" else "linux-x64"


def _exe_name() -> str:
    return "singchronized-backend.exe" if sys.platform == "win32" else "singchronized-backend"


def installed_exe_path() -> Optional[str]:
    path = os.path.join(GPU_PACK_DIR, _exe_name())
    return path if os.path.exists(path) else None


def is_installed() -> bool:
    return installed_exe_path() is not None


def _asset_urls(asset_name: str) -> tuple:
    """Resolve (zip_url, sha256_url) for the current platform's GPU pack asset.

    `SINGCHRONIZED_GPU_PACK_URL_BASE` lets local testing / CI dry-runs point at
    a plain file server instead of a real GitHub release.
    """
    override_base = os.environ.get("SINGCHRONIZED_GPU_PACK_URL_BASE")
    if override_base:
        zip_url = f"{override_base.rstrip('/')}/{asset_name}"
        return zip_url, f"{zip_url}.sha256"

    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
    req = urllib.request.Request(api_url, headers={"User-Agent": _USER_AGENT, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        release = json.loads(resp.read())

    assets = {a["name"]: a["browser_download_url"] for a in release.get("assets", [])}
    sha_name = f"{asset_name}.sha256"
    if asset_name not in assets or sha_name not in assets:
        raise FileNotFoundError(f"GPU pack asset '{asset_name}' not found in latest release '{release.get('tag_name')}'")
    return assets[asset_name], assets[sha_name]


def _fetch_expected_hash(sha256_url: str) -> str:
    req = urllib.request.Request(sha256_url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8").strip().split()[0]


def _download_zip(zip_url: str, dest_path: str, progress_callback=None) -> str:
    """Stream the GPU pack zip to disk, returning its sha256 hex digest."""
    req = urllib.request.Request(zip_url, headers={"User-Agent": _USER_AGENT})
    hasher = hashlib.sha256()
    with urllib.request.urlopen(req, timeout=60) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        downloaded = 0
        with open(dest_path, "wb") as f:
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                hasher.update(chunk)
                downloaded += len(chunk)
                if progress_callback and total:
                    progress_callback("downloading", int(downloaded / total * 100))
    return hasher.hexdigest()


def download_and_install(progress_callback=None):
    """Download, verify, and install the CUDA-enabled GPU pack for this platform.

    `progress_callback(stage, percent)` is called with stage in
    downloading/verifying/extracting/completed/failed.
    """
    if not _install_lock.acquire(blocking=False):
        raise RuntimeError("A GPU pack install is already in progress")

    asset_name = f"singchronized-backend-gpu-{_asset_suffix()}.zip"
    tmp_dir = tempfile.mkdtemp(prefix="singchronized-gpu-pack-")
    zip_path = os.path.join(tmp_dir, asset_name)
    extract_dir = os.path.join(tmp_dir, "extracted")

    try:
        if progress_callback:
            progress_callback("downloading", 0)

        zip_url, sha256_url = _asset_urls(asset_name)
        expected_hash = _fetch_expected_hash(sha256_url)
        actual_hash = _download_zip(zip_url, zip_path, progress_callback)

        if progress_callback:
            progress_callback("verifying", 100)
        if actual_hash.lower() != expected_hash.lower():
            raise ValueError(f"GPU pack checksum mismatch: expected {expected_hash}, got {actual_hash}")

        if progress_callback:
            progress_callback("extracting", 0)
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)

        extracted_backend = os.path.join(extract_dir, _BACKEND_FOLDER_NAME)
        if not os.path.isdir(extracted_backend):
            raise FileNotFoundError(f"GPU pack zip did not contain a '{_BACKEND_FOLDER_NAME}' folder")

        os.makedirs(os.path.dirname(GPU_PACK_DIR), exist_ok=True)
        if os.path.isdir(GPU_PACK_DIR):
            shutil.rmtree(GPU_PACK_DIR)
        shutil.move(extracted_backend, GPU_PACK_DIR)

        if progress_callback:
            progress_callback("completed", 100)
    except Exception as e:
        if progress_callback:
            progress_callback("failed", 0, str(e))
        raise
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        _install_lock.release()


def uninstall():
    shutil.rmtree(GPU_PACK_DIR, ignore_errors=True)


def run_install_async():
    """Fire-and-forget install, broadcasting progress over the websocket."""
    def _progress(stage, percent, error=None):
        message = {"type": "gpu_pack_status", "data": {"stage": stage, "percent": percent}}
        if error:
            message["data"]["error"] = error
        manager.broadcast_threadsafe(message)

    def _run():
        try:
            download_and_install(_progress)
        except Exception as e:
            print(f"GPU pack install failed: {e}")

    threading.Thread(target=_run, daemon=True).start()
