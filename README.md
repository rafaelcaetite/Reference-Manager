# Reference Manager

> **Live Web Application**: [rafaelcaetite.github.io/Reference-Manager](https://rafaelcaetite.github.io/Reference-Manager/)  
> **Windows Desktop Installer**: Download the latest `.exe` or `.msi` package from [GitHub Releases](https://github.com/rafaelcaetite/Reference-Manager/releases/latest)

Reference Manager is a client-side bibliographic deduplication, normalization, and dataset sanitization application built with React, TypeScript, and Vite. It is designed for researchers conducting systematic literature reviews who must aggregate, clean, and reconcile reference exports from multiple scientific databases, such as Scopus, Web of Science, PubMed, IEEE Xplore, and ACM Digital Library.

All data processing is executed entirely within the user's browser or desktop environment via dedicated Web Workers. No references or bibliographic records are ever transmitted to external servers.

---

## Distribution & Execution Options

Reference Manager offers four accessible execution modes depending on user requirements:

1. **Zero-Install Web Application**: Access directly at [rafaelcaetite.github.io/Reference-Manager](https://rafaelcaetite.github.io/Reference-Manager/). Runs locally in modern web browsers without server transmission.
2. **Native Windows Desktop App (Tauri v2)**: Download the standalone installer (`Reference-Manager_1.0.0_x64-setup.exe`) or Windows package (`Reference-Manager_1.0.0_x64_en-US.msi`) from [Releases](https://github.com/rafaelcaetite/Reference-Manager/releases/latest). Provides native OS window integration, low resource usage, and offline capability.
3. **One-Click Portable Script (`Reference-Manager.bat`)**: Double-click `Reference-Manager.bat` from the repository root to launch the interface directly into a dedicated application window via Microsoft Edge or Google Chrome `--app` mode without terminal commands.
4. **Progressive Web App (PWA)**: Open the web application and click the install icon in your browser's address bar to install Reference Manager as a standalone desktop app.

---

## Key Capabilities

- **Multi-Source CSV Aggregation**: Ingests multiple CSV exports simultaneously, preserving 100% of the original metadata columns while tagging records by source file.
- **Automated Schema Detection**: Uses heuristic pattern matching with UTF-8 Byte Order Mark (BOM) stripping to resolve title, year, author, DOI, and abstract columns across English and Portuguese naming conventions.
- **Multi-Tier Deduplication Pipeline**:
  - Exact match resolution via $O(1)$ hash indices on digital object identifiers (DOIs) and normalized titles.
  - Mathematical length-bound pruning to eliminate redundant string distance computations.
  - Fuzzy string alignment using Gestalt Pattern Matching (Ratcliff-Obershelp) with inverted-index substring lookups matching Python's `difflib.SequenceMatcher.ratio()`.
- **Survivor Election Policies**:
  - **Metadata Completeness**: Automatically identifies and retains the record with the most populated metadata fields, prioritizing abstracts (+10 weight) and keywords (+5 weight).
  - **Chronological First**: Preserves the first encountered instance according to the original file intake order.
- **Interactive Cluster Resolution**: Visual side-by-side inspection of duplicate groups with dynamic pivot reassignment and manual keep/discard overrides resolved in memory without background worker re-runs.
- **Temporal Analysis**: Interactive histogram and numeric year-range filters allowing instant slicing across publication timelines.
- **CSV Formula Injection Defense (CWE-1236)**: Sanitizes all exported fields by prefixing spreadsheet trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) to mitigate code execution vulnerabilities in Microsoft Excel and LibreOffice Calc.
- **LLM Text Batch Packaging**: Generates structured, partitioned `.txt` files packaged in a compressed `.zip` archive configured by article count or batch size for prompt-based screening.

---

## System Architecture

The application is structured into decoupled domain, infrastructure, and presentation layers following Clean Architecture principles:

```
src/
├── types/
│   └── index.ts                 # Strongly typed domain entities and DTOs
├── core/
│   ├── normalization.ts         # Unicode-safe text folding and year extraction
│   ├── similarity.ts            # Ratcliff-Obershelp algorithm with inverted index
│   ├── detection.ts             # BOM-safe header discovery and article classification
│   ├── completeness.ts          # Metadata richness scoring service
│   ├── deduplicator.ts          # Tiered clustering engine and survivor election
│   └── exportService.ts         # CWE-1236 sanitization, CSV and ZIP generation
├── hooks/
│   ├── useToast.ts              # Notification lifecycle management
│   ├── useReferenceWorkspace.ts  # File parsing and dataset state management
│   ├── useDeduplication.ts      # Web Worker execution, debouncing, and error recovery
│   ├── useClusterManager.ts     # In-memory manual override resolution
│   ├── useReferenceFilters.ts   # Multi-criteria filtering and temporal counts
│   └── usePagination.ts         # Generalized pagination hook
├── components/
│   ├── Header.tsx               # Application header and workspace actions
│   ├── ToastContainer.tsx       # Accessible notification queue
│   ├── YearHistogram.tsx        # Temporal distribution chart
│   ├── sidebar/
│   │   ├── FileUploaderCard.tsx # Dropzone, file registry, and sample loaders
│   │   ├── ColumnMappingCard.tsx# Schema inspection and manual overrides
│   │   ├── SettingsCard.tsx     # Similarity thresholds and survivor policies
│   │   └── TemporalFilterCard.tsx# Year range and histogram container
│   └── dashboard/
│       ├── StatsBar.tsx         # Metric counters and tab navigation
│       ├── SearchBar.tsx        # Search bar with active filter status
│       ├── CleanedTable.tsx     # Cleaned reference records table
│       ├── DuplicateGroupsView.tsx# Cluster cards with similarity ordering
│       ├── AllRecordsTable.tsx  # Master inventory with manual state toggles
│       ├── LLMBatchSection.tsx  # Text partition configuration and ZIP export
│       └── EmptyState.tsx       # Ingestion guidance and sample datasets
├── deduplicator.worker.ts       # Headless Web Worker runner
└── App.tsx                      # Root layout orchestrator
```

---

## Algorithm Specifications

### 1. Title Normalization

Prior to similarity computation, titles undergo uniform normalization:
1. **Case Folding & Trimming**: Convert to lowercase and strip boundary whitespace.
2. **Diacritical Stripping**: Unicode normalization form canonical decomposition (`NFD`) removes combining diacritical marks (e.g., `à` becomes `a`, `ç` becomes `c`).
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

### 4. Metadata Completeness Scoring

When `parentRule` is set to `completeness`, duplicate cluster survivors are determined by evaluating non-empty fields in the source row:

$$\text{Score} = \sum_{k \in \text{Fields}} \mathbb{I}(k \neq \emptyset) + 10 \cdot \mathbb{I}(\text{isAbstract}(k)) + 5 \cdot \mathbb{I}(\text{isKeywords}(k))$$

The item with the highest score is elected cluster pivot, ensuring abstracts and keyword taxonomies are preserved.

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

### Running Tests

Execute the automated test suite powered by Vitest:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Type Checking & Production Build

Verify TypeScript compilation without emitting files:

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
Drag and drop one or more `.csv` files into the upload dropzone, or use the sample buttons (ACM, IEEE, Scopus) to load test datasets. Files are parsed asynchronously using PapaParse.

### 2. Reviewing Column Mappings
Expand the "Mapeamento de Colunas" card in the control sidebar. Verify that Title, Year, Authors, DOI, and Abstract columns are mapped correctly. Adjust dropdown selections if your CSV headers use custom nomenclature.

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
- Click **Exportar Únicas** to download a sanitized CSV file containing all preserved references with their original metadata columns intact.
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
