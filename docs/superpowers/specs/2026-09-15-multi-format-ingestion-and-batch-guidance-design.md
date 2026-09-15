# Multi-Format Reference Ingestion, BibTeX Export & LLM Context Guidance Specification

## Metadata
- **Author**: Engineering Lead
- **Date**: 2026-09-15
- **Target Version**: 1.1.0
- **Status**: Approved

---

## 1. Overview and Problem Statement

Systematic Literature Review (SLR) workflows require aggregating citations not only from tabular CSV exports, but also directly from BibTeX (`.bib`, `.bibtex`) and LaTeX manuscript files (`.tex`). Currently, the system only ingests `.csv` files. Furthermore, users preparing batched prompt exports for Large Language Models (LLMs) often inadvertently feed multiple batches into a single ongoing conversation thread, causing context window saturation, attention degradation, and prompt drift.

This specification defines:
1. Native, high-performance, zero-dependency parsing of BibTeX (`.bib`) and LaTeX (`.tex` with embedded BibTeX or `\bibitem` bibliography environments).
2. Complete metadata preservation guaranteeing zero data loss across arbitrary custom fields.
3. Bidirectional export capability: sanitized CSV and standardized BibTeX (`.bib`).
4. Floating contextual guidance on LLM context window management when generating batches.
5. Semantic version bump to `v1.1.0`, automated release notes (`CHANGELOG.md`), updated technical `README.md`, and desktop release packaging.

---

## 2. Architecture & Domain Services

### 2.1 LaTeX Character Unescaper (`src/core/latexUnescape.ts`)
Decodes LaTeX commands and diacritical marks into standard UTF-8 characters:
- **Diacritics**: `\"a` / `\"{a}` $\rightarrow$ `ä`, `\'e` / `\'{e}` $\rightarrow$ `é`, `\`{a}` $\rightarrow$ `à`, `\~{a}` $\rightarrow$ `ã`, `\^{o}` $\rightarrow$ `ô`, `\c{c}` $\rightarrow$ `ç`, `\r{a}` $\rightarrow$ `å`, `\H{o}` $\rightarrow$ `ő`, etc.
- **Special Characters**: `\&` $\rightarrow$ `&`, `\%` $\rightarrow$ `%`, `\$` $\rightarrow$ `$`, `\_` $\rightarrow$ `_`, `\#` $\rightarrow$ `#`, `\textendash` or `--` $\rightarrow$ `–`, `\textemdash` or `---` $\rightarrow$ `—`.
- **Formatting cleanup**: Strips semantic protection braces (`{NASA}` $\rightarrow$ `NASA`), unescapes quotes (` `` ` and ` '' ` $\rightarrow$ `"`), and cleans LaTeX whitespace.

### 2.2 BibTeX Parser (`src/core/bibtexParser.ts`)
Zero-dependency recursive-descent / stack tokenizer:
- Tracks brace nesting levels `{...}` and quote delimiters `"..."`.
- Handles multi-line values, escaped delimiters, and string concatenations (`#`).
- Extracted Record:
  - `entryType`: Normalized lower-case entry type (e.g., `article`, `inproceedings`, `book`).
  - `citationKey`: BibTeX identifier key (e.g., `smith2020quantum`).
  - **Dynamic Fields**: Every field present in the entry (`title`, `author`, `year`, `journal`, `booktitle`, `doi`, `abstract`, `keywords`, `volume`, `pages`, `publisher`, plus any arbitrary or non-standard custom attributes) is preserved as key-value pairs.
  - Generates unified `ReferenceRawRow` objects compatible with the workspace deduplication pipeline.

### 2.3 TeX Parser (`src/core/texParser.ts`)
Handles `.tex` inputs using dual-mode resolution:
- **Mode A (Embedded BibTeX)**: Checks for `@\w+\s*\{`. If detected, routes to `bibtexParser`.
- **Mode B (`thebibliography` / `\bibitem`)**:
  - Scans for `\bibitem[label]{key} citation content`.
  - Extracts `citationKey`.
  - Heuristically extracts Authors, Title (bracketed in quotes ` ``...'' `, `\emph{}`, or `\textit{}`), Publication Year (regex `(19|20)\d{2}`), Venue / Journal, DOI (`\doi{...}` or regex pattern), and URL (`\url{...}`).
  - Retains the entire original entry text in `raw_citation` ensuring 100% information fidelity.

### 2.4 BibTeX Serializer / Exporter (`src/core/bibtexExporter.ts`)
Converts cleaned, deduplicated references into standard, publication-ready BibTeX `.bib` files:
- Generates clean citation keys (`[FirstAuthor][Year][FirstTitleWord]`) if none exists.
- Emits standard entries with sanitized braces `{...}`.
- Serializes standard fields (`author`, `title`, `year`, `journal`/`booktitle`, `doi`, `abstract`, `keywords`) along with all preserved custom metadata.

---

## 3. User Interface & Ingestion Workflow

### 3.1 Sidebar Upload Card (`src/components/sidebar/FileUploaderCard.tsx`)
- Accepts `.csv`, `.bib`, `.tex`, `.bibtex` file extensions in drag-and-drop zone and input.
- Displays format badges (CSV, BIB, TEX) next to each loaded file with row count and file size.
- Updates heading to "1. Importar Bases Bibliográficas (.csv, .bib, .tex)".

### 3.2 Workspace Integration (`src/hooks/useReferenceWorkspace.ts`)
- Automatically inspects file extensions:
  - `.csv` $\rightarrow$ PapaParse streaming parser.
  - `.bib`, `.bibtex` $\rightarrow$ `bibtexParser`.
  - `.tex` $\rightarrow$ `texParser`.
- Merges all extracted columns into global `headers`.
- Automated schema detection (`detection.ts`) seamlessly maps `title`, `author`, `year`, `doi`, `abstract` from BibTeX keys.

### 3.3 Export Actions
- **Exportar CSV**: Sanitized tabular export with CWE-1236 protection.
- **Exportar BibTeX (.bib)**: Downloads `referencias_unicas_padronizadas.bib` formatted for Overleaf, LaTeX, and Zotero.

### 3.4 Floating Context Window Guidance (`src/components/dashboard/LLMBatchSection.tsx`)
- Upon batch generation, renders an interactive floating guidance card / dismissible alert:
  - **Title**: Recomendação de Janela de Contexto para LLMs
  - **Key Advice**: Para garantir máxima precisão analítica e evitar a degradação de atenção (*prompt drift* / saturação de contexto), utilize uma nova conversa (novo chat) para cada lote de referências.
  - **Copy Action**: One-click system prompt copy for screening inclusion/exclusion criteria in new chats.

---

## 4. Release, Documentation & CI/CD

1. **Version Bump**: Increment version to `1.1.0` in `package.json`, `package-lock.json`, and `src-tauri/Cargo.toml` / `tauri.conf.json`.
2. **`CHANGELOG.md`**: Structured according to *Keep a Changelog* (v1.1.0, v1.0.0).
3. **`README.md`**: Professional, senior-engineer documentation without emojis detailing:
   - BibTeX and LaTeX input support.
   - Parsing engine and diacritic unescaping specifications.
   - BibTeX export functionality.
   - LLM batch processing with context window considerations.
   - Direct download links for desktop `v1.1.0`.
4. **Git Tag & Release**: Tag `v1.1.0`, trigger GitHub Actions native desktop build (`.exe` and `.msi`), and verify public release.
