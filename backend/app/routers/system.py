from fastapi import APIRouter

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/gpu")
def get_gpu_status():
    has_gpu = False
    gpu_name = None
    try:
        import torch
        has_gpu = torch.cuda.is_available()
        if has_gpu:
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass
    return {"has_gpu": has_gpu, "gpu_name": gpu_name}
