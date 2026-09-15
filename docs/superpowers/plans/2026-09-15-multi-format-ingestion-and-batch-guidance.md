# Multi-Format Reference Ingestion, BibTeX Export & LLM Context Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Reference Manager to ingest `.bib` and `.tex` files with automated parsing and zero data loss, export deduplicated collections to standardized `.bib`, provide floating LLM context window guidance on batch exports, and publish release `v1.1.0`.

**Architecture:** Domain parsers (`latexUnescape.ts`, `bibtexParser.ts`, `texParser.ts`, `bibtexExporter.ts`) in `src/core/` plugged into `useReferenceWorkspace.ts`, with modular UI components in `src/components/` and automated tests in `tests/`.

**Tech Stack:** TypeScript (strict mode), React 19, Vite, Vitest, Tailwind CSS, Tauri v2.

## Global Constraints
- Zero external npm dependencies added: keep bundle ultra-lightweight and 100% browser/worker-safe.
- Zero data loss: every parsed field, entry type, citation key, and raw citation must be preserved as attributes in the raw records.
- Strict TypeScript: `npm run lint` (`tsc --noEmit`) must pass with zero errors.
- Vitest suite must pass 100% of tests.
- Documentation and commit messages must strictly avoid emojis.

---

### Task 1: LaTeX Unescaper & BibTeX Parser
**Files:**
- Create: `src/core/latexUnescape.ts`
- Create: `src/core/bibtexParser.ts`
- Test: `tests/bibtexParser.test.ts`

- [ ] **Step 1: Write failing tests in `tests/bibtexParser.test.ts`**
  - Test LaTeX diacritic unescaping (`\"a` $\rightarrow$ `ä`, `\'e` $\rightarrow$ `é`, `\c{c}` $\rightarrow$ `ç`, `\~{a}` $\rightarrow$ `ã`, etc.).
  - Test LaTeX special symbol unescaping (`\&`, `\%`, `\$`, `\_`, `\#`, `--` $\rightarrow$ `–`, `---` $\rightarrow$ `—`).
  - Test BibTeX parsing with nested braces (`author = {{National Institute of Standards}}`).
  - Test multi-field extraction (`title`, `author`, `year`, `journal`, `doi`, `abstract`, `keywords`, custom fields).
  - Test entry type and citation key retention.
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `src/core/latexUnescape.ts` and `src/core/bibtexParser.ts`**
- [ ] **Step 4: Run test to verify all tests pass**
- [ ] **Step 5: Commit changes**

---

### Task 2: TeX Parser & BibTeX Serializer / Exporter
**Files:**
- Create: `src/core/texParser.ts`
- Create: `src/core/bibtexExporter.ts`
- Test: `tests/texParserAndExporter.test.ts`

- [ ] **Step 1: Write failing tests in `tests/texParserAndExporter.test.ts`**
  - Test TeX parser with embedded BibTeX `@article{...}`.
  - Test TeX parser with `\begin{thebibliography}` and `\bibitem`.
  - Test metadata extraction (author, title, year, doi) and `raw_citation` field preservation.
  - Test BibTeX exporter (`exportToBibtex`) generating valid BibTeX syntax with proper citation keys.
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `src/core/texParser.ts` and `src/core/bibtexExporter.ts`**
- [ ] **Step 4: Run test to verify all tests pass**
- [ ] **Step 5: Commit changes**

---

### Task 3: Workspace Integration, File Ingestion UI & LLM Context Guidance
**Files:**
- Modify: `src/hooks/useReferenceWorkspace.ts`
- Modify: `src/components/sidebar/FileUploaderCard.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/dashboard/LLMBatchSection.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `useReferenceWorkspace.ts` to dispatch file parsing based on extension (`.csv`, `.bib`, `.bibtex`, `.tex`)**
- [ ] **Step 2: Update `FileUploaderCard.tsx` with `.csv, .bib, .tex, .bibtex` accept attribute and format badges (CSV, BIB, TEX)**
- [ ] **Step 3: Add "Exportar BibTeX (.bib)" button in `Header.tsx`**
- [ ] **Step 4: Add floating contextual guidance card in `LLMBatchSection.tsx` explaining context window limits and recommending a new chat for each batch**
- [ ] **Step 5: Verify integration with TypeScript build (`npm run lint`)**
- [ ] **Step 6: Commit changes**

---

### Task 4: Release v1.1.0, Changelog, Technical Documentation & Deployment
**Files:**
- Modify: `package.json` & `package-lock.json`
- Modify: `src-tauri/Cargo.toml` & `src-tauri/tauri.conf.json`
- Create: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Bump project versions to `1.1.0`**
- [ ] **Step 2: Write `CHANGELOG.md` following Keep a Changelog format**
- [ ] **Step 3: Update `README.md` with multi-format architecture, parser specifications, context window tips, and v1.1.0 download links**
- [ ] **Step 4: Verify test suite and production build**
- [ ] **Step 5: Commit, create git tag `v1.1.0`, push to GitHub, and verify desktop compilation on GitHub Actions**
