# 🌀 RiftClaw Limbo World - Quick Start

## Windows Users (Easiest Method)

### Option 1: Double-Click Start (Recommended)
1. Download `limbo.html` and `start-limbo.bat` to the same folder
2. **Double-click `start-limbo.bat`**
3. Open your browser to: `http://localhost:8000/limbo.html`
4. That's it! The server is running.

### Option 2: VS Code (If you have it)
1. Install VS Code from: https://code.visualstudio.com
2. Install the **"Live Server"** extension
3. Right-click `limbo.html` → **"Open with Live Server"**
4. It will open automatically in your browser

### Option 3: Node.js (If you have it)
1. Open Command Prompt or PowerShell in the limbo folder
2. Run: `npx serve`
3. Open: `http://localhost:3000/limbo.html`

---

## Mac/Linux Users

### Terminal Method
1. Open Terminal in the limbo folder
2. Run: `python3 -m http.server 8000`
3. Open: `http://localhost:8000/limbo.html`

---

## Why Can't I Just Double-Click the HTML File?

**Browser Security:** Modern browsers block `file://` URLs from remote websites (like Replit). You MUST use `http://localhost` for the cross-world portal to work.

---

## Troubleshooting

**"Windows protected your PC" when running .bat file?**
- Click "More info" → "Run anyway"
- This is normal for downloaded batch files

**Port 8000 already in use?**
- Change 8000 to another number (like 8080) in the batch file

**"npx not found"?**
- Install Node.js from: https://nodejs.org

---

## 🎮 Once You're In

- **WASD** - Move
- **Mouse** - Look around
- **Walk into portal** - Travel to Replit Lobby World!
- **'O' key** - Return to local Limbo (once you've been somewhere)
