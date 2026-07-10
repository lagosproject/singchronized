import subprocess

from fastapi import APIRouter

from ..services import gpu_pack

router = APIRouter(prefix="/system", tags=["system"])


def _detect_nvidia_gpu():
    """Hardware detection via nvidia-smi, independent of which torch build
    (if any) the currently-running backend process has loaded."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return True, result.stdout.strip().splitlines()[0].strip()
    except Exception:
        pass
    return False, None


@router.get("/gpu")
def get_gpu_status():
    has_nvidia_gpu, gpu_name = _detect_nvidia_gpu()
    installed = gpu_pack.is_installed()
    return {
        "has_nvidia_gpu": has_nvidia_gpu,
        "gpu_name": gpu_name,
        "gpu_pack_installed": installed,
        "gpu_active": has_nvidia_gpu and installed,
    }


@router.post("/gpu/install")
def install_gpu_pack():
    gpu_pack.run_install_async()
    return {"message": "GPU pack install started"}


@router.delete("/gpu/pack")
def remove_gpu_pack():
    gpu_pack.uninstall()
    return {"message": "GPU pack removed"}
