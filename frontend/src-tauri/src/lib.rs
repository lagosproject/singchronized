use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

/// Port the dev backend runs on (`uvicorn backend.app.main:app --port 8000`),
/// used when no packaged sidecar is found (i.e. during `tauri dev`).
const DEV_BACKEND_PORT: u16 = 8000;
const BACKEND_STARTUP_TIMEOUT: Duration = Duration::from_secs(90);

struct BackendProcess(Mutex<Option<Child>>);

fn find_free_port() -> std::io::Result<u16> {
    Ok(TcpListener::bind("127.0.0.1:0")?.local_addr()?.port())
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

fn backend_executable(app: &tauri::AppHandle) -> Option<PathBuf> {
    let name = if cfg!(windows) {
        "singchronized-backend.exe"
    } else {
        "singchronized-backend"
    };
    let path = app
        .path()
        .resource_dir()
        .ok()?
        .join("backend")
        .join(name);
    path.exists().then_some(path)
}

fn spawn_backend(exe: &PathBuf, port: u16) -> std::io::Result<Child> {
    let mut cmd = Command::new(exe);
    cmd.args(["--host", "127.0.0.1", "--port", &port.to_string()]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    // Kill the backend if this process dies without running the Exit handler
    // (e.g. SIGKILL); window close is handled by RunEvent::Exit.
    #[cfg(target_os = "linux")]
    unsafe {
        use std::os::unix::process::CommandExt;
        cmd.pre_exec(|| {
            libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM);
            Ok(())
        });
    }

    cmd.spawn()
}

pub fn run() {
    let app = tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle();

            let port = match backend_executable(handle) {
                Some(exe) => {
                    let port = find_free_port()?;
                    let child = spawn_backend(&exe, port)?;
                    *handle.state::<BackendProcess>().0.lock().unwrap() = Some(child);
                    if !wait_for_port(port, BACKEND_STARTUP_TIMEOUT) {
                        return Err("backend did not start listening in time".into());
                    }
                    port
                }
                // No packaged sidecar: assume a dev backend (tauri dev).
                None => DEV_BACKEND_PORT,
            };

            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("SingChronized")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .initialization_script(&format!("window.__BACKEND_PORT__ = {port};"))
                .build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = app_handle
                .state::<BackendProcess>()
                .0
                .lock()
                .unwrap()
                .take()
            {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    });
}
