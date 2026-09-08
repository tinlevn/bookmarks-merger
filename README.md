# Bookmark Unifier & Gap Analyzer 🔖

A blazing-fast, client-side web application and companion CLI to import bookmark files from **2 to 4+ different browsers** (Chrome, Microsoft Edge, Mozilla Firefox, Vivaldi, Opera), perform full **gap analysis** (identifying which browser is missing which links), and **export a unified, spec-compliant Netscape Bookmark HTML file** with folder hierarchies intact.

Zero servers, zero tracking, 100% private and runs completely in your browser or terminal.

---

## Key Features

1. **Multi-Browser Ingestion (HTML & Chromium JSON)**:
   - Supports exported Netscape Bookmark HTML files (`.html`, `.htm`) from:
     - **Google Chrome**
     - **Microsoft Edge**
     - **Mozilla Firefox**
     - **Vivaldi**
     - **Opera & Opera GX**
     - **Brave & Safari**
   - Also supports direct Chromium raw `Bookmarks` JSON files.
   - Auto-detects browser type and applies distinctive brand badge colors.

2. **Gap Analysis & Diff Matrix ("Who is missing what?")**:
   - Computes global unique URL set across all imported files.
   - **Per-browser missing counter**: Shows exactly how many links each browser is missing compared to all others.
   - **Filter pills**:
     - *All Unique URLs*
     - *Missing in Chrome*
     - *Missing in Edge*
     - *Missing in Firefox*
     - *Missing in Vivaldi*
     - *Exclusive to 1 Browser*
     - *Shared in All*
     - *Folder Path Conflicts*
   - Interactive matrix table with search, breadcrumbs, presence checkmarks (`✅ / ❌`), and 1-click clipboard copy.

3. **Per-Browser "Catch-up" Exports**:
   - Download dedicated delta HTML files containing **only** the links that a specific browser is missing.
   - Import this single file into your browser to bring it 100% in sync without duplicating your existing bookmarks!

4. **Recursive Folder Hierarchy Unifier**:
   - Merges folder trees by path (e.g. `Development > AI` across 3 browsers merges cleanly into one folder with deduplicated children).
   - Unifies browser toolbar roots ("Bookmarks bar" in Chrome == "Favorites bar" in Edge == "Bookmarks Toolbar" in Firefox).
   - Reconciles folder location conflicts (shows where each browser had filed the URL and where it was unified).

5. **Intelligent URL Normalization**:
   - Automatically strips tracking/marketing query parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `si`, etc.) to find real duplicates.
   - Normalizes trailing slashes (`example.com/` = `example.com`).
   - Selects the most informative title for each bookmark.
   - Full toggle settings available in the UI.

6. **Two Modes: Web UI & Standalone CLI**:
   - Interactive modern UI built with Vite, React 19, TypeScript, and Tailwind CSS.
   - Standalone CLI for terminal lovers and automated workflows.
   - Portable single-file build (`dist-standalone/index.html`) that works offline by double-clicking in Windows Explorer.

---

## Quick Start

### 1. Interactive Web UI

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

Then open `http://localhost:5173/` in your browser.

Click **"Load 4-Browser Demo"** to immediately test all features with pre-configured realistic exports from Chrome, Edge, Firefox, and Vivaldi!

### 2. Standalone Single-File App (No Server Needed)

You can build a single, self-contained HTML file that can be opened on any machine with no Node.js or internet connection:

```bash
npm run build:standalone
```

The output file is created at `dist-standalone/index.html`. Simply double-click it in Windows Explorer to use!

### 3. Companion CLI

You can run gap analysis and merging directly in your terminal:

```bash
# Compare and merge bookmark files
npm run cli -- fixtures/chrome_bookmarks.html fixtures/edge_favorites.html fixtures/firefox_bookmarks.html -o unified.html

# Also export individual catch-up files for each browser
npm run cli -- file1.html file2.html file3.html --catchup

# Run gap analysis and display summary table without writing output file
npm run cli -- file1.html file2.html --diff-only
```

#### CLI Options
| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Path for the unified Netscape HTML (default: `bookmarks-merged.html`) |
| `--catchup` | Generates catch-up HTML files for each browser |
| `--strict` | Disable query parameter stripping (exact URL matching) |
| `--keep-toolbars-separate` | Do not alias toolbar roots |
| `--diff-only` | Print terminal gap summary table and exit |

---

## Running Automated Tests

A comprehensive test suite verifies normalizers, parsers, gap set calculations, tree merging, and Netscape HTML roundtrip serialization:

```bash
npm run test
```

---

## Sample Demo Fixtures

Ready-to-use sample bookmark exports are included in the `fixtures/` directory:
- `fixtures/chrome_bookmarks.html`
- `fixtures/edge_favorites.html`
- `fixtures/firefox_bookmarks.html`
- `fixtures/vivaldi_bookmarks.html`
