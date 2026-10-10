#!/usr/bin/env python3
"""
BoardSight App - Dual Server Starter
Starts both Vite dev server and Cloudflare Pages dev server in separate administrator terminals.
"""

import subprocess
import os
import sys
import time

# Get the project directory (where this script is located)
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

def start_admin_terminal(command, label):
    """
    Start a new terminal in administrator mode running the given command.
    """
    # Using cmd /k keeps the window open. cd /d safely handles spaces and drive letters.
    cmd_args = f'/k cd /d "{PROJECT_DIR}" && {command}'
    
    # PowerShell command to elevate privileges and launch the cmd window
    ps_command = f"Start-Process cmd -Verb RunAs -ArgumentList '{cmd_args}'"
    
    try:
        print(f"🚀 Starting {label}...")
        subprocess.Popen(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"✓ {label} terminal launched")
    except Exception as e:
        print(f"✗ Error starting {label}: {e}")
        return False
    
    return True

def main():
    print("=" * 70)
    print("BoardSight App - Dual Server Starter")
    print("=" * 70)
    print(f"Project directory: {PROJECT_DIR}\n")
    
    # Verify we're in the right directory
    if not os.path.exists(os.path.join(PROJECT_DIR, "package.json")):
        print("❌ Error: package.json not found!")
        print(f"   Make sure this script is in your project root: {PROJECT_DIR}")
        sys.exit(1)
    
    print("Starting 2 servers in administrator terminals...\n")
    
    # Start Vite dev server
    success1 = start_admin_terminal(
        "npm run dev",
        "Frontend (Vite)"
    )
    
    # Give the first terminal a moment to start
    time.sleep(1)
    
    # Start Cloudflare Pages dev server
    success2 = start_admin_terminal(
        "npx wrangler pages dev ./dist --port 8788",
        "Backend (Cloudflare)"
    )
    
    print("\n" + "=" * 70)
    if success1 and success2:
        print("✅ Both servers started successfully!")
        print("\nServer URLs:")
        print("  📱 Frontend: http://localhost:5173")
        print("  ⚙️  Backend:  http://localhost:8788")
        print("\nYou can now:")
        print("  1. Open http://localhost:5173 in your browser")
        print("  2. Paste a PGN game")
        print("  3. Click 'Analyze' to start")
        print("  4. Coach explanations will appear as you navigate moves")
        print("  5. Click the share icon to generate a share link")
        print("\n💡 Tip: Both terminals will stay open. Close them when done.")
    else:
        print("⚠️  Some servers failed to start. Check the terminal windows.")
    
    print("=" * 70)

if __name__ == "__main__":
    main()