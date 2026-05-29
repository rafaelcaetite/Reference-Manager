/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReferenceRawRow {
  [key: string]: any;
}

export interface ColumnMapping {
  titleColumn: string;
  yearColumn: string;
  authorsColumn: string;
  doiColumn: string;
  abstractColumn: string;
}

export interface ReferenceItem {
  id: string; // Unique ID (usually index-based)
  originalRow: ReferenceRawRow; // Unaltered original row to preserve metadata
  title: string; // Extracted raw title
  normalizedTitle: string; // Standardized normalized title
  year: string; // Extracted raw publication year
  authors: string; // Extracted author info
  doi: string; // Extracted DOI
  
  // Deduplication state
  isDuplicate: boolean;
  duplicateOfId: string | null; // ID of the pivot/survivor item in the group
  similarityToParent: number; // 0.0 - 1.0 (similarity with the duplicateOf item)
  isPivot: boolean; // Indicates if this item is the chosen "survivor"
  
  // Selection state
  keep: boolean; // Whether the user chose to keep this item in the final clean set
  
  // File source tracking
  sourceFile?: string; // Highlighting which uploaded file/database this record originated from
}

export interface DuplicateGroup {
  id: string; // Usually ID of the pivot
  pivot: ReferenceItem;
  duplicates: ReferenceItem[];
}
