"""Entry point for the packaged (PyInstaller) backend.

Usage:
    singchronized-backend [--host HOST] [--port PORT]   start the API server
    singchronized-backend demucs <demucs args...>       run demucs CLI (used by
                                                        the split worker to
                                                        re-invoke this same
                                                        executable)
"""
import multiprocessing
import sys


def main():
    multiprocessing.freeze_support()

    if len(sys.argv) > 1 and sys.argv[1] == "demucs":
        # torchaudio.save in newer versions tries torchcodec first, which requires
        # CUDA libraries not present in a CPU-only build. Patch it to use soundfile
        # instead, which is already bundled and works on all platforms.
        import torchaudio
        import soundfile as sf

        def _save_via_soundfile(uri, src, sample_rate, **kwargs):
            data = src.numpy().T  # [C, N] → [N, C]
            sf.write(str(uri), data, sample_rate, subtype="PCM_24")

        torchaudio.save = _save_via_soundfile

        from demucs.separate import main as demucs_main
        demucs_main(sys.argv[2:])
        return

    import argparse

    parser = argparse.ArgumentParser(description="SingChronized backend server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    import uvicorn

    from backend.app.main import app

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
