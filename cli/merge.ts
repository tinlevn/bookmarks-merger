#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseBookmarkFile } from '../src/core/parser';
import { analyzeBookmarkGaps } from '../src/core/analyzer';
import { buildMergedTree } from '../src/core/merger';
import { serializeNetscapeHtml, serializeCatchupHtml } from '../src/core/serializer';
import type { MergeOptions } from '../src/core/types';

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mBookmark Unifier & Gap Analyzer CLI\x1b[0m

\x1b[1mUsage:\x1b[0m
  npm run cli -- [options] <file1> <file2> [file3] [file4]

\x1b[1mOptions:\x1b[0m
  -o, --output <path>       Output path for merged HTML (default: bookmarks-merged.html)
  --catchup                 Also export individual catch-up HTML files for each browser
  --strict                  Disable query parameter stripping (exact URL matching)
  --keep-toolbars-separate  Do not alias "Bookmarks bar", "Favorites bar", etc.
  --diff-only               Only show gap analysis and exit without saving files
  -h, --help                Show this help message

\x1b[1mExamples:\x1b[0m
  npm run cli -- chrome.html edge.html firefox.html -o unified.html
  npm run cli -- bookmarks_1.html bookmarks_2.html --catchup
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let outputPath = 'bookmarks-merged.html';
  let exportCatchup = false;
  let strict = false;
  let keepToolbarsSeparate = false;
  let diffOnly = false;
  const inputFiles: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      outputPath = args[++i];
    } else if (arg === '--catchup') {
      exportCatchup = true;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--keep-toolbars-separate') {
      keepToolbarsSeparate = true;
    } else if (arg === '--diff-only') {
      diffOnly = true;
    } else if (!arg.startsWith('-')) {
      inputFiles.push(arg);
    }
  }

  if (inputFiles.length < 2) {
    console.error('\x1b[31mError: Please provide at least 2 bookmark files to compare and merge.\x1b[0m');
    printHelp();
    process.exit(1);
  }

  const mergeOptions: MergeOptions = {
    normalize: {
      stripTrackingParams: !strict,
      trimTrailingSlash: true,
      ignoreProtocol: false,
      ignoreHash: false,
      lowercaseHost: true,
    },
    unifyToolbars: !keepToolbarsSeparate,
    preferNonEmptyTitle: true,
    preferHttps: true,
  };

  console.log(`\n\x1b[36mAnalyzing ${inputFiles.length} bookmark files...\x1b[0m\n`);

  const parsedFiles = [];
  for (const filePath of inputFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`\x1b[31mFile not found: ${filePath}\x1b[0m`);
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const parsed = parseBookmarkFile(content, filename, undefined, mergeOptions.normalize);
    parsedFiles.push(parsed);
  }

  const result = analyzeBookmarkGaps(parsedFiles, mergeOptions);

  // Print Summary Table
  console.log('\x1b[1m\x1b[32m=== GAP ANALYSIS SUMMARY ===\x1b[0m');
  console.log(`Total Unique URLs across all files: \x1b[1m${result.totalUniqueUrls}\x1b[0m`);
  console.log(`Total Bookmark Items Processed:     \x1b[1m${result.totalRawItems}\x1b[0m`);
  console.log(`Multi-Browser Overlap Rate:         \x1b[1m${result.overlapRate.toFixed(1)}%\x1b[0m\n`);

  console.log('-----------------------------------------------------------------------------------------');
  console.log(
    `| ${'File'.padEnd(24)} | ${'Browser'.padEnd(9)} | ${'Total'.padStart(7)} | ${'Unique'.padStart(7)} | ${'Missing'.padStart(7)} | ${'Coverage'.padStart(9)} |`
  );
  console.log('-----------------------------------------------------------------------------------------');

  for (const file of parsedFiles) {
    const s = result.perFileStats[file.id];
    console.log(
      `| ${file.filename.slice(0, 24).padEnd(24)} | ${s.browser.padEnd(9)} | ${String(s.totalBookmarks).padStart(7)} | ${String(s.uniqueCount).padStart(7)} | \x1b[33m${String(s.missingCount).padStart(7)}\x1b[0m | ${s.coveragePct.toFixed(1).padStart(8)}% |`
    );
  }
  console.log('-----------------------------------------------------------------------------------------\n');

  // Show sample missing bookmarks for each file
  for (const file of parsedFiles) {
    const missing = result.matrix.filter((b) => b.missingFileIds.includes(file.id));
    if (missing.length > 0) {
      console.log(`\x1b[1m\x1b[33mMissing in ${file.filename} (${missing.length} links):\x1b[0m`);
      const sample = missing.slice(0, 5);
      for (const b of sample) {
        console.log(`  - \x1b[37m${b.title.slice(0, 45).padEnd(45)}\x1b[0m -> \x1b[90m${b.canonicalUrl}\x1b[0m`);
      }
      if (missing.length > 5) {
        console.log(`    ... and ${missing.length - 5} more missing links.`);
      }
      console.log();
    }
  }

  if (diffOnly) {
    console.log('\x1b[36mDiff-only mode: no files written.\x1b[0m');
    return;
  }

  // Build merged tree
  const mergedTree = buildMergedTree(result.matrix, mergeOptions);
  const mergedHtml = serializeNetscapeHtml(mergedTree);

  fs.writeFileSync(outputPath, mergedHtml, 'utf-8');
  console.log(`\x1b[1m\x1b[32mSUCCESS: Unified Netscape HTML written to:\x1b[0m \x1b[1m${outputPath}\x1b[0m`);
  console.log(`Contains \x1b[1m${result.totalUniqueUrls}\x1b[0m unique links organized in folder hierarchy.\n`);

  if (exportCatchup) {
    for (const file of parsedFiles) {
      const missing = result.matrix.filter((b) => b.missingFileIds.includes(file.id));
      if (missing.length > 0) {
        const catchupPath = `catchup-for-${path.parse(file.filename).name}.html`;
        const catchupHtml = serializeCatchupHtml(missing, file.label);
        fs.writeFileSync(catchupPath, catchupHtml, 'utf-8');
        console.log(`Saved catch-up file: \x1b[36m${catchupPath}\x1b[0m (${missing.length} missing links)`);
      }
    }
    console.log();
  }
}

main().catch((err) => {
  console.error('\x1b[31mExecution error:\x1b[0m', err);
  process.exit(1);
});

