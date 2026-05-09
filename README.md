# Link Bypasser

Automatically clicks through all 4 levels of the **hindisink.com** ad-wall and extracts the final **Telegram link** — no manual clicking required.

---

## How It Works

When you share a `linkshortx.in` link, it forces you to sit through 4 rounds of "Click here to verify" pages on hindisink.com before you can get the actual Telegram URL. This tool automates all of that in the background using a headless browser.

**Step-by-step flow:**

1. You paste a `linkshortx.in` URL into the web UI and click **Bypass**
2. The server opens a hidden Chrome browser using Puppeteer
3. It loads the link, which redirects to a hindisink.com article page
4. It automatically clicks through all 4 verification levels (each one has a "Click here to verify" → Continue → Now Continue flow)
5. After all 4 levels, it lands on the final `linkshortx.in` / `urlshortx.io` page
6. It clicks the **Get Link** button and captures the Telegram URL
7. The Telegram URL is sent back to your browser and displayed instantly

Live logs and a progress bar are streamed to the UI in real time so you can see exactly what step it's on.

---

## Requirements

Make sure the following are installed on your machine before running:

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v16 or higher | https://nodejs.org |
| **npm** | comes with Node.js | — |

> To check if Node.js is already installed, open a terminal and run:
> ```
> node --version
> ```

---

## Installation

**1. Clone the repository**
```bash
git clone https://github.com/venkateswararaoemd-art/link-bypasser.git
cd link-bypasser
```

**2. Install dependencies**
```bash
npm install
```

This will install:
- `express` — web server
- `puppeteer-extra` — headless Chrome browser automation
- `puppeteer-extra-plugin-stealth` — makes the browser undetectable as a bot

> The first `npm install` will also download Chromium (~170 MB). This only happens once.

---

## Running the Server

### Option 1 — Command Prompt (Recommended)

Open a terminal in the project folder and use the included batch files:

**Start the server:**
```
start.bat
```

**Stop the server:**
```
stop.bat
```

The server runs in the background. You can close the terminal after starting.

### Option 2 — Manual

```bash
node server.js
```

Press `Ctrl + C` to stop.

---

## Usage

1. Start the server using one of the methods above
2. Open your browser and go to **http://localhost:3000**
3. Paste your `linkshortx.in` URL into the input box
4. Click **Bypass**
5. Watch the progress bar and live logs as it works through the 4 levels
6. When complete, the Telegram link appears — click it or copy it

---

## Project Structure

```
link-bypasser/
├── server.js          # Express server + SSE endpoint
├── bypass.js          # Puppeteer automation logic
├── public/
│   └── index.html     # Web UI
├── start.bat          # Start the server (Windows)
├── stop.bat           # Stop the server (Windows)
└── package.json
```

---

## Troubleshooting

**"Could not extract Telegram URL"**
The site may have updated its page structure. The bypass will automatically retry level 4 once before giving up.

**Server won't start**
Make sure Node.js is installed (`node --version`) and that you've run `npm install`.

**Port already in use**
Another process is using port 3000. Stop it, or set a different port:
```bash
PORT=4000 node server.js
```
Then open http://localhost:4000.
