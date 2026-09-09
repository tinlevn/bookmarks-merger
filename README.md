# Bookmark Unifier & Gap Analyzer 🔖

A client-side web application and companion CLI to import bookmark files from two to four or more browsers (Google Chrome, Microsoft Edge, Mozilla Firefox, Vivaldi, Opera, Safari, and Brave), perform gap analysis to identify missing links across browsers, and export a unified, spec-compliant Netscape Bookmark HTML file with folder hierarchies intact.

Zero servers, zero tracking, 100% private. Runs completely in your browser or terminal.

---

## Key Features

1. **Multi-Browser Ingestion (HTML and Chromium JSON)**:
   - Supports exported Netscape Bookmark HTML files (`.html`, `.htm`) from:
     - **Google Chrome**
     - **Microsoft Edge**
     - **Mozilla Firefox**
     - **Vivaldi**
     - **Opera and Opera GX**
     - **Brave and Safari**
   - Supports raw Chromium `Bookmarks` JSON files directly.
   - Detects browser types automatically and applies brand badge colors.

2. **Gap Analysis and Diff Matrix ("Who is missing what?")**:
   - Computes global unique URL sets across all imported files.
   - **Per-browser missing counter**: Shows the exact number of links each browser misses compared to the rest.
   - **Filter pills**:
     - *All Unique URLs*
     - *Missing in Chrome*
     - *Missing in Edge*
     - *Missing in Firefox*
     - *Missing in Vivaldi*
     - *Exclusive to 1 Browser*
     - *Shared in All*
     - *Folder Path Conflicts*
   - Interactive matrix table with search, folder paths, presence checkmarks (`✅ / ❌`), and one-click clipboard copying.

3. **Per-Browser Catch-Up Exports**:
   - Downloads dedicated delta HTML files containing only the links that a specific browser misses.
   - Import this single file into your browser to synchronize it without duplicating existing bookmarks.

4. **Recursive Folder Hierarchy Unifier**:
   - Merges folder trees by path (for example, `Development > AI` across three browsers merges cleanly into one folder with deduplicated children).
   - Unifies browser toolbar roots ("Bookmarks bar" in Chrome, "Favorites bar" in Edge, and "Bookmarks Toolbar" in Firefox).
   - Reconciles folder location conflicts by displaying original browser locations alongside the unified path.

5. **Intelligent URL Normalization**:
   - Strips tracking query parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `si`, etc.) automatically to find true duplicates.
   - Normalizes trailing slashes (`example.com/` = `example.com`).
   - Selects the most informative title for each bookmark.
   - Provides full toggle settings in the user interface.

6. **Two Modes: Web UI and Standalone CLI**:
   - Interactive UI built with Vite, React 19, TypeScript, and Tailwind CSS.
   - Standalone CLI for terminal users and automated workflows.
   - Portable single-file build (`dist-standalone/index.html`) that works offline when you open it directly in a browser.

---

## Quick Start

### 1. Interactive Web UI

Run the local development server:

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

Click **"Load 4-Browser Demo"** to test all features with pre-configured realistic exports from Chrome, Edge, Firefox, and Vivaldi.

### 2. Standalone Single-File App (No Server Needed)

You can build a single, self-contained HTML file that runs on any machine without Node.js or internet access:

```bash
npm run build:standalone
```

The build process outputs the file at `dist-standalone/index.html`. Double-click it to run it directly in your browser.

### 3. Companion CLI

You can run gap analysis and merge bookmark files directly in your terminal:

```bash
# Compare and merge bookmark files
npm run cli -- fixtures/chrome_bookmarks.html fixtures/edge_favorites.html fixtures/firefox_bookmarks.html -o unified.html

# Export individual catch-up files for each browser
npm run cli -- file1.html file2.html file3.html --catchup

# Run gap analysis and display a summary table without writing files
npm run cli -- file1.html file2.html --diff-only
```

#### CLI Options
| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Specifies output path for unified Netscape HTML (default: `bookmarks-merged.html`) |
| `--catchup` | Generates catch-up HTML files for each browser |
| `--strict` | Disables query parameter stripping for exact URL matching |
| `--keep-toolbars-separate` | Keeps toolbar roots separate without aliasing |
| `--diff-only` | Prints terminal gap summary table and exits |

---

## Running Automated Tests

The automated test suite verifies normalizers, parsers, gap set calculations, tree merging, and Netscape HTML roundtrip serialization:

```bash
npm run test
```

---

## Sample Demo Fixtures

The repository includes sample bookmark exports in the `fixtures/` directory:
- `fixtures/chrome_bookmarks.html`
- `fixtures/edge_favorites.html`
- `fixtures/firefox_bookmarks.html`
- `fixtures/vivaldi_bookmarks.html`
