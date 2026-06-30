from fastapi import APIRouter, HTTPException

from ..audio import get_devices, play_test_tone, player
from ..schemas import CalibrationStartRequest

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("")
def list_audio_devices():
    return get_devices()


@router.post("/{device_id}/test-tone")
def play_device_test_tone(device_id: str):
    try:
        play_test_tone(device_id)
        return {"message": "Test tone played"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calibration/start")
def start_calibration(req: CalibrationStartRequest):
    try:
        player.start_calibration(req.singer_device, req.audience_device)
        return {"message": "Calibration started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calibration/stop")
def stop_calibration():
    try:
        player.stop_calibration()
        return {"message": "Calibration stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
