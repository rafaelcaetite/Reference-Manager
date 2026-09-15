export type ReferenceRawRow = Record<string, unknown>;

export interface ColumnMapping {
  titleColumn: string;
  yearColumn: string;
  authorsColumn: string;
  doiColumn: string;
  abstractColumn: string;
}

export interface ReferenceItem {
  id: string;
  originalRow: ReferenceRawRow;
  title: string;
  normalizedTitle: string;
  year: string;
  cleanYear: string;
  authors: string;
  doi: string;
  completenessScore: number;
  articleType: string;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  similarityToParent: number;
  isPivot: boolean;
  keep: boolean;
  sourceFile?: string;
}

export interface DuplicateGroup {
  id: string;
  pivot: ReferenceItem;
  duplicates: ReferenceItem[];
}

export interface DeduplicateOptions {
  threshold: number;
  matchDoi: boolean;
  parentRule: "first" | "completeness";
  columnMapping: ColumnMapping;
}

export interface DeduplicationResult {
  items: ReferenceItem[];
  groups: DuplicateGroup[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  rowCount: number;
  headers: string[];
  rows: ReferenceRawRow[];
  format?: "csv" | "bib" | "tex";
}

export interface NotificationItem {
  id: string;
  type: "success" | "warning" | "error";
  message: string;
}
