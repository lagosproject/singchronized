import subprocess
import os
import sys
import socket

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(start_port: int) -> int:
    port = start_port
    while is_port_in_use(port):
        port += 1
    return port

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # Enforce build of frontend first
    print("Building React frontend...")
    npm_cmd = "npm"
    # Support Windows npm
    if os.name == 'nt':
        npm_cmd = "npm.cmd"
        
    try:
        subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir, check=True)
        print("Frontend built successfully!")
    except subprocess.CalledProcessError as e:
        print("Failed to build frontend. Please ensure npm is installed and dependencies are built.")
        sys.exit(1)
        
    # Find available port
    target_port = 8000
    if is_port_in_use(target_port):
        target_port = find_available_port(8001)
        print(f"Port 8000 is already in use. Auto-routing to available port: {target_port}")
        
    # Start backend server
    print(f"Starting FastAPI Backend server at http://localhost:{target_port} ...")
    venv_python = os.path.join(root_dir, ".venv", "bin", "python")
    if not os.path.exists(venv_python):
        venv_python = "python" # fallback
        
    cmd = [
        venv_python,
        "-m", "uvicorn",
        "backend.app.main:app",
        "--host", "127.0.0.1",
        "--port", str(target_port)
    ]
    
    try:
        subprocess.run(cmd, cwd=root_dir)
    except KeyboardInterrupt:
        print("\nShutdown requested, exiting.")

if __name__ == "__main__":
    main()

