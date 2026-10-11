# ♟️ BoardSight

<div align="center">
  
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Serverless-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Stockfish](https://img.shields.io/badge/Stockfish-18%20%7C%2019-222?style=for-the-badge&logo=gnu&logoColor=white)](https://stockfishchess.org/)

**A modern, production-grade, in-browser chess game analysis platform.**  
Featuring high-performance client-side WebAssembly engines, deep tactical move classification, natural coach explanations, opening detection, and interactive game graphs — completely free and privacy-first.

<img width="1680" height="915" alt="chrome_TdwvqagsYE" src="https://github.com/user-attachments/assets/aa5f6e02-b3d5-474a-8658-c0c1fc951869" />

## Close to chess.com analysis!

<img width="675" height="596" alt="chrome_YG1W4xnibf" src="https://github.com/user-attachments/assets/e61884a2-9a33-475e-a1f0-f71c0c00afd2" />

<img width="285" height="910" alt="ronZa768jF" src="https://github.com/user-attachments/assets/13376768-23b5-412c-a79e-7f5233df0897" />



[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Development Workflow](#-development-workflow) • [Project Architecture](#-project-architecture) • [Deployment](#-deployment)

</div>

---

## 🌟 Key Features

### ⚡ Multi-Engine In-Browser Analysis
- **Stockfish 19 & Stockfish 18**: State-of-the-art chess engines compiled to WebAssembly.
- **Berserk v4.3.0**: Alternative high-performance chess engine for diverse evaluation perspectives.
- **Zero-Bandwidth Engine Detection**: Automatically detects browser capabilities synchronously (`WASM`, `SharedArrayBuffer`, `crossOriginIsolated`) to serve the optimal flavor:
  - **Multi-Threaded Lite WASM** (Fastest multi-core performance via `SharedArrayBuffer`)
  - **Single-Threaded Lite WASM** (Universal support across modern desktop and mobile browsers)

- **Configurable Search Depth & Think Time**: Fine-tune depth and analysis duration per move (0.3s quick to 5.0s thorough).

### 🎯 Move Classification & Accuracy (CAPS)
- **Granular Move Badges**:
  - `!!` **Brilliant** – Exceptional, game-changing sacrifices and tactical moves
  - `!` **Great** – Strong, critical finds that maintain or increase advantage
  - `⊕` **Best** – Engine's top recommendation
  - `✓` **Excellent** – High-quality moves with negligible loss
  - **Good** – Solid, playable moves
  - `?!` **Inaccuracy** – Slight positional concession
  - `⊘` **Miss** – Overlooked tactical opportunity or punishment
  - `?` **Mistake** – Significant drop in evaluation
  - `??` **Blunder** – Severe error dramatically altering game trajectory
  - **Book** – Recognized theoretical opening moves
  - `N` **Novelty** – Theoretical divergence or new lines
  - `$` **Hanging piece** – Detects unprotected pieces
- **Calculated Accuracy Percentage**: Weighted Elo-adjusted player performance metrics for White and Black.

### 🧠 EngineX Tactical Coach & Explanations
Contextual, human-readable explanations powered by a modular tactical tracker suite:
- **Tactic Detection**: Hanging pieces, forks, pins, discoveries, skewer threats, check blockers, and tempo gains.
- **Strategic Tracking**: Passed pawns, king checks, rook development, sacrifice validation, streak tracking, and evaluation whiplash swings.
- **Checkmate Explorers**: Step-by-step mate sequence breakdowns and defense critiques.

### 🎭 Interactive Coach Avatar
- Expressive animated coach powered by **Lottie** .json files.
- Reacts dynamically to game situations: celebrating brilliant finds, highlighting book moves, offering encouraging feedback on inaccuracies, and reacting to blunders.

### 📊 Evaluation Bar & Advantage Graph
- Real-time smooth **Evaluation Bar** reflecting centipawn advantages and mate threats.
- Interactive **Game Advantage Graph** mapping the momentum of the game move-by-move. Click any point on the graph to jump straight to that board state.

### 📥 1-Click Game Importer
- **Chess.com & Lichess API Integration**: Fetch recent games or import via username or game URL directly.
- **PGN Parsing & Validation**: Paste raw PGN text or load pre-bundled classic games.
- **Board Flip & Perspective Selection**: Analyze from White's, Black's, or the winning side's perspective.

### 📖 Master Opening Explorer
- Integrated database of **4,750+ ECO opening variations** compiled from master TSV registries (`a.tsv` through `e.tsv` + `frc.tsv`).
- Identifies opening names, ECO codes, and moves played in theory.

### 🎨 Customization & Audio
- **6 Premium Piece Sets**: `Staunty`, `Monarchy`, `Infinix`, `Cooke`, `Maya-4`, and `Trinity-4`.
- **Custom Sound Effects**: Authentic audio for moves, captures, checks, and castles.
- **Dark & Light Mode**: Seamless theme switching with persistent localStorage preferences.
- **Shareable Game Links**: URL-compressed game states allowing easy sharing with coaches and peers.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/), [Vite 5](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS 3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Chess Engines** | [Stockfish 19 & 18](https://stockfishchess.org/) (WASM / ASM.js), [Berserk v4.3.0](https://github.com/jhonnold/berserk) |
| **Chess Logic** | [chess.js](https://github.com/jhlywa/chess.js), [react-chessboard](https://github.com/Clariity/react-chessboard) |
| **Animations** | [Lottie React](https://lottiereact.com/), [Rive Canvas](https://rive.app/) |
| **Serverless API** | [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/) (V8 isolates) |
| **PWA & Offline** | Custom Service Worker with hash-based asset manifest synchronization |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **Git**: For version control
- **Python 3.x** *(Optional, recommended)*: Enables the automated one-click dual server starter (`start-servers.py`)

---

### Step 1: Clone the Repository

Clone the project from GitHub and navigate into the root directory:

```bash
git clone https://github.com/neuroflowinfinix/BoardSight.git
cd BoardSight
```

---

### Step 2: Install Dependencies

Install all root dependencies:

```bash
npm install
```

> [!NOTE]
> For the Cloudflare serverless functions, install the dependencies inside `functions/` as well:
> ```bash
> cd functions && npm install && cd ..
> ```

---

### Step 3: Build the Distribution Bundle

Before running the Cloudflare Pages backend locally, generate the initial `./dist` bundle:

```bash
npm run build
```

This runs the prebuild script (`node scripts/buildOpenings.mjs`) to index the 4,750+ master chess openings into `public/openings.json`, followed by `vite build` and hash-manifest generation.

---

## 💻 Development Workflow

To have full functionality locally (including both the frontend application and the serverless backend API at `/api`), two development servers must run concurrently:
1. **Frontend (Vite)**: Runs on `http://localhost:5173` with fast Hot Module Replacement (HMR) and COOP/COEP headers.
2. **Backend (Cloudflare Pages)**: Runs on `http://localhost:8788` via Wrangler, serving serverless API functions (`/api/analyze`, `/api/metrics`). Vite automatically proxies `/api` calls to port 8788.

You can launch both servers using **either** the automated Python starter or manual administrator terminals:

---

### Option A: Automated Dual Server Starter (Recommended)

If you have Python installed, use the included [`start-servers.py`](./start-servers.py) script. It automatically requests administrative privileges and launches both servers in separate labeled terminal windows:

#### 1. Install Requirements (Optional — only when you want to use `start-servers.py`)
Ensure Python 3.8+ is installed on your machine. You can verify your environment using [`requirements.txt`](./requirements.txt):
```bash
pip install -r requirements.txt
```
*(Note: `start-servers.py` relies solely on Python's built-in standard library, so no third-party packages are required.)*

#### 2. Launch Dual Servers
```bash
python start-servers.py
```

- Window 1: **Frontend (Vite)** running `npm run dev`
- Window 2: **Backend (Cloudflare Pages)** running `npx wrangler pages dev ./dist --port 8788`

---

### Option B: Manual Launch (Two Admin Terminals)

If running commands manually on Windows, open **two separate Administrator Command Prompt or PowerShell terminals**:

#### Terminal 1 — Frontend (Vite)
```bash
# In project root:
npm run dev
```
> App will be accessible at: **http://localhost:5173**

#### Terminal 2 — Backend API (Cloudflare Pages / Wrangler)
```bash
# In project root:
npx wrangler pages dev ./dist --port 8788
```
> Serverless API will be accessible at: **http://localhost:8788**

---

## ⚙️ High-Performance Engine Headers (COOP / COEP)

Stockfish 18 and 19 require multi-threading capabilities via `SharedArrayBuffer`. Browsers enforce strict cross-origin isolation policies before enabling shared memory. 

`vite.config.js` is pre-configured with the required security headers:
```javascript
server: {
  headers: {
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin"
  },
  proxy: {
    '/api': {
      target: 'http://localhost:8788',
      changeOrigin: true,
    }
  }
}
```

These headers ensure Stockfish can utilize full multi-core performance directly in the user's browser.

---

## 📁 Project Architecture

```
BoardSight/
├── db/                           # Master chess opening database files
│   └── openings/                 # TSV opening datasets (a.tsv - e.tsv, frc.tsv)
│
├── functions/                    # Cloudflare Pages Serverless API Functions
│   ├── api/
│   │   ├── analyze.js            # Serverless game analysis endpoint
│   │   └── metrics.js            # Advanced accuracy & performance metric calculator
│   ├── enginex/                  # Modular EngineX tactical rule trackers
│   │   ├── checkTracker.js       # King safety & check assessments
│   │   ├── forkTracker.js        # Tactical double-attack recognition
│   │   ├── hangingPieceTracker.js# Undefended piece vulnerability analysis
│   │   ├── pinTracker.js         # Absolute and relative pin detection
│   │   ├── sacrificeTracker.js   # Dynamic sacrifice validation
│   │   └── moveExplainer.js      # Natural coach phrasing generator
│   ├── accuracy.js               # Weighted CAPS player accuracy calculation
│   ├── coachExplainer.js         # Core coach explanation orchestration
│   ├── grammarEngine.js          # Dynamic chess narrative grammar engine
│   └── moveClassifier.js         # CAPS move classification rules (Brilliant, Great, etc.)
│
├── public/                       # Static public assets
│   ├── stockfish-v19/            # Stockfish 19 WASM (multi/single) & ASM.js builds
│   ├── stockfish-v18/            # Stockfish 18 WASM & ASM.js builds
│   ├── berserk-v4.3.0/           # Berserk v4.3.0 WebAssembly worker
│   ├── lottie/                   # Animated coach avatars (brilliant, blunder, best, book)
│   ├── pieces/                   # Custom piece SVG vector sets
│   ├── sounds/                   # Move, capture, check, and castle MP3 audio
│   ├── frc.tsv                   # Fischer Random Chess (Chess960) positions & FENs
│   ├── openings.json             # Compiled master opening database
│   ├── sw.js                     # Offline caching & service worker lifecycle
│   └── _headers                  # Cloudflare security & COOP/COEP isolation headers
│
├── scripts/                      # Build & data generation scripts
│   ├── buildOpenings.mjs         # Parses TSV databases into indexed openings.json
│   ├── syncLock.mjs              # Synchronizes package-lock.json with package.json
│   └── copy-stockfish.js         # Stockfish asset synchronization
│
├── src/                          # Frontend Application Source Code
│   ├── components/
│   │   ├── AccuracyPanel.jsx     # CAPS score, move distribution, and accuracy stats
│   │   ├── BoardPanel.jsx        # Interactive chessboard & audio player
│   │   ├── EvalBar.jsx           # Centipawn & mate advantage visual bar
│   │   ├── GameGraph.jsx         # Evaluation trajectory graph across all moves
│   │   ├── GameImportModal.jsx   # Chess.com / Lichess API & PGN modal
│   │   ├── MoveList.jsx          # Move review list with classification badges
│   │   ├── OpeningBox.jsx        # ECO code and opening name badge
│   │   ├── SettingsModal.jsx     # Engine selection, depth, sound, and theme settings
│   │   └── SummaryPanel.jsx      # Post-game performance recap
│   ├── hooks/
│   │   ├── UciController.js      # Standard UCI communication controller
│   │   └── useGameAnalysis.js    # React analysis lifecycle and worker hook
│   ├── study/                    # Chess study viewer and interactive lesson tools
│   ├── utils/
│   │   ├── accuracy.js           # Client-side accuracy percentage calculations
│   │   ├── apiClient.js          # API client with seamless local fallback
│   │   ├── cache.js              # IndexedDB database & opening caching manager
│   │   ├── engineDetector.js     # Synchronous zero-network browser capability detector
│   │   ├── gameFetcher.js        # Lichess and Chess.com REST API client
│   │   ├── metricsCalculator.js  # Client-side ACPL and game metrics calculation
│   │   ├── moveClassifier.js     # Client-side move classification engine
│   │   ├── openingsDatabase.js   # Fast IndexedDB openings lookup manager
│   │   ├── pgnParser.js          # PGN validator and move parser
│   │   └── shareEncoder.js       # URL compression for sharable game reviews
│   ├── App.jsx                   # Main application layout and state
│   ├── main.jsx                  # Application entry point & PWA updater
│   └── index.css                 # Tailwind directives and custom animation styles
│
├── test-run.js                   # CLI test runner for game analysis & classifications
├── test-explainer.js             # CLI test runner for coach move explanations
├── requirements.txt              # Python requirements (Optional — for start-servers.py)
├── start-servers.py              # Automated dual-server developer launcher
├── vite.config.js                # Vite configuration with proxy, manifest, and COOP/COEP
└── wrangler.toml                 # Cloudflare Pages deployment configuration
```

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server on `http://localhost:5173` |
| `npm run build` | Compiles opening books (`prebuild`), builds production bundle, and generates asset manifests |
| `npm run preview` | Locally previews the production build in `./dist` |
| `npm run prebuild` | Executes `scripts/buildOpenings.mjs` to regenerate `openings.json` |

---

## ☁️ Deployment

This project is tailored for instant deployment on **Cloudflare Pages**:

1. Connect your repository to **Cloudflare Pages**.
2. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Node.js Version**: `18` or higher
3. Serverless functions in the `functions/` directory will automatically deploy as Cloudflare Pages Functions without additional setup.

---

## 📄 License & Rights

Copyright © 2026 **neuroflow_infinix**. All rights reserved.  
Stockfish is licensed under the [GNU General Public License v3 (GPL-3.0)](https://www.gnu.org/licenses/gpl-3.0.html).  
Berserk is licensed under the [GNU General Public License v3 (GPL-3.0)](https://www.gnu.org/licenses/gpl-3.0.html).

## Permissions

This project is source-available under a proprietary license. Copying,modifying, or using any part or fragment of this code for personal, academic, or commercial projects is strictly prohibited without explicit written consent.

For permission requests or licensing inquiries, contact: **[neuroflow_infinix@outlook.in](mailto:neuroflow_infinix@outlook.in)**.