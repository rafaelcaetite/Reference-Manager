# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-15

### Added
- **Multi-Format Reference Ingestion**: Expanded file parser to accept BibTeX (`.bib`, `.bibtex`) and LaTeX (`.tex`) files alongside standard `.csv` files.
- **Native BibTeX Parser (`src/core/bibtexParser.ts`)**: Pure TypeScript recursive-descent tokenizer tracking brace and quote depth, supporting multi-line entries, string concatenation (`#`), macro expansions, and arbitrary custom fields without data loss.
- **LaTeX Document Parser (`src/core/texParser.ts`)**: Dual-mode parser supporting embedded BibTeX blocks and `\begin{thebibliography}` environments with `\bibitem` entries, preserving the full pristine citation string in `raw_citation`.
- **LaTeX Character Unescaper (`src/core/latexUnescape.ts`)**: Decodes standard LaTeX diacritical marks (`\"a` to `ä`, `\'e` to `é`, `\c{c}` to `ç`, `\~{a}` to `ã`, etc.), formatting commands, and special characters into standard UTF-8.
- **Standardized BibTeX Exporter (`src/core/bibtexExporter.ts`)**: Generates valid, cleanly formatted `.bib` files with standardized citation keys (`AuthorYearTitle`), canonical field order, and preservation of all custom metadata for Overleaf and Zotero.
- **LLM Context Window Guidance (`src/components/dashboard/LLMBatchSection.tsx`)**: Floating contextual guidance and dismissal dialog advising researchers to initiate a clean chat session for each generated batch to prevent attention degradation, prompt drift, and context saturation in Large Language Models.
- **Format Indicators**: Visual badges (CSV, BIB, TEX) in the file ingestion manager showing format type, record count, and file size.
- **Automated Test Suite**: Added 54 new Vitest unit tests covering BibTeX parsing, TeX extraction, diacritic unescaping, and BibTeX export (total test suite: 69 tests).

### Changed
- Refactored `useReferenceWorkspace.ts` to route parsing by file extension while aggregating all extracted fields into the global column schema.
- Updated `StatsBar.tsx` and `App.tsx` to include bidirectional export triggers: sanitized CSV and standardized BibTeX (`.bib`).

---

## [1.0.0] - 2026-09-15

### Added
- Multi-source CSV aggregation preserving 100% of original metadata columns.
- Heuristic schema detection with UTF-8 BOM stripping across English and Portuguese naming conventions.
- Multi-tier deduplication engine combining $O(1)$ DOI/title hash tables, length-bound pruning, and Ratcliff-Obershelp (Gestalt Pattern Matching).
- Survivor election policies based on metadata completeness scoring and intake order.
- Interactive duplicate cluster inspection with instant in-memory pivot reassignment.
- Temporal range filter and publication year distribution histogram.
- CSV Formula Injection defense (CWE-1236) prefixing dangerous spreadsheet trigger characters.
- Structured LLM text batch partitioning with compressed ZIP packaging.
- Desktop application support via Tauri v2 for Windows (`.exe` and `.msi`) and portable batch launcher (`Reference-Manager.bat`).
- Continuous deployment to GitHub Pages.
