// Packaged (Tauri) builds inject the sidecar port via an initialization
// script (window.__BACKEND_PORT__) before any app code runs.
// In Vite dev mode (port 5173) the backend runs separately on :8000;
// otherwise the frontend is served by the backend itself.
const tauriPort = window.__BACKEND_PORT__;
const isViteDev = window.location.port === '5173';

export const API_BASE = tauriPort
  ? `http://127.0.0.1:${tauriPort}`
  : (isViteDev ? 'http://localhost:8000' : '');
export const WS_BASE = tauriPort
  ? `ws://127.0.0.1:${tauriPort}`
  : (isViteDev ? 'ws://localhost:8000' : `ws://${window.location.host}`);
