@echo off
setlocal enabledelayedexpansion

rem Rebuilds the Python backend sidecar from scratch AND bundles it into the
rem Tauri desktop app. `npm run tauri build` on its own does NOT rebuild the
rem Python side - it only bundles whatever is already sitting in
rem frontend\src-tauri\resources\backend, which is very easy to leave stale
rem (see README.md "Desktop Bundles" section for the manual steps this
rem script automates).

pushd "%~dp0"

set VENV_PY=.venv\Scripts\python.exe

if not exist "%VENV_PY%" (
    echo [build] ERROR: %VENV_PY% not found. Create the venv first ^(see README.md^).
    goto :error
)

echo [build] 1/4 Ensuring PyInstaller is installed...
"%VENV_PY%" -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    "%VENV_PY%" -m pip install pyinstaller
    if errorlevel 1 (
        goto :error
    )
)

echo [build] 2/4 Freezing backend sidecar (clean build, no stale artifacts)...
if exist build\singchronized-backend rd /s /q build\singchronized-backend
if exist dist\singchronized-backend rd /s /q dist\singchronized-backend
"%VENV_PY%" -m PyInstaller singchronized-backend.spec --noconfirm --clean
if errorlevel 1 goto :error

echo [build] 3/4 Staging backend into Tauri resources...
if not exist frontend\src-tauri\resources mkdir frontend\src-tauri\resources
if exist frontend\src-tauri\resources\backend rd /s /q frontend\src-tauri\resources\backend
robocopy dist\singchronized-backend frontend\src-tauri\resources\backend /E /MIR /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto :error

echo [build] 4/4 Building Tauri app (frontend + installer)...
pushd frontend
call npm run tauri build
if errorlevel 1 (
    popd
    goto :error
)
popd

echo.
echo [build] Done. Installer is under frontend\src-tauri\target\release\bundle\
popd
exit /b 0

:error
echo.
echo [build] FAILED - see output above.
popd
exit /b 1
