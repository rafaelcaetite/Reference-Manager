# Reference Manager

> **Live Web Application**: [rafaelcaetite.github.io/Reference-Manager](https://rafaelcaetite.github.io/Reference-Manager/)  
> **Windows Desktop Installer (v1.1.0)**: Download the standalone installer (`.exe`) or MSI package from [GitHub Releases](https://github.com/rafaelcaetite/Reference-Manager/releases/latest)

Reference Manager is an open-source, client-side bibliographic deduplication, normalization, and dataset sanitization engine built with React 19, TypeScript, and Vite. Designed specifically for researchers conducting systematic literature reviews (SLRs) and meta-analyses, it aggregates, reconciles, and cleans reference exports from multiple scientific indexing platforms, including Scopus, Web of Science, PubMed, IEEE Xplore, and ACM Digital Library.

All data parsing, clustering, and normalization routines are executed entirely within the user's browser or desktop runtime using dedicated Web Workers. No references, abstracts, or metadata fields are ever transmitted to external servers.

---

## Distribution & Execution Options

Reference Manager provides four distribution models to suit different operating environments:

1. **Zero-Install Web Application (Recommended)**: Access directly at [rafaelcaetite.github.io/Reference-Manager](https://rafaelcaetite.github.io/Reference-Manager/). Runs locally in modern web browsers with full Web Worker isolation and client-side processing.
2. **Native Windows Desktop App (Tauri v2)**: Download the standalone installer (`Reference-Manager_1.1.0_x64-setup.exe`) or Windows package (`Reference-Manager_1.1.0_x64_en-US.msi`) from [GitHub Releases](https://github.com/rafaelcaetite/Reference-Manager/releases/latest). Features minimal memory consumption (Rust backend + WebView2) and complete offline operation.
3. **One-Click Portable Script (`Reference-Manager.bat`)**: Execute `Reference-Manager.bat` from the repository root to launch the application in a borderless window via Microsoft Edge or Google Chrome `--app` mode without terminal commands or Node.js runtime dependencies.
4. **Progressive Web App (PWA)**: Install directly from your browser's address bar to run Reference Manager as a standalone desktop utility with full offline asset caching.

---

## Key Capabilities

- **Multi-Format Reference Ingestion**: Ingests tabular CSV files (`.csv`), BibTeX files (`.bib`, `.bibtex`), and LaTeX manuscript source files (`.tex`) simultaneously.
- **Zero Information Loss Architecture**: Preserves 100% of the original metadata columns, custom tags, and citation keys across all ingested files while tagging records by source dataset.
- **LaTeX Character & Diacritic Decoding**: Native unescaper translates standard TeX diacritical marks (`\"a` to `ä`, `\'e` to `é`, `\c{c}` to `ç`, `\~{a}` to `ã`, etc.), formatting commands, and special symbols into standard UTF-8 characters.
- **Dual-Mode TeX Parser**: Automatically extracts citations from embedded BibTeX definitions or from `\begin{thebibliography}` environments with `\bibitem` entries, retaining the complete original text in `raw_citation`.
- **Automated Schema Discovery**: Heuristic header detector with UTF-8 Byte Order Mark (BOM) stripping matches title, year, author, DOI, and abstract attributes across English and Portuguese naming standards.
- **Multi-Tier Deduplication Engine**:
  - $O(1)$ exact match resolution on normalized Digital Object Identifiers (DOIs) and normalized titles.
  - Mathematical length-bound pruning to eliminate redundant string distance calculations.
  - Fuzzy string alignment using Gestalt Pattern Matching (Ratcliff-Obershelp) with inverted-index substring lookups matching Python's `difflib.SequenceMatcher.ratio()`.
- **Survivor Election Policies**:
  - **Metadata Completeness**: Retains the candidate with the highest completeness score, weighting abstracts (+10 points) and keywords (+5 points).
  - **Chronological First**: Preserves the first encountered instance according to intake sequence.
- **Bidirectional Export**:
  - **Sanitized CSV**: Export deduplicated references with spreadsheet formula injection protection (CWE-1236).
  - **Standardized BibTeX (.bib)**: Export clean, normalized `.bib` entries with generated `AuthorYearTitle` citation keys ready for Overleaf, LaTeX, and Zotero.
- **LLM Text Batch Packaging & Context Window Guidance**: Generates structured, partitioned `.txt` files packaged in a compressed `.zip` archive for prompt-based screening, accompanied by actionable guidelines on context window management.

---

## System Architecture

The codebase adheres strictly to Clean Architecture principles, decoupling domain parsing algorithms from UI state and Web Worker lifecycle:

```
src/
├── types/
│   └── index.ts                 # Strongly typed domain entities, DTOs, and schemas
├── core/
│   ├── normalization.ts         # Unicode-safe text folding and year extraction
│   ├── similarity.ts            # Ratcliff-Obershelp algorithm with inverted index
│   ├── detection.ts             # BOM-safe header discovery and article classification
│   ├── completeness.ts          # Metadata richness scoring service
│   ├── deduplicator.ts          # Tiered clustering engine and survivor election
│   ├── latexUnescape.ts         # LaTeX diacritics, symbols, and formatting decoder
│   ├── bibtexParser.ts          # Zero-dependency recursive-descent BibTeX tokenizer
│   ├── texParser.ts             # Dual-mode TeX extractor (BibTeX & thebibliography)
│   ├── bibtexExporter.ts        # Standardized BibTeX serializer with key resolution
│   └── exportService.ts         # CWE-1236 sanitization, CSV and ZIP generation
├── hooks/
│   ├── useToast.ts              # Notification lifecycle management
│   ├── useReferenceWorkspace.ts # Multi-format file ingestion and schema aggregation
│   ├── useDeduplication.ts      # Web Worker execution, debouncing, and error recovery
│   ├── useClusterManager.ts     # In-memory manual override resolution (<2ms)
│   ├── useReferenceFilters.ts   # Multi-criteria filtering and temporal counts
│   └── usePagination.ts         # Generalized pagination hook
├── components/
│   ├── Header.tsx               # Application header and workspace actions
│   ├── ToastContainer.tsx       # Accessible notification queue
│   ├── YearHistogram.tsx        # Temporal distribution chart
│   ├── sidebar/
│   │   ├── FileUploaderCard.tsx # Multi-format dropzone, format badges, file registry
│   │   ├── ColumnMappingCard.tsx# Schema inspection and manual overrides
│   │   ├── SettingsCard.tsx     # Similarity thresholds and survivor policies
│   │   └── TemporalFilterCard.tsx# Year range and histogram container
│   └── dashboard/
│       ├── StatsBar.tsx         # Metric counters, tab navigation, CSV & .bib export
│       ├── SearchBar.tsx        # Search input with active filter status
│       ├── CleanedTable.tsx     # Cleaned reference records table
│       ├── DuplicateGroupsView.tsx# Cluster cards with similarity ordering
│       ├── AllRecordsTable.tsx  # Master inventory with manual keep toggles
│       ├── LLMBatchSection.tsx  # Text partition configuration and context tip modal
│       └── EmptyState.tsx       # Ingestion guidance and sample datasets
├── deduplicator.worker.ts       # Headless Web Worker runner
└── App.tsx                      # Root layout orchestrator
```

---

## Algorithm Specifications

### 1. Title Normalization

Prior to similarity computation, titles undergo uniform normalization:
1. **Case Folding & Boundary Trimming**: Convert characters to lowercase and strip boundary whitespace.
2. **Diacritical Mark Stripping**: Unicode normalization form canonical decomposition (`NFD`) removes combining diacritical marks (e.g., `à` becomes `a`, `ç` becomes `c`).
3. **Unicode Alphanumeric Preservation**: Removes punctuation while preserving Unicode letters (`\p{L}`) and numbers (`\p{N}`), maintaining non-Latin scripts (e.g., Greek symbols $\alpha, \beta, \gamma$, Cyrillic, CJK).
4. **Whitespace Collapsing**: Multiple consecutive whitespace characters are collapsed into a single ASCII space.

### 2. Gestalt Pattern Matching (Ratcliff-Obershelp)

Fuzzy matching calculates the similarity between two normalized strings $A$ and $B$:

$$\text{Similarity}(A, B) = \frac{2 \cdot |M|}{|A| + |B|}$$

Where $|M|$ is the sum of characters in all non-overlapping matching blocks.

Unlike brute-force $O(L^3)$ implementations, Reference Manager builds an inverted index over string $B$ mapping each character to its occurrences. Longest common substrings are identified in $O(L)$ average time, identical to Python's standard library `difflib.SequenceMatcher.ratio()`.

### 3. Length-Bound Pruning

To bypass expensive string distance checks across dissimilar entries, the maximum theoretical ratio between two strings of lengths $L_A$ and $L_B$ is evaluated:

$$\text{MaxRatio}(A, B) = \frac{2 \cdot \min(L_A, L_B)}{L_A + L_B}$$

If $\text{MaxRatio}(A, B) < \tau$ (where $\tau$ is the user-configured similarity threshold), the pair is skipped immediately without invoking substring search.

### 4. BibTeX Tokenization & LaTeX Decoding

The native BibTeX tokenizer operates without external dependencies using recursive-descent token scanning:
- Tracks brace nesting levels `{...}` and quote delimiters `"..."` to parse multiline field values.
- Resolves string concatenations (`#`), unquoted numeric tokens, and `@string` macros.
- Sanitizes LaTeX escapes via `latexUnescape`:
  - Diacritics: `\"a` / `\"{a}` $\rightarrow$ `ä`, `\'e` / `\'{e}` $\rightarrow$ `é`, `\c{c}` $\rightarrow$ `ç`, `\~{a}` $\rightarrow$ `ã`, `\^{o}` $\rightarrow$ `ô`, etc.
  - Symbols: `\&` $\rightarrow$ `&`, `\%` $\rightarrow$ `%`, `\$` $\rightarrow$ `$`, `\_` $\rightarrow$ `_`, `\#` $\rightarrow$ `#`, `\textendash`/`--` $\rightarrow$ `–`.
  - Strips protective title braces (e.g., `{DNA}` $\rightarrow$ `DNA`) without altering semantic casing.
- Preserves every non-standard or custom field in the output record with zero data loss.

### 5. Metadata Completeness Scoring

When `parentRule` is set to `completeness`, duplicate cluster survivors are determined by evaluating non-empty fields in the source row:

$$\text{Score} = \sum_{k \in \text{Fields}} \mathbb{I}(k \neq \emptyset) + 10 \cdot \mathbb{I}(\text{isAbstract}(k)) + 5 \cdot \mathbb{I}(\text{isKeywords}(k))$$

The candidate with the highest score is elected cluster pivot, ensuring abstracts and keyword taxonomies are preserved.

---

## LLM Screening & Context Window Best Practices

When preparing reference batches for Large Language Models (e.g., ChatGPT, Claude, Gemini, DeepSeek) for title and abstract screening:

1. **Context Window Saturation**: While modern LLMs support large nominal context windows (128k+ tokens), long-context attention degradation (commonly known as the *Lost in the Middle* phenomenon) systematically reduces screening accuracy as prompt history accumulates.
2. **Prompt Drift Mitigation**: When screening tens or hundreds of papers in a single continuous conversation, the model's adherence to nuanced inclusion and exclusion criteria degrades over time.
3. **Recommended Workflow**:
   - Partition references into manageable batches (e.g., 10 to 25 articles per batch).
   - Initiate a **clean conversation (new chat)** for each batch file.
   - Supply the standardized inclusion/exclusion criteria prompt at the start of each session.

Reference Manager includes a one-click prompt copy utility in the batch generation panel with a standardized screening prompt template.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) version 18.0 or later
- [npm](https://www.npmjs.com/) version 9.0 or later

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/rafaelcaetite/reference-manager.git
cd reference-manager
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Running Automated Tests

Execute the Vitest test suite covering core deduplication, BibTeX parsing, TeX extraction, and CSV formula sanitization:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Type Checking & Production Build

Verify TypeScript compilation under strict mode:

```bash
npm run lint
```

Generate an optimized production build in the `dist/` directory:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Step-by-Step Usage Guide

### 1. Ingesting Bibliographic Files
Drag and drop one or more `.csv`, `.bib`, or `.tex` files into the upload dropzone, or use the sample buttons (ACM, IEEE, Scopus) to load test datasets. Files are parsed asynchronously, tagged with format badges (CSV, BIB, TEX), and indexed.

### 2. Reviewing Column Mappings
Expand the "Mapeamento de Colunas" card in the control sidebar. Verify that Title, Year, Authors, DOI, and Abstract columns are mapped correctly. Adjust dropdown selections if custom headers are detected.

### 3. Adjusting Deduplication Parameters
- **Limite de Similaridade**: Configure the similarity threshold from 50% to 100% (default: 95%).
- **Mesclar por DOI Idêntico**: When checked, exact DOI matches are treated as absolute duplicates regardless of title divergence.
- **Registro Sobrevivente**: Choose between "Metadados Completos" (retains the record with the most metadata) or "Ordem de Aparição" (retains the first occurrence).

### 4. Reviewing Clusters and Manual Overrides
Navigate between the tabs:
- **Únicas**: Displays the finalized list of unique records.
- **Duplicatas**: Inspect grouped clusters. Reassign the representative survivor by clicking "Tornar Representante", or toggle the discard/preserve status for specific records.
- **Todos**: Search across all imported records with individual keep/discard actions.

### 5. Exporting Results
- Click **Exportar CSV** to download a sanitized CSV file containing all preserved references with their original metadata columns intact.
- Click **Exportar .bib** to download a standardized BibTeX file with resolved citation keys.
- Use the **Preparar Lotes de Texto para LLM** panel to configure and download a `.zip` archive of text files formatted for prompt ingestion.

---

## Security

### CSV Formula Injection Protection (CWE-1236)
When users export CSV files that originated from untrusted sources, malicious cell values can trigger formula execution (DDE) in spreadsheet software. Reference Manager inspects all exported fields and prepends a single quotation mark (`'`) to any string starting with `=`, `+`, `-`, `@`, tab (`\t`), or carriage return (`\r`), neutralizing formula execution.

### Memory Lifecycle Management
To prevent memory leaks when processing large exports, all temporary object URLs created via `URL.createObjectURL` are automatically revoked via `URL.revokeObjectURL` following browser download initiation.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
