from fastapi import APIRouter, HTTPException

from ..audio import get_devices, play_test_tone

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
