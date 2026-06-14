# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the SingChronized backend sidecar (onedir build).
# Build with:  pyinstaller singchronized-backend.spec
# Output:      dist/singchronized-backend/
from PyInstaller.utils.hooks import collect_all, collect_submodules

datas = []
binaries = []
hiddenimports = []

# Packages with non-Python assets or dynamic imports the analyzer misses:
# demucs ships remote model yaml files, faster_whisper ships VAD assets.
for pkg in ("demucs", "faster_whisper", "numpy"):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

# uvicorn picks loops/protocols/lifespan implementations at runtime.
hiddenimports += collect_submodules("uvicorn")
# websockets is the WS transport; uvicorn imports it at runtime via importlib.
hiddenimports += collect_submodules("websockets")
# numpy.core.multiarray is referenced by pickled Demucs model checkpoints;
# collect_all("numpy") above should bundle it, but list it explicitly too.
hiddenimports += ["numpy.core.multiarray", "numpy.core._multiarray_umath"]

a = Analysis(
    ["backend/server.py"],
    pathex=["."],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "IPython", "PyQt5", "PyQt6", "PySide2", "PySide6"],
    noarchive=False,
)

# libcaffe2_nvrtc links the NVIDIA driver (libcuda.so.1) directly, which breaks
# linuxdeploy's AppImage dependency resolution; torch only needs it for CUDA
# JIT of C++ extensions, which this app never does.
#
# We also exclude libstdc++.so.6 and libgcc_s.so.1 to avoid conflicts with
# newer system libraries (like libjack.so.0) on newer host distributions.
excluded_binaries = {"libcaffe2_nvrtc", "libstdc++.so.6", "libgcc_s.so.1"}
a.binaries = [b for b in a.binaries if not any(ex in b[0] for ex in excluded_binaries)]

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="singchronized-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="singchronized-backend",
)
